import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';

type RequestWithUser = Request & {
  user?: AuthenticatedUser;
};

type Bucket = {
  count: number;
  resetAt: number;
};

@Injectable()
export class AiRateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, Bucket>();
  private lastSweepAt = Date.now();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const now = Date.now();
    const windowMs = readPositiveIntEnv('AI_RATE_LIMIT_WINDOW_MS', 10 * 60 * 1000);
    const maxRequests = readPositiveIntEnv('AI_RATE_LIMIT_MAX_REQUESTS', 30);
    const key = this.buildKey(request);

    this.sweepExpiredBuckets(now);

    const bucket = this.buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      return true;
    }

    if (bucket.count >= maxRequests) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((bucket.resetAt - now) / 1000),
      );

      throw new HttpException(
        {
          message: `AI request limit reached. Try again in ${retryAfterSeconds} seconds.`,
          retry_after_seconds: retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    bucket.count += 1;
    return true;
  }

  private buildKey(request: RequestWithUser) {
    const userId = request.user?.sub;

    if (userId) {
      return `user:${userId}`;
    }

    const forwardedFor = request.header('x-forwarded-for')?.split(',')[0]?.trim();
    const ip = forwardedFor || request.ip || request.socket.remoteAddress || 'unknown';

    return `ip:${ip}`;
  }

  private sweepExpiredBuckets(now: number) {
    if (now - this.lastSweepAt < 60_000) {
      return;
    }

    this.lastSweepAt = now;

    for (const [key, bucket] of this.buckets.entries()) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }
}

function readPositiveIntEnv(name: string, fallback: number) {
  const value = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

