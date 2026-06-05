import { Controller, Post, Body, UseGuards, Request, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { StrictThrottlerGuard } from '../../common/guards/throttle.guard';
import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsNumber } from 'class-validator';

class RegisterDto {
  @IsEmail() email: string;
  @IsString() @MinLength(3) @MaxLength(30) username: string;
  @IsString() @MinLength(2) displayName: string;
  @IsString() @MinLength(8) password: string;
  @IsString() @MaxLength(2) country: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
}

class LoginDto {
  @IsEmail() email: string;
  @IsString() password: string;
}

class OAuthDto {
  @IsString() provider: string;
  @IsString() token: string;
  @IsString() @IsOptional() country?: string;
}

class ForgotPasswordDto {
  @IsEmail() email: string;
}

class ResetPasswordDto {
  @IsString() token: string;
  @IsString() @MinLength(8) newPassword: string;
}

class RefreshDto {
  @IsString() refreshToken: string;
}

@Controller('auth')
@UseGuards(StrictThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(dto);
    this.setRefreshCookie(res, result.refreshToken);
    return { user: result.user, token: result.token, refreshToken: result.refreshToken };
  }

  @Post('login')
  @Throttle({ short: { ttl: 60000, limit: 10 } })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);
    this.setRefreshCookie(res, result.refreshToken);
    return { user: result.user, token: result.token, refreshToken: result.refreshToken };
  }

  @Post('oauth')
  @Throttle({ short: { ttl: 60000, limit: 10 } })
  async oauth(@Body() dto: OAuthDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.oauthLogin(dto.provider, dto.token, dto.country);
    this.setRefreshCookie(res, result.refreshToken);
    return { user: result.user, token: result.token, refreshToken: result.refreshToken };
  }

  @Post('refresh')
  @Throttle({ short: { ttl: 60000, limit: 30 } })
  async refresh(@Body() dto: RefreshDto, @Request() req: any) {
    // Try from body first, then from cookie
    const refreshToken = dto.refreshToken || req.cookies?.ra_refresh;
    if (!refreshToken) throw new Error('No refresh token');
    return this.authService.refreshToken(refreshToken);
  }

  @Post('logout')
  async logout(@Body() body: any, @Request() req: any, @Res({ passthrough: true }) res: Response) {
    const refreshToken = body.refreshToken || req.cookies?.ra_refresh;
    res.clearCookie('ra_refresh');
    return this.authService.logout(refreshToken);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('logout-all')
  async logoutAll(@Request() req: any, @Res({ passthrough: true }) res: Response) {
    res.clearCookie('ra_refresh');
    return this.authService.logoutAllDevices(req.user.id);
  }

  @Post('forgot-password')
  @Throttle({ short: { ttl: 60000, limit: 3 } })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  private setRefreshCookie(res: Response, refreshToken: string) {
    res.cookie('ra_refresh', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/v1/auth',
    });
  }
}
