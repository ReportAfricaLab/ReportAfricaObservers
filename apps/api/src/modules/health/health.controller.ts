import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../../common/guards/admin.guard';
import { createHmac } from 'crypto';
import { UserEntity } from '../../database/entities';

// Canary state — persisted in memory, refreshed by admin
let canaryState = {
  lastVerifiedSafe: new Date().toISOString(),
  message: 'ReportAfrica is operating freely and independently.',
};

@Controller('health')
export class HealthController {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
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
  getCanary() {
    const secret = process.env.JWT_SECRET || 'dev-secret';
    const payload = `${canaryState.lastVerifiedSafe}|${canaryState.message}`;
    const signature = createHmac('sha256', secret).update(payload).digest('hex');
    const ageMs = Date.now() - new Date(canaryState.lastVerifiedSafe).getTime();
    const expired = ageMs > 7 * 24 * 60 * 60 * 1000; // >7 days = expired

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
  refreshCanary(@Body() body: { message?: string }) {
    canaryState = {
      lastVerifiedSafe: new Date().toISOString(),
      message: body.message || 'ReportAfrica is operating freely and independently.',
    };
    return { status: 'refreshed', ...canaryState };
  }
}
