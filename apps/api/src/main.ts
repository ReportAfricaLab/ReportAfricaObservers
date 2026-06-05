import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import * as helmet from 'helmet';
const cookieParser = require('cookie-parser');
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
    contentSecurityPolicy: isProduction ? undefined : false,
    crossOriginEmbedderPolicy: false,
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
}
bootstrap();
