import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Inject, Optional } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';

interface RegisterDto {
  email: string;
  username: string;
  displayName: string;
  password: string;
  country: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
}

interface LoginDto {
  email: string;
  password: string;
}

@Injectable()
export class AuthService {
  private readonly refreshSecret: string;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
    @Optional() @Inject(CACHE_MANAGER) private readonly cache?: Cache,
  ) {
    this.refreshSecret = this.config.get('JWT_SECRET', 'dev-secret') + '-refresh';
  }

  async register(dto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) throw new ConflictException('Email already registered');

    const existingUsername = await this.usersService.findByUsername(dto.username);
    if (existingUsername) throw new ConflictException('Username already taken');

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const user = await this.usersService.create({ ...dto, password: hashedPassword });

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    await this.usersService.setEmailVerificationToken(user.id, verificationToken);

    // Send verification email
    this.emailService.sendVerificationEmail(user.email, verificationToken, dto.displayName).catch(() => {});

    const tokens = await this.generateTokens(user.id, user.email, user.country);
    return { user: { id: user.id, email: user.email, username: user.username, country: user.country, verificationToken }, ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.generateTokens(user.id, user.email, user.country);
    return { user: { id: user.id, email: user.email, username: user.username, country: user.country }, ...tokens };
  }

  async refreshToken(refreshToken: string) {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken, { secret: this.refreshSecret });

      // Check if token is blacklisted
      if (this.cache) {
        const blacklisted = await this.cache.get(`bl:${refreshToken}`);
        if (blacklisted) throw new UnauthorizedException('Token revoked');
      }

      // Check if user's all tokens are invalidated
      if (this.cache) {
        const invalidatedAt = await this.cache.get<number>(`inv:${payload.sub}`);
        if (invalidatedAt && payload.iat * 1000 < invalidatedAt) {
          throw new UnauthorizedException('All sessions revoked');
        }
      }

      // Issue new access token
      const accessToken = this.generateAccessToken(payload.sub, payload.email, payload.country);
      return { token: accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(refreshToken: string) {
    if (!refreshToken) return { message: 'Logged out' };

    // Blacklist the refresh token in Redis (expires when token would expire)
    if (this.cache) {
      await this.cache.set(`bl:${refreshToken}`, '1', 7 * 24 * 60 * 60 * 1000); // 7 days
    }

    return { message: 'Logged out successfully' };
  }

  async logoutAllDevices(userId: string) {
    // Store timestamp — any refresh token issued before this is invalid
    if (this.cache) {
      await this.cache.set(`inv:${userId}`, Date.now(), 7 * 24 * 60 * 60 * 1000);
    }
    return { message: 'All sessions revoked' };
  }

  async oauthLogin(provider: string, token: string, country?: string) {
    const profile = await this.verifyOAuthToken(provider, token);
    if (!profile) throw new UnauthorizedException('Invalid OAuth token');

    let user = await this.usersService.findByEmail(profile.email);
    if (!user) {
      const username = profile.email.split('@')[0] + '_' + Math.random().toString(36).substring(2, 6);
      user = await this.usersService.create({
        email: profile.email,
        username,
        displayName: profile.name || username,
        password: '',
        country: country || 'NG',
      });
    }

    const tokens = await this.generateTokens(user.id, user.email, user.country);
    return { user: { id: user.id, email: user.email, username: user.username, country: user.country }, ...tokens };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) return { message: 'If that email exists, a reset link has been sent' };

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000);
    await this.usersService.setPasswordResetToken(user.id, resetToken, resetExpires);

    // Send password reset email
    this.emailService.sendPasswordResetEmail(email, resetToken).catch(() => {});

    return { message: 'If that email exists, a reset link has been sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.usersService.findByResetToken(token);
    if (!user) throw new BadRequestException('Invalid or expired reset token');
    if (user.passwordResetExpires < new Date()) throw new BadRequestException('Reset token has expired');

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await this.usersService.updatePassword(user.id, hashedPassword);

    // Invalidate all existing sessions after password reset
    await this.logoutAllDevices(user.id);

    return { message: 'Password reset successful. You can now login.' };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    // Get user with password field
    const userWithPass = await this.usersService.findByEmailWithPassword(user.email);
    if (!userWithPass || !userWithPass.password) throw new BadRequestException('Cannot change password for OAuth accounts');

    const isValid = await bcrypt.compare(currentPassword, userWithPass.password);
    if (!isValid) throw new UnauthorizedException('Current password is incorrect');

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await this.usersService.updatePassword(userId, hashedPassword);

    // Invalidate all other sessions
    await this.logoutAllDevices(userId);

    return { message: 'Password changed successfully. Please log in again.' };
  }

  async verifyEmail(token: string) {
    const user = await this.usersService.findByEmailVerificationToken(token);
    if (!user) throw new BadRequestException('Invalid verification token');

    await this.usersService.verifyEmail(user.id);
    return { message: 'Email verified successfully' };
  }

  async resendVerification(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');
    if (user.isEmailVerified) return { message: 'Email already verified' };

    const verificationToken = crypto.randomBytes(32).toString('hex');
    await this.usersService.setEmailVerificationToken(userId, verificationToken);

    // Resend verification email
    this.emailService.sendVerificationEmail(user.email, verificationToken, user.displayName).catch(() => {});

    return { message: 'Verification email sent', verificationToken };
  }

  private async generateTokens(userId: string, email: string, country: string) {
    const accessToken = this.generateAccessToken(userId, email, country);
    const refreshToken = this.jwtService.sign(
      { sub: userId, email, country },
      { secret: this.refreshSecret, expiresIn: '7d' },
    );
    return { token: accessToken, refreshToken };
  }

  private generateAccessToken(userId: string, email: string, country: string): string {
    return this.jwtService.sign({ sub: userId, email, country });
  }

  private async verifyOAuthToken(provider: string, token: string): Promise<{ email: string; name?: string } | null> {
    try {
      if (provider === 'google') {
        let res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
        let data = await res.json();
        if (data.email) return { email: data.email, name: data.name };

        res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${token}` },
        });
        data = await res.json();
        if (data.email) return { email: data.email, name: data.name };
      }
      if (provider === 'apple') {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        if (payload.email) return { email: payload.email, name: payload.name };
      }
    } catch {}
    return null;
  }
}
