import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import * as helmet from 'helmet';
const cookieParser = require('cookie-parser');
import { DataSource } from 'typeorm';
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
      ? ['https://reportafrica.com', /\.reportafrica\.com$/, 'https://reportafrica-web.vercel.app', /\.vercel\.app$/, 'https://34-242-14-140.nip.io']
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
  await app.listen(port);

  const logger = new Logger('Bootstrap');
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
      `);
      logger.log('Startup migration: livestreams columns verified');
    } catch (err) {
      logger.warn('Startup migration warning: ' + (err as any).message);
    }
  }
}
bootstrap();
