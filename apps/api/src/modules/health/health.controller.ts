import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../database/entities';

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
}
