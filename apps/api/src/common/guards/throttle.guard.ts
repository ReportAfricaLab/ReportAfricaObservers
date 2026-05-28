import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class StrictThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): Promise<string> {
    // Track by IP + user-agent for stricter limiting
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const ua = (req.headers?.['user-agent'] || '').substring(0, 50);
    return Promise.resolve(`${ip}-${ua}`);
  }
}
