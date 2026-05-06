import { BadRequestException } from '@nestjs/common';
import type {
  UserFoodRuleAction,
  UserFoodRuleKind,
  UserGoalTimeframe,
  UserMemoryConfidence,
  UserMemorySource,
  UserRuleStrictness,
} from '@cart/shared';
import { UserGoalTimeframe as PrismaUserGoalTimeframe } from '../../generated/prisma/index.js';

export type ProfileMemoryRuleSafetyInput = {
  kind: UserFoodRuleKind;
  action: UserFoodRuleAction;
  strictness: UserRuleStrictness;
  source: UserMemorySource;
  confidence: UserMemoryConfidence;
};

export function normalizeMemoryLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/[\s_-]+/g, ' ');
}

export function buildFoodRuleDedupeKey(input: {
  kind: UserFoodRuleKind;
  action: UserFoodRuleAction;
  normalizedLabel: string;
  ingredientId?: string;
  tagId?: string;
}): string {
  if (input.ingredientId) {
    return `${input.kind}:ingredient:${input.ingredientId}:${input.action}`;
  }

  if (input.tagId) {
    return `${input.kind}:tag:${input.tagId}:${input.action}`;
  }

  return `${input.kind}:label:${input.normalizedLabel}:${input.action}`;
}

export function assertFoodRuleSafety(input: ProfileMemoryRuleSafetyInput) {
  if (input.source !== 'inferred' && input.source !== 'behavior') {
    return;
  }

  if (input.strictness === 'hard') {
    throw new BadRequestException('Inferred or behavior rules cannot be hard');
  }

  if (input.action === 'require') {
    throw new BadRequestException(
      'Inferred or behavior rules cannot require constraints',
    );
  }

  if (input.kind === 'dietary_constraint') {
    throw new BadRequestException(
      'Inferred dietary, medical, allergy, or religious constraints require explicit confirmation',
    );
  }

  if (input.source === 'behavior' && input.confidence !== 'low') {
    throw new BadRequestException(
      'Behavior memory can only write low-confidence soft preferences',
    );
  }

  if (input.source === 'inferred' && input.confidence === 'high') {
    throw new BadRequestException(
      'Inferred memory cannot be written with high confidence',
    );
  }
}

export function isMemoryCurrentlyActive(input: {
  active: boolean;
  startsAt?: Date | null;
  expiresAt?: Date | null;
  now?: Date;
}): boolean {
  if (!input.active) {
    return false;
  }

  const now = input.now ?? new Date();

  if (input.startsAt && input.startsAt > now) {
    return false;
  }

  if (input.expiresAt && input.expiresAt <= now) {
    return false;
  }

  return true;
}

export function toPrismaGoalTimeframe(
  timeframe: UserGoalTimeframe = 'default',
): PrismaUserGoalTimeframe {
  if (timeframe === 'default') {
    return PrismaUserGoalTimeframe.default_timeframe;
  }

  return timeframe;
}

export function fromPrismaGoalTimeframe(
  timeframe: PrismaUserGoalTimeframe,
): UserGoalTimeframe {
  if (timeframe === PrismaUserGoalTimeframe.default_timeframe) {
    return 'default';
  }

  return timeframe;
}
