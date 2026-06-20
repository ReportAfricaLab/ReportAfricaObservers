import { Controller, Get, Patch, Body, UseGuards, Inject, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { AdminGuard } from '../../common/guards/admin.guard';
import { createHmac } from 'crypto';
import { UserEntity } from '../../database/entities';

const CANARY_KEY = 'canary:state';
const DEFAULT_CANARY = {
  lastVerifiedSafe: new Date().toISOString(),
  message: 'ReportAfrica is operating freely and independently.',
};

@Controller('health')
export class HealthController {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly config: ConfigService,
    @Optional() @Inject(CACHE_MANAGER) private readonly cache?: Cache,
  ) {}

  @Get()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString(), service: 'reportafrica-api' };
  }

  @Get('ready')
  async readiness() {
    try {
      await this.userRepo.query('SELECT 1');
      return { status: 'ready', database: 'connected', timestamp: new Date().toISOString() };
    } catch {
      return { status: 'unhealthy', database: 'disconnected', timestamp: new Date().toISOString() };
    }
  }

  @Get('detailed')
  async detailed() {
    const uptime = process.uptime();
    const memory = process.memoryUsage();
    let dbStatus = 'connected';

    try {
      await this.userRepo.query('SELECT 1');
    } catch {
      dbStatus = 'disconnected';
    }

    return {
      status: dbStatus === 'connected' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      service: 'reportafrica-api',
      version: process.env.npm_package_version || '1.0.0',
      uptime: Math.floor(uptime),
      database: dbStatus,
      memory: {
        rss: Math.round(memory.rss / 1024 / 1024),
        heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
      },
      environment: process.env.NODE_ENV || 'development',
    };
  }

  @Get('canary')
  async getCanary() {
    let canaryState = DEFAULT_CANARY;
    if (this.cache) {
      const stored = await this.cache.get<typeof DEFAULT_CANARY>(CANARY_KEY);
      if (stored) canaryState = stored;
    }

    const secret = process.env.JWT_SECRET || 'dev-secret';
    const payload = `${canaryState.lastVerifiedSafe}|${canaryState.message}`;
    const signature = createHmac('sha256', secret).update(payload).digest('hex');
    const ageMs = Date.now() - new Date(canaryState.lastVerifiedSafe).getTime();
    const expired = ageMs > 7 * 24 * 60 * 60 * 1000;

    return {
      lastVerifiedSafe: canaryState.lastVerifiedSafe,
      message: canaryState.message,
      signature,
      expired,
      ageDays: Math.floor(ageMs / (24 * 60 * 60 * 1000)),
    };
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Patch('canary')
  async refreshCanary(@Body() body: { message?: string }) {
    const canaryState = {
      lastVerifiedSafe: new Date().toISOString(),
      message: body.message || 'ReportAfrica is operating freely and independently.',
    };
    if (this.cache) {
      await this.cache.set(CANARY_KEY, canaryState, 30 * 24 * 60 * 60 * 1000);
    }
    return { status: 'refreshed', ...canaryState };
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Patch('cloudflare/attack-mode')
  async toggleAttackMode(@Body() body: { enabled: boolean }) {
    const zoneId = this.config.get('CLOUDFLARE_ZONE_ID', '');
    const apiToken = this.config.get('CLOUDFLARE_API_TOKEN', '');
    if (!zoneId || !apiToken) return { error: 'Cloudflare not configured' };

    const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/settings/security_level`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: body.enabled ? 'under_attack' : 'medium' }),
    });
    const data = await res.json();
    return { attackMode: body.enabled, success: data.success };
  }

  @Get('cloudflare/status')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async getCloudflareStatus() {
    const zoneId = this.config.get('CLOUDFLARE_ZONE_ID', '');
    const apiToken = this.config.get('CLOUDFLARE_API_TOKEN', '');
    if (!zoneId || !apiToken) return { configured: false };

    const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/settings/security_level`, {
      headers: { Authorization: `Bearer ${apiToken}` },
    });
    const data = await res.json();
    return { configured: true, securityLevel: data.result?.value, attackMode: data.result?.value === 'under_attack' };
  }
}
