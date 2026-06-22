import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import * as helmet from 'helmet';
const cookieParser = require('cookie-parser');
import { DataSource } from 'typeorm';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { initSentry, SentryExceptionFilter } from './common/sentry';

async function bootstrap() {
  initSentry();

  const isProduction = process.env.NODE_ENV === 'production';

  const app = await NestFactory.create(AppModule, {
    logger: isProduction ? ['error', 'warn', 'log'] : ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Cookie parser (for httpOnly refresh token)
  app.use(cookieParser());

  // Security headers
  app.use(helmet.default({
    contentSecurityPolicy: false, // CSP handled by Vercel/Nginx for frontend
    crossOriginEmbedderPolicy: false,
    hsts: { maxAge: 31536000, includeSubDomains: true },
    frameguard: { action: 'deny' },
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }));

  app.setGlobalPrefix('api/v1');

  // CORS — strict in production, permissive in dev
  app.enableCors({
    origin: isProduction
      ? ['https://reportafrica.africa', /\.reportafrica\.africa$/, 'https://reportafrica.com', /\.reportafrica\.com$/, 'https://reportafrica-web.vercel.app', /\.vercel\.app$/, 'https://34-242-14-140.nip.io']
      : ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004'],
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 3600,
  });

  // Input validation & sanitization
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
    transformOptions: { enableImplicitConversion: true },
  }));

  // Body size limit (10MB for media metadata, actual uploads go to S3)
  const expressApp = app.getHttpAdapter().getInstance();
  const bodyParser = require('express').json;
  expressApp.use(bodyParser({ limit: '10mb' }));

  // Logging & error tracking
  app.useGlobalInterceptors(new LoggingInterceptor());
  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new SentryExceptionFilter(httpAdapterHost.httpAdapter));

  const port = process.env.PORT || 3001;
  const logger = new Logger('Bootstrap');

  // Redis adapter for Socket.IO (required for PM2 cluster mode)
  const redisHost = process.env.REDIS_HOST || 'localhost';
  const redisPort = Number(process.env.REDIS_PORT) || 6379;
  try {
    const pubClient = new Redis({ host: redisHost, port: redisPort });
    const subClient = pubClient.duplicate();
    const redisIoAdapter = new IoAdapter(app);
    (redisIoAdapter as any).createIOServer = function (port: number, options?: any) {
      const server = IoAdapter.prototype.createIOServer.call(this, port, options);
      server.adapter(createAdapter(pubClient, subClient));
      return server;
    };
    app.useWebSocketAdapter(redisIoAdapter);
    logger.log(`Socket.IO Redis adapter connected (${redisHost}:${redisPort})`);
  } catch (err) {
    logger.warn('Redis adapter setup failed: ' + (err as any).message);
  }

  await app.listen(port);

  logger.log(`ReportAfrica API running on port ${port} [${process.env.NODE_ENV || 'development'}]`);

  // Run pending migrations for columns that were added to entities but not synced in production
  if (isProduction) {
    try {
      const ds = app.get(DataSource);
      await ds.query(`
        ALTER TABLE livestreams ADD COLUMN IF NOT EXISTS thumbnail_url VARCHAR DEFAULT NULL;
        ALTER TABLE livestreams ADD COLUMN IF NOT EXISTS recording_url VARCHAR DEFAULT NULL;
        ALTER TABLE livestreams ADD COLUMN IF NOT EXISTS election_id VARCHAR DEFAULT NULL;
        ALTER TABLE livestreams ADD COLUMN IF NOT EXISTS election_name VARCHAR DEFAULT NULL;
        ALTER TABLE livestreams ADD COLUMN IF NOT EXISTS election_state VARCHAR DEFAULT NULL;
        ALTER TABLE livestreams ADD COLUMN IF NOT EXISTS election_polling_unit VARCHAR DEFAULT NULL;
        ALTER TABLE reports ALTER COLUMN author_id DROP NOT NULL;
        ALTER TABLE reports ADD COLUMN IF NOT EXISTS content_hash VARCHAR DEFAULT NULL;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR DEFAULT 'free';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expires TIMESTAMP DEFAULT NULL;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS is_certified BOOLEAN DEFAULT FALSE;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT FALSE;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR DEFAULT NULL;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;
        ALTER TABLE reports ADD COLUMN IF NOT EXISTS is_breaking BOOLEAN DEFAULT FALSE;
        ALTER TABLE reports ADD COLUMN IF NOT EXISTS event_type VARCHAR DEFAULT NULL;
        ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS report_id UUID DEFAULT NULL;
        ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS reporter_id UUID DEFAULT NULL;
        ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS beneficiary_amount DECIMAL(12,2) DEFAULT NULL;
        ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS agreed_to_platform_fee BOOLEAN DEFAULT FALSE;
      `);
      logger.log('Startup migration: livestreams columns verified');
    } catch (err) {
      logger.warn('Startup migration warning: ' + (err as any).message);
    }
  }
}
bootstrap();
