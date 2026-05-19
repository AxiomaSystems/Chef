import type { ExecutionContext } from '@nestjs/common';
import { HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AiUsageCategory } from '@cart/shared';
import { CaptureController } from '../capture/capture.controller';
import { AI_USAGE_CATEGORY_KEY } from './ai-usage-category.decorator';
import { AiController } from './ai.controller';
import { AiRateLimitGuard } from './ai-rate-limit.guard';
import { AiRateLimitService } from './ai-rate-limit.service';

function requestForUser(userId: string) {
  return {
    user: { sub: userId },
    header: jest.fn(),
    socket: {},
  };
}

function contextForRequest(
  request: unknown,
  category?: AiUsageCategory,
): ExecutionContext {
  const handler = () => undefined;

  if (category) {
    Reflect.defineMetadata(AI_USAGE_CATEGORY_KEY, category, handler);
  }

  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => handler,
    getClass: () => class TestController {},
  } as ExecutionContext;
}

function createGuard(service: AiRateLimitService) {
  return new AiRateLimitGuard(service, new Reflector());
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

    service.consume(request as never, 'chat', 1000);

    expect(service.getSnapshot(request as never, 1000)).toMatchObject({
      used: 1,
      remaining: 1,
      reset_in_seconds: 600,
    });
    expect(service.getUsageCategories(request as never, 1000)).toEqual([
      { category: 'chat', label: 'Chat', used: 1 },
      { category: 'autofill', label: 'Autofill', used: 0 },
      { category: 'imports', label: 'Imports', used: 0 },
      { category: 'inventory_fill', label: 'Inventory fill', used: 0 },
    ]);
  });

  it('blocks through the guard after the configured request count', () => {
    const service = new AiRateLimitService();
    const guard = createGuard(service);
    const context = contextForRequest(requestForUser('user-1'), 'chat');

    expect(guard.canActivate(context)).toBe(true);
    expect(guard.canActivate(context)).toBe(true);
    expect(() => guard.canActivate(context)).toThrow(HttpException);

    expect(
      service.getUsageCategories(requestForUser('user-1') as never, Date.now()),
    ).toEqual([
      { category: 'chat', label: 'Chat', used: 2 },
      { category: 'autofill', label: 'Autofill', used: 0 },
      { category: 'imports', label: 'Imports', used: 0 },
      { category: 'inventory_fill', label: 'Inventory fill', used: 0 },
    ]);
  });

  it('tracks users separately', () => {
    const service = new AiRateLimitService();
    const guard = createGuard(service);

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

  it('tracks usage categories inside the shared limit window', () => {
    const service = new AiRateLimitService();
    const guard = createGuard(service);
    const request = requestForUser('user-1');

    expect(guard.canActivate(contextForRequest(request, 'chat'))).toBe(true);
    expect(guard.canActivate(contextForRequest(request, 'imports'))).toBe(true);
    expect(() =>
      guard.canActivate(contextForRequest(request, 'autofill')),
    ).toThrow(HttpException);

    expect(service.getSnapshot(request as never, Date.now()).used).toBe(2);
    expect(service.getUsageCategories(request as never, Date.now())).toEqual([
      { category: 'chat', label: 'Chat', used: 1 },
      { category: 'autofill', label: 'Autofill', used: 0 },
      { category: 'imports', label: 'Imports', used: 1 },
      { category: 'inventory_fill', label: 'Inventory fill', used: 0 },
    ]);
  });

  it('clears category counts when the limit window resets', () => {
    const service = new AiRateLimitService();
    const request = requestForUser('user-1');

    service.consume(request as never, 'imports', 1000);

    expect(service.getUsageCategories(request as never, 1000)).toEqual([
      { category: 'chat', label: 'Chat', used: 0 },
      { category: 'autofill', label: 'Autofill', used: 0 },
      { category: 'imports', label: 'Imports', used: 1 },
      { category: 'inventory_fill', label: 'Inventory fill', used: 0 },
    ]);

    expect(service.getSnapshot(request as never, 601001)).toMatchObject({
      used: 0,
      remaining: 2,
      reset_at: null,
      reset_in_seconds: null,
    });
    expect(service.getUsageCategories(request as never, 601001)).toEqual([
      { category: 'chat', label: 'Chat', used: 0 },
      { category: 'autofill', label: 'Autofill', used: 0 },
      { category: 'imports', label: 'Imports', used: 0 },
      { category: 'inventory_fill', label: 'Inventory fill', used: 0 },
    ]);
  });

  it('marks AI-backed routes with usage metadata', () => {
    expect(
      Reflect.getMetadata(
        AI_USAGE_CATEGORY_KEY,
        AiController.prototype.inventoryAlternatives,
      ),
    ).toBe('autofill');
    expect(
      Reflect.getMetadata(
        AI_USAGE_CATEGORY_KEY,
        AiController.prototype.importRecipe,
      ),
    ).toBe('imports');
    expect(
      Reflect.getMetadata(
        AI_USAGE_CATEGORY_KEY,
        CaptureController.prototype.createCapture,
      ),
    ).toBe('imports');
    expect(
      Reflect.getMetadata(
        AI_USAGE_CATEGORY_KEY,
        AiController.prototype.structureInventory,
      ),
    ).toBe('inventory_fill');
  });
});
