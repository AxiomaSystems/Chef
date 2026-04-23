import { randomUUID } from 'crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import type { MealPlan, MealPlanDay } from '@cart/shared';
import { PrismaService } from '../prisma/prisma.service';
import { RecipeService } from '../recipe/recipe.service';
import { UserContextService } from '../user/user-context.service';
import { UpsertMealPlanDto } from './dto/upsert-meal-plan.dto';

type MealPlanRow = {
  id: string;
  userId: string;
  weekStart: Date;
  daysJson: string;
  createdAt: Date;
  updatedAt: Date;
};

const EMPTY_WEEK = Array.from({ length: 7 }, () => ({}));

function buildEmptyWeekPlan(): MealPlanDay[] {
  return EMPTY_WEEK.map(() => ({}));
}

function normalizeDateKey(value: string) {
  const normalized = value.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new BadRequestException('week_start must use YYYY-MM-DD format');
  }

  const parsed = new Date(`${normalized}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException('week_start is invalid');
  }

  if (parsed.getUTCDay() !== 1) {
    throw new BadRequestException('week_start must be a Monday');
  }

  return {
    key: normalized,
    date: parsed,
  };
}

@Injectable()
export class MealPlanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recipeService: RecipeService,
    private readonly userContextService: UserContextService,
  ) {}

  async getWeekPlan(
    weekStart: string,
    actorUserId?: string,
  ): Promise<MealPlan> {
    const actor = await this.userContextService.resolveActorUser(actorUserId);
    const normalizedWeek = normalizeDateKey(weekStart);
    const existing = await this.findStoredWeekPlan(actor.id, normalizedWeek.date);

    if (!existing) {
      return {
        user_id: actor.id,
        week_start: normalizedWeek.key,
        days: buildEmptyWeekPlan(),
      };
    }

    return this.mapRow(existing);
  }

  async upsertWeekPlan(
    weekStart: string,
    input: UpsertMealPlanDto,
    actorUserId?: string,
  ): Promise<MealPlan> {
    const actor = await this.userContextService.resolveActorUser(actorUserId);
    const normalizedWeek = normalizeDateKey(weekStart);
    const days = this.normalizeDays(input.days);
    await this.assertRecipesVisible(days, actor.id);

    const [saved] = await this.prisma.$queryRawUnsafe<MealPlanRow[]>(
      `
        INSERT INTO "MealPlan" (
          "id",
          "userId",
          "weekStart",
          "days",
          "createdAt",
          "updatedAt"
        )
        VALUES ($1, $2, $3::date, $4::jsonb, NOW(), NOW())
        ON CONFLICT ("userId", "weekStart")
        DO UPDATE SET
          "days" = EXCLUDED."days",
          "updatedAt" = NOW()
        RETURNING
          "id",
          "userId",
          "weekStart",
          "days"::text AS "daysJson",
          "createdAt",
          "updatedAt"
      `,
      randomUUID(),
      actor.id,
      normalizedWeek.key,
      JSON.stringify(days),
    );

    return this.mapRow(saved);
  }

  private async assertRecipesVisible(days: MealPlanDay[], actorUserId: string) {
    const recipeIds = Array.from(
      new Set(
        days.flatMap((day) =>
          [day.breakfast, day.lunch, day.dinner].filter(
            (value): value is string => Boolean(value),
          ),
        ),
      ),
    );

    if (recipeIds.length === 0) {
      return;
    }

    const recipes = await this.recipeService.findManyByIds(recipeIds, actorUserId);

    if (recipes.length !== recipeIds.length) {
      throw new BadRequestException('One or more recipe ids are invalid');
    }
  }

  private normalizeDays(input: UpsertMealPlanDto['days']): MealPlanDay[] {
    if (!Array.isArray(input) || input.length !== 7) {
      throw new BadRequestException('days must contain exactly seven entries');
    }

    return input.map((day) => ({
      breakfast: day.breakfast?.trim() || undefined,
      lunch: day.lunch?.trim() || undefined,
      dinner: day.dinner?.trim() || undefined,
    }));
  }

  private async findStoredWeekPlan(userId: string, weekStart: Date) {
    const rows = await this.prisma.$queryRawUnsafe<MealPlanRow[]>(
      `
        SELECT
          "id",
          "userId",
          "weekStart",
          "days"::text AS "daysJson",
          "createdAt",
          "updatedAt"
        FROM "MealPlan"
        WHERE "userId" = $1 AND "weekStart" = $2::date
        LIMIT 1
      `,
      userId,
      weekStart.toISOString().slice(0, 10),
    );

    return rows[0] ?? null;
  }

  private mapRow(row: MealPlanRow): MealPlan {
    return {
      id: row.id,
      user_id: row.userId,
      week_start: row.weekStart.toISOString().slice(0, 10),
      days: this.normalizeDays(JSON.parse(row.daysJson) as MealPlanDay[]),
      created_at: row.createdAt.toISOString(),
      updated_at: row.updatedAt.toISOString(),
    };
  }
}
