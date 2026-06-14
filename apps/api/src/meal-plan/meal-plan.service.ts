import { randomUUID } from 'crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  BaseRecipe,
  MealEvent,
  MealPlan,
  MealPlanDay,
  MealPlanGrocerySummaryItem,
  MealPlanNutritionSummary,
  MealPlanRange,
  MealPlanRangeDay,
} from '@cart/shared';
import { CartService } from '../cart/cart.service';
import { PrismaService } from '../prisma/prisma.service';
import { RecipeService } from '../recipe/recipe.service';
import { UserContextService } from '../user/user-context.service';
import {
  CreateMealEventDto,
  GenerateMealPlanCartDto,
  UpdateMealEventDto,
} from './dto/meal-event.dto';
import { UpsertMealPlanDto } from './dto/upsert-meal-plan.dto';

type MealPlanRow = {
  id: string;
  userId: string;
  weekStart: Date;
  daysJson: string;
  createdAt: Date;
  updatedAt: Date;
};

type HydratedMealEvent = MealEvent & {
  recipeDetails?: BaseRecipe;
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

function normalizeAnyDateKey(value: string, field = 'date') {
  const normalized = value?.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new BadRequestException(`${field} must use YYYY-MM-DD format`);
  }

  const parsed = new Date(`${normalized}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`${field} is invalid`);
  }

  return {
    key: normalized,
    date: parsed,
  };
}

function getMondayForDate(date: Date) {
  const monday = new Date(date);
  const day = monday.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  monday.setUTCDate(monday.getUTCDate() + diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildRangeDays(from: string, to: string): MealPlanRangeDay[] {
  const start = normalizeAnyDateKey(from, 'from').date;
  const end = normalizeAnyDateKey(to, 'to').date;

  if (start > end) {
    throw new BadRequestException('from must be before or equal to to');
  }

  const days: MealPlanRangeDay[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    days.push({ date: dateKey(cursor), events: [] });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

function isEventDay(value: unknown): value is MealPlanRangeDay {
  return !!(
    value &&
    typeof value === 'object' &&
    'date' in value &&
    typeof value.date === 'string' &&
    'events' in value &&
    Array.isArray(value.events)
  );
}

function eventSortValue(event: MealEvent) {
  const order: Record<string, number> = {
    breakfast: 1,
    lunch: 2,
    dinner: 3,
    snack: 4,
    prep: 5,
    leftover: 6,
    custom: 7,
  };
  return order[event.meal_label] ?? 99;
}

function normalizeEvent(input: MealEvent): MealEvent {
  return {
    ...input,
    status: input.status ?? 'planned',
    title: input.title || input.recipe?.name || 'Meal',
  };
}

@Injectable()
export class MealPlanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
    private readonly recipeService: RecipeService,
    private readonly userContextService: UserContextService,
  ) {}

  async getWeekPlan(
    weekStart: string,
    actorUserId?: string,
  ): Promise<MealPlan> {
    const actor = await this.userContextService.resolveActorUser(actorUserId);
    const normalizedWeek = normalizeDateKey(weekStart);
    const existing = await this.findStoredWeekPlan(
      actor.id,
      normalizedWeek.date,
    );

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

  async getRangePlan(
    from: string,
    to: string,
    actorUserId?: string,
  ): Promise<MealPlanRange> {
    const actor = await this.userContextService.resolveActorUser(actorUserId);
    const fromDate = normalizeAnyDateKey(from, 'from');
    const toDate = normalizeAnyDateKey(to, 'to');
    const days = buildRangeDays(fromDate.key, toDate.key);
    const rangeStartWeek = getMondayForDate(fromDate.date);
    const rangeEndWeek = getMondayForDate(toDate.date);
    const rows = await this.findStoredWeekPlans(
      actor.id,
      rangeStartWeek,
      rangeEndWeek,
    );
    const events = rows
      .flatMap((row) => this.parseEventDays(row).flatMap((day) => day.events))
      .filter((event) => event.date >= fromDate.key && event.date <= toDate.key)
      .map(normalizeEvent)
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) || eventSortValue(a) - eventSortValue(b),
      );
    const hydratedEvents = await this.hydrateEvents(events, actor.id);
    const publicEvents = hydratedEvents.map(
      ({ recipeDetails, ...event }) => event,
    );

    return {
      from: fromDate.key,
      to: toDate.key,
      days: days.map((day) => ({
        ...day,
        events: publicEvents.filter((event) => event.date === day.date),
      })),
      events: publicEvents,
      grocery_summary: this.buildGrocerySummary(hydratedEvents),
      nutrition_summary: this.buildNutritionSummary(hydratedEvents),
    };
  }

  async createEvent(input: CreateMealEventDto, actorUserId?: string) {
    const actor = await this.userContextService.resolveActorUser(actorUserId);
    const event = await this.normalizeEventInput(
      {
        id: randomUUID(),
        date: input.date,
        meal_label: input.meal_label,
        custom_label: input.custom_label ?? null,
        source_type: input.source_type,
        status: input.status ?? 'planned',
        recipe_id: input.recipe_id || null,
        title: input.title,
        notes: input.notes ?? null,
        servings: input.servings ?? null,
        locked: input.locked ?? false,
      },
      actor.id,
    );

    await this.saveEventToDate(event, actor.id);
    return (await this.hydrateEvents([event], actor.id))[0];
  }

  async updateEvent(
    id: string,
    input: UpdateMealEventDto,
    actorUserId?: string,
  ) {
    const actor = await this.userContextService.resolveActorUser(actorUserId);
    const found = await this.findEventById(actor.id, id);

    if (!found) {
      throw new NotFoundException(`Meal event ${id} not found`);
    }

    if (found.event.locked) {
      throw new BadRequestException('Locked meal events cannot be edited');
    }

    const updated = await this.normalizeEventInput(
      {
        ...found.event,
        ...input,
        id,
        recipe_id:
          input.recipe_id === ''
            ? null
            : input.recipe_id === undefined
              ? found.event.recipe_id
              : input.recipe_id,
        custom_label:
          input.custom_label === undefined
            ? found.event.custom_label
            : input.custom_label,
        notes: input.notes === undefined ? found.event.notes : input.notes,
        servings:
          input.servings === undefined ? found.event.servings : input.servings,
      },
      actor.id,
    );

    await this.removeEventFromWeek(found.weekStart, actor.id, id);
    await this.saveEventToDate(updated, actor.id);
    return (await this.hydrateEvents([updated], actor.id))[0];
  }

  async deleteEvent(id: string, actorUserId?: string) {
    const actor = await this.userContextService.resolveActorUser(actorUserId);
    const found = await this.findEventById(actor.id, id);

    if (!found) {
      throw new NotFoundException(`Meal event ${id} not found`);
    }

    if (found.event.locked) {
      throw new BadRequestException('Locked meal events cannot be deleted');
    }

    await this.removeEventFromWeek(found.weekStart, actor.id, id);
    return { id };
  }

  async generateCart(input: GenerateMealPlanCartDto, actorUserId?: string) {
    const actor = await this.userContextService.resolveActorUser(actorUserId);
    const plan = await this.getRangePlan(input.from, input.to, actor.id);
    const selectedEvents = plan.events.filter(
      (event) =>
        input.event_ids.includes(event.id) &&
        event.source_type === 'recipe' &&
        event.recipe_id,
    );

    if (selectedEvents.length === 0) {
      throw new BadRequestException('Select at least one recipe meal event');
    }

    const counts = new Map<
      string,
      { quantity: number; servingsOverride?: number }
    >();
    for (const event of selectedEvents) {
      const recipeId = event.recipe_id!;
      const existing = counts.get(recipeId);
      counts.set(recipeId, {
        quantity: (existing?.quantity ?? 0) + 1,
        servingsOverride:
          event.servings && event.servings > 0
            ? Math.round(event.servings)
            : existing?.servingsOverride,
      });
    }

    const cart = await this.cartService.createCart(
      {
        name: this.cartNameFromEvents(selectedEvents),
        retailer: input.retailer,
        selections: Array.from(counts.entries()).map(([recipeId, entry]) => ({
          recipe_id: recipeId,
          recipe_type: 'base' as const,
          quantity: entry.quantity,
          servings_override: entry.servingsOverride,
        })),
      },
      actor.id,
    );

    return { id: cart.id, cart_id: cart.id };
  }

  private async normalizeEventInput(
    input: MealEvent,
    actorUserId: string,
  ): Promise<MealEvent> {
    const normalizedDate = normalizeAnyDateKey(
      input.date || dateKey(new Date()),
    ).key;
    const sourceType =
      input.source_type ?? (input.recipe_id ? 'recipe' : 'manual');
    const recipeId = sourceType === 'recipe' ? input.recipe_id || null : null;
    let recipe: BaseRecipe | undefined;

    if (sourceType === 'recipe') {
      if (!recipeId) {
        throw new BadRequestException(
          'recipe_id is required for recipe events',
        );
      }

      recipe = await this.recipeService.findOne(recipeId, actorUserId);
    }

    return normalizeEvent({
      id: input.id,
      date: normalizedDate,
      meal_label:
        input.meal_label ?? (sourceType === 'recipe' ? 'dinner' : 'custom'),
      custom_label: input.custom_label?.trim() || null,
      source_type: sourceType,
      status: input.status ?? 'planned',
      recipe_id: recipeId,
      title: input.title?.trim() || recipe?.name || 'Meal',
      notes: input.notes?.trim() || null,
      servings: input.servings ?? recipe?.servings ?? null,
      locked: input.locked ?? false,
      created_at: input.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  private async hydrateEvents(
    events: MealEvent[],
    actorUserId: string,
  ): Promise<HydratedMealEvent[]> {
    const recipeIds = Array.from(
      new Set(
        events
          .map((event) => event.recipe_id)
          .filter((value): value is string => Boolean(value)),
      ),
    );
    const recipes = recipeIds.length
      ? await this.recipeService.findManyByIds(recipeIds, actorUserId)
      : [];
    const recipeById = new Map(recipes.map((recipe) => [recipe.id, recipe]));

    return events.map((event) => {
      const recipe = event.recipe_id ? recipeById.get(event.recipe_id) : null;
      return {
        ...event,
        recipe: recipe
          ? {
              id: recipe.id,
              name: recipe.name,
              cover_image_url: recipe.cover_image_url ?? null,
              servings: recipe.servings,
              nutrition_data: recipe.nutrition_data,
            }
          : null,
        recipeDetails: recipe ?? undefined,
      };
    });
  }

  private buildGrocerySummary(
    events: HydratedMealEvent[],
  ): MealPlanGrocerySummaryItem[] {
    const groceryMap = new Map<string, MealPlanGrocerySummaryItem>();

    for (const event of events) {
      const recipe =
        event.recipe_id && event.source_type === 'recipe'
          ? event.recipeDetails
          : null;
      if (!recipe || event.source_type !== 'recipe') continue;

      const servingMultiplier =
        event.servings && recipe.servings
          ? event.servings / recipe.servings
          : 1;

      for (const ingredient of recipe.ingredients ?? []) {
        const key = `${ingredient.canonical_ingredient}::${ingredient.unit}`;
        const existing = groceryMap.get(key);
        const amount = ingredient.amount * servingMultiplier;

        if (existing) {
          existing.amount += amount;
          existing.event_ids = Array.from(
            new Set([...(existing.event_ids ?? []), event.id]),
          );
        } else {
          groceryMap.set(key, {
            canonical_ingredient: ingredient.canonical_ingredient,
            display_ingredient:
              ingredient.display_ingredient ?? ingredient.canonical_ingredient,
            amount,
            unit: ingredient.unit,
            event_ids: [event.id],
          });
        }
      }
    }

    return Array.from(groceryMap.values()).map((item) => ({
      ...item,
      amount: Number(item.amount.toFixed(2)),
    }));
  }

  private buildNutritionSummary(
    events: HydratedMealEvent[],
  ): MealPlanNutritionSummary {
    return events.reduce<MealPlanNutritionSummary>(
      (summary, event) => {
        const recipe = event.recipeDetails;
        const nutrition = recipe?.nutrition_data;
        if (!recipe || !nutrition || event.source_type !== 'recipe') {
          return summary;
        }

        const servingMultiplier =
          event.servings && event.servings > 0 && recipe.servings
            ? event.servings / recipe.servings
            : 1;

        return {
          calories:
            (summary.calories ?? 0) +
            (nutrition.calories ?? 0) * servingMultiplier,
          protein_g:
            (summary.protein_g ?? 0) +
            (nutrition.protein_g ?? 0) * servingMultiplier,
          carbs_g:
            (summary.carbs_g ?? 0) +
            (nutrition.carbs_g ?? 0) * servingMultiplier,
          fat_g:
            (summary.fat_g ?? 0) + (nutrition.fat_g ?? 0) * servingMultiplier,
        };
      },
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
    );
  }

  private parseEventDays(row: MealPlanRow): MealPlanRangeDay[] {
    const parsed = JSON.parse(row.daysJson) as unknown;
    if (!Array.isArray(parsed) || !parsed.every(isEventDay)) {
      return buildRangeDays(
        dateKey(row.weekStart),
        dateKey(new Date(row.weekStart.getTime() + 6 * 24 * 60 * 60 * 1000)),
      );
    }

    return parsed.map((day) => ({
      date: day.date,
      events: day.events.map(normalizeEvent),
    }));
  }

  private async saveEventToDate(event: MealEvent, userId: string) {
    const weekStart = getMondayForDate(normalizeAnyDateKey(event.date).date);
    const days = await this.loadEventDaysForWeek(userId, weekStart);
    const nextDays = days.map((day) => ({
      ...day,
      events:
        day.date === event.date
          ? [
              ...day.events.filter((existing) => existing.id !== event.id),
              event,
            ].sort((a, b) => eventSortValue(a) - eventSortValue(b))
          : day.events.filter((existing) => existing.id !== event.id),
    }));
    await this.saveEventDays(userId, weekStart, nextDays);
  }

  private async removeEventFromWeek(
    weekStart: Date,
    userId: string,
    eventId: string,
  ) {
    const days = await this.loadEventDaysForWeek(userId, weekStart);
    await this.saveEventDays(
      userId,
      weekStart,
      days.map((day) => ({
        ...day,
        events: day.events.filter((event) => event.id !== eventId),
      })),
    );
  }

  private async loadEventDaysForWeek(userId: string, weekStart: Date) {
    const existing = await this.findStoredWeekPlan(userId, weekStart);
    if (existing) {
      return this.parseEventDays(existing);
    }

    return buildRangeDays(
      dateKey(weekStart),
      dateKey(new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000)),
    );
  }

  private async saveEventDays(
    userId: string,
    weekStart: Date,
    days: MealPlanRangeDay[],
  ) {
    await this.prisma.$queryRawUnsafe<MealPlanRow[]>(
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
      `,
      randomUUID(),
      userId,
      dateKey(weekStart),
      JSON.stringify(days),
    );
  }

  private async findEventById(userId: string, eventId: string) {
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
        WHERE "userId" = $1
      `,
      userId,
    );

    for (const row of rows) {
      for (const day of this.parseEventDays(row)) {
        const event = day.events.find((item) => item.id === eventId);
        if (event) {
          return { event, weekStart: row.weekStart };
        }
      }
    }

    return null;
  }

  private async findStoredWeekPlans(
    userId: string,
    startWeek: Date,
    endWeek: Date,
  ) {
    return this.prisma.$queryRawUnsafe<MealPlanRow[]>(
      `
        SELECT
          "id",
          "userId",
          "weekStart",
          "days"::text AS "daysJson",
          "createdAt",
          "updatedAt"
        FROM "MealPlan"
        WHERE "userId" = $1
          AND "weekStart" >= $2::date
          AND "weekStart" <= $3::date
        ORDER BY "weekStart" ASC
      `,
      userId,
      dateKey(startWeek),
      dateKey(endWeek),
    );
  }

  private cartNameFromEvents(events: MealEvent[]) {
    const titles = events.map((event) => event.title).filter(Boolean);
    if (titles.length === 0) return 'Meal plan cart';
    if (titles.length === 1) return titles[0];
    if (titles.length === 2) return `${titles[0]} + ${titles[1]}`;
    return `${titles[0]}, ${titles[1]} + ${titles.length - 2} more`;
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

    const recipes = await this.recipeService.findManyByIds(
      recipeIds,
      actorUserId,
    );

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
