import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

type AuthBucket = {
  count: number;
  resetAt: number;
};

type AuthRateLimitConfig = {
  windowMs: number;
  maxRequests: number;
};

@Injectable()
export class AuthRateLimitService {
  private readonly buckets = new Map<string, AuthBucket>();
  private lastSweepAt = Date.now();

  consume(
    request: Request,
    now = Date.now(),
  ): {
    allowed: boolean;
    resetInSeconds: number;
  } {
    const config = this.getConfig(request.path);
    const key = this.buildKey(request);

    this.sweepExpiredBuckets(now);

    const bucket = this.buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, {
        count: 1,
        resetAt: now + config.windowMs,
      });

      return {
        allowed: true,
        resetInSeconds: Math.ceil(config.windowMs / 1000),
      };
    }

    bucket.count += 1;

    return {
      allowed: bucket.count <= config.maxRequests,
      resetInSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  private getConfig(path: string): AuthRateLimitConfig {
    const isRefresh = path.endsWith('/refresh');
    return {
      windowMs: readPositiveIntEnv('AUTH_RATE_LIMIT_WINDOW_MS', 10 * 60 * 1000),
      maxRequests: readPositiveIntEnv(
        isRefresh
          ? 'AUTH_REFRESH_RATE_LIMIT_MAX_REQUESTS'
          : 'AUTH_RATE_LIMIT_MAX_REQUESTS',
        isRefresh ? 30 : 10,
      ),
    };
  }

  private buildKey(request: Request): string {
    const body = isRecord(request.body) ? request.body : {};
    const email =
      typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const ip = readClientIp(request);

    return email ? `${ip}:email:${email}` : `${ip}:path:${request.path}`;
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

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  constructor(private readonly authRateLimitService: AuthRateLimitService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const result = this.authRateLimitService.consume(request);

    if (!result.allowed) {
      throw new HttpException(
        {
          message: 'Too many authentication attempts. Try again later.',
          retry_after_seconds: result.resetInSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}

function readClientIp(request: Request): string {
  const forwardedFor = request.header('x-forwarded-for')?.split(',')[0]?.trim();
  return (
    forwardedFor || request.ip || request.socket.remoteAddress || 'unknown'
  );
}

function readPositiveIntEnv(name: string, fallback: number): number {
  const value = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null;
}
