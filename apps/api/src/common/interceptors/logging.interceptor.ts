import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url, ip } = req;
    const userAgent = req.get('user-agent') || '';
    const userId = req.user?.id || 'anonymous';
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse();
          const duration = Date.now() - start;
          const log = {
            method,
            path: url,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            userId,
            ip,
            userAgent: userAgent.substring(0, 100),
          };

          if (process.env.NODE_ENV === 'production') {
            // Structured JSON for CloudWatch
            console.log(JSON.stringify({ level: 'info', type: 'request', ...log, timestamp: new Date().toISOString() }));
          } else {
            this.logger.log(`${method} ${url} ${res.statusCode} ${duration}ms`);
          }
        },
        error: (error) => {
          const duration = Date.now() - start;
          const log = {
            method,
            path: url,
            statusCode: error.status || 500,
            duration: `${duration}ms`,
            userId,
            ip,
            error: error.message,
          };

          if (process.env.NODE_ENV === 'production') {
            console.log(JSON.stringify({ level: 'error', type: 'request', ...log, timestamp: new Date().toISOString() }));
          } else {
            this.logger.error(`${method} ${url} ${error.status || 500} ${duration}ms - ${error.message}`);
          }
        },
      }),
    );
  }
}
