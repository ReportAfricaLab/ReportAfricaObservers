import { Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import * as Sentry from '@sentry/node';

export function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    release: `reportafrica-api@${process.env.npm_package_version || '1.0.0'}`,
  });
}

@Catch()
export class SentryExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(SentryExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    // Only report 5xx errors to Sentry (not 4xx client errors)
    if (status >= 500) {
      Sentry.captureException(exception);
      this.logger.error(`Unhandled exception captured by Sentry`, exception instanceof Error ? exception.stack : exception);
    }

    super.catch(exception, host);
  }
}
