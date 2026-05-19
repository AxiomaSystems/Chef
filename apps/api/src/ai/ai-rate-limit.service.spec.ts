import type { ExecutionContext } from '@nestjs/common';
import { HttpException } from '@nestjs/common';
import { AiRateLimitGuard } from './ai-rate-limit.guard';
import { AiRateLimitService } from './ai-rate-limit.service';

function requestForUser(userId: string) {
  return {
    user: { sub: userId },
    header: jest.fn(),
    socket: {},
  };
}

function contextForRequest(request: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext;
}

describe('AiRateLimitService', () => {
  const originalWindowMs = process.env.AI_RATE_LIMIT_WINDOW_MS;
  const originalMaxRequests = process.env.AI_RATE_LIMIT_MAX_REQUESTS;

  beforeEach(() => {
    process.env.AI_RATE_LIMIT_WINDOW_MS = '600000';
    process.env.AI_RATE_LIMIT_MAX_REQUESTS = '2';
  });

  afterEach(() => {
    if (originalWindowMs === undefined) {
      delete process.env.AI_RATE_LIMIT_WINDOW_MS;
    } else {
      process.env.AI_RATE_LIMIT_WINDOW_MS = originalWindowMs;
    }

    if (originalMaxRequests === undefined) {
      delete process.env.AI_RATE_LIMIT_MAX_REQUESTS;
    } else {
      process.env.AI_RATE_LIMIT_MAX_REQUESTS = originalMaxRequests;
    }
  });

  it('reports usage without incrementing the bucket', () => {
    const service = new AiRateLimitService();
    const request = requestForUser('user-1');

    expect(service.getSnapshot(request as never, 1000)).toMatchObject({
      scope: 'user',
      window_ms: 600000,
      max_requests: 2,
      used: 0,
      remaining: 2,
      reset_at: null,
      reset_in_seconds: null,
    });

    service.consume(request as never, 1000);

    expect(service.getSnapshot(request as never, 1000)).toMatchObject({
      used: 1,
      remaining: 1,
      reset_in_seconds: 600,
    });
  });

  it('blocks through the guard after the configured request count', () => {
    const service = new AiRateLimitService();
    const guard = new AiRateLimitGuard(service);
    const context = contextForRequest(requestForUser('user-1'));

    expect(guard.canActivate(context)).toBe(true);
    expect(guard.canActivate(context)).toBe(true);
    expect(() => guard.canActivate(context)).toThrow(HttpException);
  });

  it('tracks users separately', () => {
    const service = new AiRateLimitService();
    const guard = new AiRateLimitGuard(service);

    expect(guard.canActivate(contextForRequest(requestForUser('user-1')))).toBe(
      true,
    );
    expect(guard.canActivate(contextForRequest(requestForUser('user-2')))).toBe(
      true,
    );

    expect(
      service.getSnapshot(requestForUser('user-1') as never, Date.now()).used,
    ).toBe(1);
    expect(
      service.getSnapshot(requestForUser('user-2') as never, Date.now()).used,
    ).toBe(1);
  });
});
