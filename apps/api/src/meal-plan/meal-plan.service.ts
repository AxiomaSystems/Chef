import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  BaseRecipe,
  CartSelection,
  GenerateMealPlanCartResponse,
  MealEvent as SharedMealEvent,
  MealPlan,
  MealPlanDay,
  MealPlanEventStatus,
  MealPlanMealLabel,
  MealPlanRange,
  MealPlanSourceType,
} from '@cart/shared';
import type { MealEvent as PrismaMealEvent } from '../../generated/prisma/index.js';
import { CartService } from '../cart/cart.service';
import { PrismaService } from '../prisma/prisma.service';
import { RecipeService } from '../recipe/recipe.service';
import { UserContextService } from '../user/user-context.service';
import { CreateMealPlanCartDto } from './dto/create-meal-plan-cart.dto';
import { CreateMealEventDto, UpdateMealEventDto } from './dto/meal-event.dto';
import { MealPlanRangeQueryDto } from './dto/meal-plan-range-query.dto';
import { UpsertMealPlanDto } from './dto/upsert-meal-plan.dto';

type DateRange = {
  from: string;
  to: string;
  fromDate: Date;
  toDate: Date;
};

type MealEventWithRecipe = SharedMealEvent & {
  recipe?: BaseRecipe | null;
};

const EMPTY_WEEK = Array.from({ length: 7 }, () => ({}));
const MAX_RANGE_DAYS = 45;
const LEGACY_LABELS: MealPlanMealLabel[] = ['breakfast', 'lunch', 'dinner'];

function buildEmptyWeekPlan(): MealPlanDay[] {
  return EMPTY_WEEK.map(() => ({}));
}

function parseDateKey(value: string, label: string) {
  const normalized = value.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new BadRequestException(`${label} must use YYYY-MM-DD format`);
  }

  const parsed = new Date(`${normalized}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`${label} is invalid`);
  }

  return {
    key: normalized,
    date: parsed,
  };
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function normalizeWeekStart(value: string) {
  const normalized = parseDateKey(value, 'week_start');

  if (normalized.date.getUTCDay() !== 1) {
    throw new BadRequestException('week_start must be a Monday');
  }

  return normalized;
}

function normalizeRange(input: MealPlanRangeQueryDto | CreateMealPlanCartDto) {
  const fromInput =
    'week_start' in input && input.week_start ? input.week_start : input.from;
  const toInput =
    'week_start' in input && input.week_start
      ? toDateKey(addDays(parseDateKey(input.week_start, 'week_start').date, 6))
      : input.to;

  if (!fromInput || !toInput) {
    throw new BadRequestException('from and to are required');
  }

  const from = parseDateKey(fromInput, 'from');
  const to = parseDateKey(toInput, 'to');

  if (from.date > to.date) {
    throw new BadRequestException('from must be before or equal to to');
  }

  const dayCount =
    Math.floor((to.date.getTime() - from.date.getTime()) / 86400000) + 1;

  if (dayCount > MAX_RANGE_DAYS) {
    throw new BadRequestException(
      `Meal plan ranges are limited to ${MAX_RANGE_DAYS} days`,
    );
  }

  return {
    from: from.key,
    to: to.key,
    fromDate: from.date,
    toDate: to.date,
  };
}

function getRecipeScale(event: SharedMealEvent, recipe: BaseRecipe) {
  const servings = event.servings && event.servings > 0 ? event.servings : 1;
  return servings / Math.max(recipe.servings, 1);
}

@Injectable()
export class MealPlanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recipeService: RecipeService,
    private readonly userContextService: UserContextService,
    private readonly cartService: CartService,
  ) {}

  async getRangePlan(
    query: MealPlanRangeQueryDto,
    actorUserId?: string,
  ): Promise<MealPlanRange> {
    const actor = await this.userContextService.resolveActorUser(actorUserId);
    const range = normalizeRange(query);
    const events = await this.findEventsInRange(actor.id, range);

    return this.buildRange(actor.id, range, events);
  }

  async listEvents(
    query: MealPlanRangeQueryDto,
    actorUserId?: string,
  ): Promise<MealEventWithRecipe[]> {
    const actor = await this.userContextService.resolveActorUser(actorUserId);
    const range = normalizeRange(query);
    const events = await this.findEventsInRange(actor.id, range);

    return this.hydrateEvents(events, actor.id);
  }

  async createEvent(
    input: CreateMealEventDto,
    actorUserId?: string,
  ): Promise<MealEventWithRecipe> {
    const actor = await this.userContextService.resolveActorUser(actorUserId);
    const normalizedDate = parseDateKey(input.date, 'date');
    const recipe = await this.resolveRecipe(input.recipe_id, actor.id);
    const title = this.resolveEventTitle(
      input.title,
      recipe,
      input.source_type,
    );
    const sortOrder =
      input.sort_order ??
      (await this.getNextSortOrder(actor.id, normalizedDate.key));

    const created = await this.prisma.mealEvent.create({
      data: {
        userId: actor.id,
        date: normalizedDate.date,
        sortOrder,
        mealLabel: input.meal_label ?? 'dinner',
        customLabel: input.custom_label?.trim() || null,
        sourceType: input.source_type ?? (recipe ? 'recipe' : 'manual'),
        recipeId: recipe?.id ?? null,
        title,
        servings: input.servings ?? recipe?.servings ?? 1,
        status: input.status ?? 'planned',
        locked: input.locked ?? false,
        notes: input.notes?.trim() || null,
      },
    });

    return (await this.hydrateEvents([created], actor.id))[0]!;
  }

  async updateEvent(
    id: string,
    input: UpdateMealEventDto,
    actorUserId?: string,
  ): Promise<MealEventWithRecipe> {
    const actor = await this.userContextService.resolveActorUser(actorUserId);
    const existing = await this.prisma.mealEvent.findFirst({
      where: { id, userId: actor.id },
    });

    if (!existing) {
      throw new NotFoundException(`Meal event ${id} not found`);
    }

    const normalizedDate = input.date
      ? parseDateKey(input.date, 'date')
      : undefined;
    const recipe =
      input.recipe_id === undefined
        ? undefined
        : await this.resolveRecipe(input.recipe_id || undefined, actor.id);
    const nextSourceType =
      input.source_type ?? (recipe ? 'recipe' : existing.sourceType);
    const nextTitle =
      input.title !== undefined
        ? this.resolveEventTitle(input.title, recipe ?? null, nextSourceType)
        : recipe
          ? recipe.name
          : undefined;

    const updated = await this.prisma.mealEvent.update({
      where: { id },
      data: {
        date: normalizedDate?.date,
        sortOrder: input.sort_order,
        mealLabel: input.meal_label,
        customLabel:
          input.custom_label === undefined
            ? undefined
            : input.custom_label.trim() || null,
        sourceType: input.source_type,
        recipeId:
          input.recipe_id === undefined ? undefined : (recipe?.id ?? null),
        title: nextTitle,
        servings: input.servings,
        status: input.status,
        locked: input.locked,
        notes:
          input.notes === undefined ? undefined : input.notes.trim() || null,
      },
    });

    return (await this.hydrateEvents([updated], actor.id))[0]!;
  }

  async deleteEvent(id: string, actorUserId?: string) {
    const actor = await this.userContextService.resolveActorUser(actorUserId);
    const deleted = await this.prisma.mealEvent.deleteMany({
      where: { id, userId: actor.id },
    });

    if (deleted.count === 0) {
      throw new NotFoundException(`Meal event ${id} not found`);
    }
  }

  async createCartFromPlan(
    input: CreateMealPlanCartDto,
    actorUserId?: string,
  ): Promise<GenerateMealPlanCartResponse> {
    const actor = await this.userContextService.resolveActorUser(actorUserId);
    const range = normalizeRange(input);
    const events = await this.findEventsInRange(
      actor.id,
      range,
      input.event_ids,
    );
    const plannedRecipeEvents = (
      await this.hydrateEvents(events, actor.id)
    ).filter((event) => event.recipe_id && event.recipe);

    if (plannedRecipeEvents.length === 0) {
      throw new BadRequestException('Choose at least one planned recipe');
    }

    const selections: CartSelection[] = plannedRecipeEvents.map((event) => ({
      recipe_id: event.recipe_id!,
      recipe_type: 'base',
      quantity: 1,
      servings_override:
        event.recipe &&
        event.servings &&
        event.servings !== event.recipe.servings
          ? event.servings
          : undefined,
    }));

    const cart = await this.cartService.createCart(
      {
        name: `Meal plan ${range.from} to ${range.to}`,
        retailer: input.retailer,
        selections,
      },
      actor.id,
    );

    return {
      id: cart.id,
      cart_id: cart.id,
      resource_id: cart.id,
    };
  }

  async getWeekPlan(
    weekStart: string,
    actorUserId?: string,
  ): Promise<MealPlan> {
    const actor = await this.userContextService.resolveActorUser(actorUserId);
    const normalizedWeek = normalizeWeekStart(weekStart);
    const range = {
      from: normalizedWeek.key,
      to: toDateKey(addDays(normalizedWeek.date, 6)),
      fromDate: normalizedWeek.date,
      toDate: addDays(normalizedWeek.date, 6),
    };
    const events = await this.findEventsInRange(actor.id, range);

    return this.mapEventsToLegacyWeek(actor.id, normalizedWeek.key, events);
  }

  async upsertWeekPlan(
    weekStart: string,
    input: UpsertMealPlanDto,
    actorUserId?: string,
  ): Promise<MealPlan> {
    const actor = await this.userContextService.resolveActorUser(actorUserId);
    const normalizedWeek = normalizeWeekStart(weekStart);
    const days = this.normalizeLegacyDays(input.days);
    await this.assertRecipesVisible(days, actor.id);

    const rangeEnd = addDays(normalizedWeek.date, 6);
    await this.prisma.$transaction(async (tx) => {
      await tx.mealEvent.deleteMany({
        where: {
          userId: actor.id,
          date: {
            gte: normalizedWeek.date,
            lte: rangeEnd,
          },
        },
      });

      const data = days.flatMap((day, dayIndex) =>
        LEGACY_LABELS.flatMap((label, sortOrder) => {
          const recipeId = day[label];
          if (!recipeId) {
            return [];
          }

          return [
            {
              userId: actor.id,
              date: addDays(normalizedWeek.date, dayIndex),
              sortOrder,
              mealLabel: label,
              sourceType: 'recipe',
              recipeId,
              title: label[0]!.toUpperCase() + label.slice(1),
              servings: 1,
              status: 'planned',
              locked: false,
            },
          ];
        }),
      );

      if (data.length > 0) {
        await tx.mealEvent.createMany({ data });
      }
    });

    return this.getWeekPlan(weekStart, actor.id);
  }

  private async findEventsInRange(
    userId: string,
    range: DateRange,
    eventIds?: string[],
  ) {
    return this.prisma.mealEvent.findMany({
      where: {
        userId,
        date: {
          gte: range.fromDate,
          lte: range.toDate,
        },
        id: eventIds?.length ? { in: eventIds } : undefined,
      },
      orderBy: [{ date: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  private async buildRange(
    userId: string,
    range: DateRange,
    eventRows: PrismaMealEvent[],
  ): Promise<MealPlanRange> {
    const events = await this.hydrateEvents(eventRows, userId);
    const dayCount =
      Math.floor(
        (range.toDate.getTime() - range.fromDate.getTime()) / 86400000,
      ) + 1;
    const days = Array.from({ length: dayCount }, (_, index) => {
      const date = toDateKey(addDays(range.fromDate, index));
      return {
        date,
        events: events.filter((event) => event.date === date),
      };
    });

    return {
      from: range.from,
      to: range.to,
      days,
      events,
      grocery_summary: this.buildGrocerySummary(events),
      nutrition_summary: this.buildNutritionSummary(events),
    };
  }

  private async hydrateEvents(
    rows: PrismaMealEvent[],
    actorUserId: string,
  ): Promise<MealEventWithRecipe[]> {
    const recipeIds = Array.from(
      new Set(
        rows
          .map((row) => row.recipeId)
          .filter((id): id is string => Boolean(id)),
      ),
    );
    const recipes = recipeIds.length
      ? await this.recipeService.findManyByIds(recipeIds, actorUserId)
      : [];
    const recipesById = new Map(recipes.map((recipe) => [recipe.id, recipe]));

    return rows.map((row) => {
      const event = this.mapEvent(row);
      return {
        ...event,
        recipe: event.recipe_id
          ? (recipesById.get(event.recipe_id) ?? null)
          : null,
      };
    });
  }

  private mapEvent(row: PrismaMealEvent): SharedMealEvent {
    return {
      id: row.id,
      user_id: row.userId,
      date: toDateKey(row.date),
      meal_label: row.mealLabel as MealPlanMealLabel,
      custom_label: row.customLabel,
      source_type: row.sourceType as MealPlanSourceType,
      recipe_id: row.recipeId,
      title: row.title,
      servings: row.servings,
      status: row.status as MealPlanEventStatus,
      locked: row.locked,
      notes: row.notes,
      created_at: row.createdAt.toISOString(),
      updated_at: row.updatedAt.toISOString(),
    };
  }

  private async resolveRecipe(
    recipeId: string | undefined,
    actorUserId: string,
  ) {
    if (!recipeId) {
      return null;
    }

    const recipes = await this.recipeService.findManyByIds(
      [recipeId],
      actorUserId,
    );
    const recipe = recipes[0];

    if (!recipe) {
      throw new BadRequestException('recipe_id is invalid');
    }

    return recipe;
  }

  private resolveEventTitle(
    title: string | undefined,
    recipe: BaseRecipe | null,
    sourceType: string | undefined,
  ) {
    const trimmedTitle = title?.trim();
    const resolved = trimmedTitle || recipe?.name;

    if (!resolved) {
      throw new BadRequestException(
        sourceType === 'recipe'
          ? 'recipe_id or title is required'
          : 'title is required',
      );
    }

    return resolved;
  }

  private async getNextSortOrder(userId: string, dateKey: string) {
    const normalizedDate = parseDateKey(dateKey, 'date');
    const aggregate = await this.prisma.mealEvent.aggregate({
      where: { userId, date: normalizedDate.date },
      _max: { sortOrder: true },
    });

    return (aggregate._max.sortOrder ?? -1) + 1;
  }

  private buildGrocerySummary(events: MealEventWithRecipe[]) {
    const groceryMap = new Map<
      string,
      {
        canonical_ingredient: string;
        display_ingredient?: string;
        amount: number;
        unit: string;
        event_ids: string[];
      }
    >();

    for (const event of events) {
      if (!event.recipe) {
        continue;
      }

      const scale = getRecipeScale(event, event.recipe);

      for (const ingredient of event.recipe.ingredients) {
        if (ingredient.amount === undefined || !ingredient.unit) {
          continue;
        }

        const key = `${ingredient.canonical_ingredient}::${ingredient.unit}`;
        const existing = groceryMap.get(key);
        const amount = ingredient.amount * scale;

        if (existing) {
          existing.amount += amount;
          existing.event_ids = Array.from(
            new Set([...existing.event_ids, event.id]),
          );
        } else {
          groceryMap.set(key, {
            canonical_ingredient: ingredient.canonical_ingredient,
            display_ingredient: ingredient.display_ingredient,
            amount,
            unit: ingredient.unit,
            event_ids: [event.id],
          });
        }
      }
    }

    return Array.from(groceryMap.values()).sort((left, right) =>
      left.canonical_ingredient.localeCompare(right.canonical_ingredient),
    );
  }

  private buildNutritionSummary(events: MealEventWithRecipe[]) {
    return events.reduce(
      (summary, event) => {
        if (!event.recipe?.nutrition_data) {
          return summary;
        }

        const scale = getRecipeScale(event, event.recipe);

        return {
          calories:
            summary.calories +
            (event.recipe.nutrition_data.calories ?? 0) * scale,
          protein_g:
            summary.protein_g +
            (event.recipe.nutrition_data.protein_g ?? 0) * scale,
          carbs_g:
            summary.carbs_g +
            (event.recipe.nutrition_data.carbs_g ?? 0) * scale,
          fat_g:
            summary.fat_g + (event.recipe.nutrition_data.fat_g ?? 0) * scale,
        };
      },
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
    );
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

  private normalizeLegacyDays(input: UpsertMealPlanDto['days']): MealPlanDay[] {
    if (!Array.isArray(input) || input.length !== 7) {
      throw new BadRequestException('days must contain exactly seven entries');
    }

    return input.map((day) => ({
      breakfast: day.breakfast?.trim() || undefined,
      lunch: day.lunch?.trim() || undefined,
      dinner: day.dinner?.trim() || undefined,
    }));
  }

  private mapEventsToLegacyWeek(
    userId: string,
    weekStart: string,
    events: PrismaMealEvent[],
  ): MealPlan {
    const weekStartDate = parseDateKey(weekStart, 'week_start').date;
    const days = buildEmptyWeekPlan();

    for (const row of events) {
      if (!LEGACY_LABELS.includes(row.mealLabel as MealPlanMealLabel)) {
        continue;
      }

      const dayIndex = Math.floor(
        (row.date.getTime() - weekStartDate.getTime()) / 86400000,
      );

      if (dayIndex < 0 || dayIndex > 6 || !row.recipeId) {
        continue;
      }

      days[dayIndex] = {
        ...days[dayIndex],
        [row.mealLabel]: row.recipeId,
      };
    }

    return {
      user_id: userId,
      week_start: weekStart,
      days,
    };
  }
}
