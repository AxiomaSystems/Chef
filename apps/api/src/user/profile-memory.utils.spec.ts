import { BadRequestException } from '@nestjs/common';
import { UserGoalTimeframe as PrismaUserGoalTimeframe } from '../../generated/prisma/index.js';
import {
  assertFoodRuleSafety,
  buildFoodRuleDedupeKey,
  fromPrismaGoalTimeframe,
  isMemoryCurrentlyActive,
  normalizeMemoryLabel,
  toPrismaGoalTimeframe,
} from './profile-memory.utils';

describe('profile memory utils', () => {
  it('normalizes labels for deduplication', () => {
    expect(normalizeMemoryLabel('  Raw Onion!!  ')).toBe('raw onion');
    expect(normalizeMemoryLabel('Gluten-Free')).toBe('gluten free');
  });

  it('builds stable dedupe keys with catalog ids preferred over labels', () => {
    expect(
      buildFoodRuleDedupeKey({
        kind: 'ingredient_preference',
        action: 'avoid',
        normalizedLabel: 'mushrooms',
        ingredientId: 'ingredient_1',
      }),
    ).toBe('ingredient_preference:ingredient:ingredient_1:avoid');

    expect(
      buildFoodRuleDedupeKey({
        kind: 'dietary_constraint',
        action: 'require',
        normalizedLabel: 'vegan',
        tagId: 'tag_1',
      }),
    ).toBe('dietary_constraint:tag:tag_1:require');
  });

  it('rejects inferred hard or sensitive rules', () => {
    expect(() =>
      assertFoodRuleSafety({
        kind: 'ingredient_preference',
        action: 'avoid',
        strictness: 'hard',
        source: 'inferred',
        confidence: 'low',
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      assertFoodRuleSafety({
        kind: 'dietary_constraint',
        action: 'avoid',
        strictness: 'soft',
        source: 'inferred',
        confidence: 'low',
      }),
    ).toThrow(BadRequestException);
  });

  it('allows explicit hard rules', () => {
    expect(() =>
      assertFoodRuleSafety({
        kind: 'dietary_constraint',
        action: 'require',
        strictness: 'hard',
        source: 'onboarding',
        confidence: 'high',
      }),
    ).not.toThrow();
  });

  it('maps public and Prisma goal timeframes', () => {
    expect(toPrismaGoalTimeframe('default')).toBe(
      PrismaUserGoalTimeframe.default_timeframe,
    );
    expect(fromPrismaGoalTimeframe(PrismaUserGoalTimeframe.this_week)).toBe(
      'this_week',
    );
  });

  it('filters inactive, future, and expired memory', () => {
    const now = new Date('2026-04-30T12:00:00.000Z');

    expect(isMemoryCurrentlyActive({ active: true, now })).toBe(true);
    expect(isMemoryCurrentlyActive({ active: false, now })).toBe(false);
    expect(
      isMemoryCurrentlyActive({
        active: true,
        startsAt: new Date('2026-05-01T00:00:00.000Z'),
        now,
      }),
    ).toBe(false);
    expect(
      isMemoryCurrentlyActive({
        active: true,
        expiresAt: new Date('2026-04-29T00:00:00.000Z'),
        now,
      }),
    ).toBe(false);
  });
});
