import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import type {
  AiRateLimitScope,
  AiRateLimitSnapshot,
  AiUsageCategory,
  AiUsageCategorySnapshot,
} from '@cart/shared';
import type { AuthenticatedUser } from '../auth/auth.types';

type RequestWithUser = Request & {
  user?: AuthenticatedUser;
};

type Bucket = {
  count: number;
  categoryCounts: Record<AiUsageCategory, number>;
  resetAt: number;
};

const AI_USAGE_CATEGORIES: {
  category: AiUsageCategory;
  label: string;
}[] = [
  { category: 'chat', label: 'Chat' },
  { category: 'autofill', label: 'Autofill' },
  { category: 'imports', label: 'Imports' },
];

@Injectable()
export class AiRateLimitService {
  private readonly buckets = new Map<string, Bucket>();
  private lastSweepAt = Date.now();

  consume(
    request: RequestWithUser,
    category: AiUsageCategory,
    now = Date.now(),
  ): AiRateLimitSnapshot {
    const config = this.getConfig();
    const identity = this.buildIdentity(request);

    this.sweepExpiredBuckets(now);

    const bucket = this.buckets.get(identity.key);

    if (!bucket || bucket.resetAt <= now) {
      const nextBucket = {
        count: 1,
        categoryCounts: this.createCategoryCounts(category),
        resetAt: now + config.windowMs,
      };

      this.buckets.set(identity.key, nextBucket);

      return this.toSnapshot({
        scope: identity.scope,
        bucket: nextBucket,
        now,
        windowMs: config.windowMs,
        maxRequests: config.maxRequests,
      });
    }

    bucket.count += 1;
    bucket.categoryCounts[category] += 1;

    return this.toSnapshot({
      scope: identity.scope,
      bucket,
      now,
      windowMs: config.windowMs,
      maxRequests: config.maxRequests,
    });
  }

  getUsageCategories(
    request: RequestWithUser,
    now = Date.now(),
  ): AiUsageCategorySnapshot[] {
    const identity = this.buildIdentity(request);

    this.sweepExpiredBuckets(now);

    const bucket = this.buckets.get(identity.key);

    if (!bucket || bucket.resetAt <= now) {
      return this.toUsageCategories();
    }

    return this.toUsageCategories(bucket.categoryCounts);
  }

  getSnapshot(request: RequestWithUser, now = Date.now()): AiRateLimitSnapshot {
    const config = this.getConfig();
    const identity = this.buildIdentity(request);

    this.sweepExpiredBuckets(now);

    const bucket = this.buckets.get(identity.key);

    if (!bucket || bucket.resetAt <= now) {
      return {
        scope: identity.scope,
        window_ms: config.windowMs,
        max_requests: config.maxRequests,
        used: 0,
        remaining: config.maxRequests,
        reset_at: null,
        reset_in_seconds: null,
      };
    }

    return this.toSnapshot({
      scope: identity.scope,
      bucket,
      now,
      windowMs: config.windowMs,
      maxRequests: config.maxRequests,
    });
  }

  private getConfig() {
    return {
      windowMs: readPositiveIntEnv('AI_RATE_LIMIT_WINDOW_MS', 10 * 60 * 1000),
      maxRequests: readPositiveIntEnv('AI_RATE_LIMIT_MAX_REQUESTS', 30),
    };
  }

  private buildIdentity(request: RequestWithUser): {
    key: string;
    scope: AiRateLimitScope;
  } {
    const userId = request.user?.sub;

    if (userId) {
      return { key: `user:${userId}`, scope: 'user' };
    }

    const forwardedFor = request
      .header('x-forwarded-for')
      ?.split(',')[0]
      ?.trim();
    const ip =
      forwardedFor || request.ip || request.socket.remoteAddress || 'unknown';

    return { key: `ip:${ip}`, scope: 'ip' };
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

  private toSnapshot(input: {
    scope: AiRateLimitScope;
    bucket: Bucket;
    now: number;
    windowMs: number;
    maxRequests: number;
  }): AiRateLimitSnapshot {
    return {
      scope: input.scope,
      window_ms: input.windowMs,
      max_requests: input.maxRequests,
      used: input.bucket.count,
      remaining: Math.max(input.maxRequests - input.bucket.count, 0),
      reset_at: new Date(input.bucket.resetAt).toISOString(),
      reset_in_seconds: Math.max(
        1,
        Math.ceil((input.bucket.resetAt - input.now) / 1000),
      ),
    };
  }

  private createCategoryCounts(
    incrementCategory?: AiUsageCategory,
  ): Record<AiUsageCategory, number> {
    const counts = {
      chat: 0,
      autofill: 0,
      imports: 0,
    };

    if (incrementCategory) {
      counts[incrementCategory] = 1;
    }

    return counts;
  }

  private toUsageCategories(
    counts: Record<AiUsageCategory, number> = this.createCategoryCounts(),
  ): AiUsageCategorySnapshot[] {
    return AI_USAGE_CATEGORIES.map(({ category, label }) => ({
      category,
      label,
      used: counts[category],
    }));
  }
}

function readPositiveIntEnv(name: string, fallback: number) {
  const value = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
