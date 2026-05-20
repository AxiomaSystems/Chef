import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type {
  ChefMemorySummary,
  UserFoodRule as SharedUserFoodRule,
  UserGoal as SharedUserGoal,
  UserGoalTimeframe,
  UserPantryStaple as SharedUserPantryStaple,
  UserPreferences,
  UserProfileMemory,
} from '@cart/shared';
import {
  Prisma,
  UserMemoryConfidence,
  UserMemorySource,
} from '../../generated/prisma/index.js';
import { PrismaService } from '../prisma/prisma.service';
import {
  ProfileMemoryPreferencesPatchDto,
  UpdateProfileMemoryDto,
} from './dto/update-profile-memory.dto';
import { MeService } from './me.service';
import {
  assertFoodRuleSafety,
  buildFoodRuleDedupeKey,
  fromPrismaGoalTimeframe,
  isMemoryCurrentlyActive,
  normalizeMemoryLabel,
  toPrismaGoalTimeframe,
} from './profile-memory.utils';

type FoodRuleWithRelations = Prisma.UserFoodRuleGetPayload<{
  include: {
    ingredient: { select: { canonicalName: true } };
    tag: { select: { name: true } };
  };
}>;

type PantryStapleWithIngredient = Prisma.UserPantryStapleGetPayload<{
  include: { ingredient: { select: { canonicalName: true } } };
}>;

@Injectable()
export class ProfileMemoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly meService: MeService,
  ) {}

  async getProfileMemory(userId: string): Promise<UserProfileMemory> {
    const [user, preferences, foodRules, goals, pantryStaples] =
      await Promise.all([
        this.meService.getProfile(userId),
        this.meService.getPreferences(userId),
        this.prisma.userFoodRule.findMany({
          where: { userId },
          include: {
            ingredient: { select: { canonicalName: true } },
            tag: { select: { name: true } },
          },
          orderBy: [{ strictness: 'desc' }, { createdAt: 'asc' }],
        }),
        this.prisma.userGoal.findMany({
          where: { userId },
          orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
        }),
        this.prisma.userPantryStaple.findMany({
          where: { userId },
          include: { ingredient: { select: { canonicalName: true } } },
          orderBy: { createdAt: 'asc' },
        }),
      ]);

    const mappedFoodRules = foodRules.map((rule) => this.mapFoodRule(rule));
    const mappedGoals = goals.map((goal) => this.mapGoal(goal));
    const mappedPantryStaples = pantryStaples.map((staple) =>
      this.mapPantryStaple(staple),
    );

    return {
      user,
      preferences,
      food_rules: mappedFoodRules,
      goals: mappedGoals,
      pantry_staples: mappedPantryStaples,
      summary: this.buildSummary({
        preferences,
        foodRules: mappedFoodRules,
        goals: mappedGoals,
        pantryStaples: mappedPantryStaples,
      }),
    };
  }

  async updateProfileMemory(
    userId: string,
    input: UpdateProfileMemoryDto,
  ): Promise<UserProfileMemory> {
    await this.meService.getProfile(userId);

    const foodRules = input.food_rules ?? [];
    const goals = input.goals ?? [];
    const pantryStapleIngredientIds = input.pantry_staple_ingredient_ids?.map(
      (id) => id.trim(),
    );

    await this.validateFoodRuleCatalogReferences(foodRules);
    await this.validatePantryStapleIngredients(pantryStapleIngredientIds);

    await this.prisma.$transaction(async (tx) => {
      if (input.preferences) {
        await this.applyPreferencePatch(tx, userId, input.preferences);
      }

      for (const rule of foodRules) {
        const source = rule.source ?? UserMemorySource.onboarding;
        const confidence =
          rule.confidence ??
          (source === UserMemorySource.inferred ||
          source === UserMemorySource.behavior
            ? UserMemoryConfidence.low
            : UserMemoryConfidence.high);
        const active = rule.active ?? true;
        const normalizedLabel = normalizeMemoryLabel(rule.label);

        if (!normalizedLabel) {
          throw new BadRequestException('Food rule label is required');
        }

        if (rule.ingredient_id && rule.tag_id) {
          throw new BadRequestException(
            'Food rules can reference either ingredient_id or tag_id, not both',
          );
        }

        assertFoodRuleSafety({
          kind: rule.kind,
          action: rule.action,
          strictness: rule.strictness,
          source,
          confidence,
        });

        const dedupeKey = buildFoodRuleDedupeKey({
          kind: rule.kind,
          action: rule.action,
          normalizedLabel,
          ingredientId: rule.ingredient_id,
          tagId: rule.tag_id,
        });

        const data = {
          kind: rule.kind,
          label: rule.label.trim(),
          normalizedLabel,
          dedupeKey,
          ingredientId: rule.ingredient_id ?? null,
          tagId: rule.tag_id ?? null,
          action: rule.action,
          strictness: rule.strictness,
          active,
          startsAt: rule.starts_at ? new Date(rule.starts_at) : null,
          expiresAt: rule.expires_at ? new Date(rule.expires_at) : null,
          source,
          confidence,
          notes: rule.notes?.trim() || null,
        };

        this.assertTemporalRange(data.startsAt, data.expiresAt);

        await tx.userFoodRule.upsert({
          where: {
            userId_dedupeKey: {
              userId,
              dedupeKey,
            },
          },
          create: {
            userId,
            ...data,
          },
          update: data,
        });
      }

      for (const goal of goals) {
        const source = goal.source ?? UserMemorySource.onboarding;
        const confidence =
          goal.confidence ??
          (source === UserMemorySource.inferred ||
          source === UserMemorySource.behavior
            ? UserMemoryConfidence.low
            : UserMemoryConfidence.high);
        const timeframe = toPrismaGoalTimeframe(goal.timeframe);
        const startsAt = goal.starts_at ? new Date(goal.starts_at) : null;
        const expiresAt = goal.expires_at ? new Date(goal.expires_at) : null;

        this.assertTemporalRange(startsAt, expiresAt);

        if (source === UserMemorySource.behavior && confidence !== 'low') {
          throw new BadRequestException(
            'Behavior goals can only be written with low confidence',
          );
        }

        await tx.userGoal.upsert({
          where: {
            userId_goal_timeframe: {
              userId,
              goal: goal.goal,
              timeframe,
            },
          },
          create: {
            userId,
            goal: goal.goal,
            priority: goal.priority,
            active: goal.active ?? true,
            startsAt,
            expiresAt,
            timeframe,
            source,
            confidence,
          },
          update: {
            priority: goal.priority,
            active: goal.active ?? true,
            startsAt,
            expiresAt,
            source,
            confidence,
          },
        });
      }

      if (pantryStapleIngredientIds) {
        await tx.userPantryStaple.deleteMany({ where: { userId } });

        if (pantryStapleIngredientIds.length > 0) {
          await tx.userPantryStaple.createMany({
            data: pantryStapleIngredientIds.map((ingredientId) => ({
              userId,
              ingredientId,
              source: UserMemorySource.onboarding,
              confidence: UserMemoryConfidence.high,
            })),
            skipDuplicates: true,
          });
        }
      }
    });

    return this.getProfileMemory(userId);
  }

  private async validateFoodRuleCatalogReferences(
    foodRules: NonNullable<UpdateProfileMemoryDto['food_rules']>,
  ) {
    const ingredientIds = Array.from(
      new Set(
        foodRules.flatMap((rule) =>
          rule.ingredient_id ? [rule.ingredient_id] : [],
        ),
      ),
    );
    const tagIds = Array.from(
      new Set(foodRules.flatMap((rule) => (rule.tag_id ? [rule.tag_id] : []))),
    );

    const [ingredientCount, tagCount] = await Promise.all([
      ingredientIds.length > 0
        ? this.prisma.ingredient.count({ where: { id: { in: ingredientIds } } })
        : Promise.resolve(0),
      tagIds.length > 0
        ? this.prisma.tag.count({ where: { id: { in: tagIds } } })
        : Promise.resolve(0),
    ]);

    if (ingredientCount !== ingredientIds.length) {
      throw new BadRequestException(
        'One or more ingredient_id values are invalid',
      );
    }

    if (tagCount !== tagIds.length) {
      throw new BadRequestException('One or more tag_id values are invalid');
    }
  }

  private async validatePantryStapleIngredients(ingredientIds?: string[]) {
    if (!ingredientIds) {
      return;
    }

    const normalizedIds = ingredientIds.map((id) => id.trim()).filter(Boolean);

    if (normalizedIds.length !== ingredientIds.length) {
      throw new BadRequestException(
        'pantry_staple_ingredient_ids cannot contain empty ids',
      );
    }

    const ingredientCount =
      normalizedIds.length > 0
        ? await this.prisma.ingredient.count({
            where: { id: { in: normalizedIds } },
          })
        : 0;

    if (ingredientCount !== normalizedIds.length) {
      throw new BadRequestException(
        'One or more pantry_staple_ingredient_ids are invalid',
      );
    }
  }

  private async applyPreferencePatch(
    tx: Prisma.TransactionClient,
    userId: string,
    preferences: ProfileMemoryPreferencesPatchDto,
  ) {
    const userData: Prisma.UserUpdateInput = {};

    if (preferences.shopping_location) {
      const shoppingLocation = preferences.shopping_location;
      userData.preferredZipCode = shoppingLocation.zip_code?.trim() || null;
      userData.preferredLocationLabel = shoppingLocation.label?.trim() || null;
      userData.preferredLatitude = shoppingLocation.latitude ?? null;
      userData.preferredLongitude = shoppingLocation.longitude ?? null;
      userData.preferredKrogerLocationId =
        shoppingLocation.kroger_location_id?.trim() || null;
    }

    if (preferences.household_size !== undefined) {
      userData.householdSize = preferences.household_size;
    }

    if (preferences.kids_profile !== undefined) {
      userData.kidsProfile = preferences.kids_profile;
    }

    if (preferences.favorite_proteins !== undefined) {
      userData.favoriteProteins = this.buildJsonArrayInput(
        preferences.favorite_proteins,
      );
    }

    if (preferences.favorite_flavors !== undefined) {
      userData.favoriteFlavors = this.buildJsonArrayInput(
        preferences.favorite_flavors,
      );
    }

    if (preferences.spice_level !== undefined) {
      userData.spiceLevel = preferences.spice_level;
    }

    if (preferences.cooking_skill_level !== undefined) {
      userData.cookingSkillLevel = preferences.cooking_skill_level;
    }

    if (preferences.available_appliances !== undefined) {
      userData.availableAppliances = this.buildJsonArrayInput(
        preferences.available_appliances,
      );
    }

    if (preferences.preferred_cooking_time !== undefined) {
      userData.preferredCookingTime = preferences.preferred_cooking_time;
    }

    if (preferences.typical_meal_times !== undefined) {
      userData.typicalMealTimes = this.buildJsonArrayInput(
        preferences.typical_meal_times,
      );
    }

    if (preferences.calorie_tracking_mode !== undefined) {
      userData.calorieTrackingMode = preferences.calorie_tracking_mode;
    }

    if (preferences.weekly_nutrition_targets !== undefined) {
      userData.weeklyNutritionTargets = this.buildWeeklyNutritionTargetsInput(
        preferences.weekly_nutrition_targets,
      );
    }

    if (preferences.weekly_budget !== undefined) {
      userData.weeklyBudget = preferences.weekly_budget;
    }

    if (preferences.preferred_stores !== undefined) {
      userData.preferredStores = this.buildJsonArrayInput(
        preferences.preferred_stores,
      );
    }

    if (preferences.shopping_mode !== undefined) {
      userData.shoppingMode = preferences.shopping_mode;
    }

    if (preferences.recipe_discovery_sources !== undefined) {
      userData.recipeDiscoverySources = this.buildJsonArrayInput(
        preferences.recipe_discovery_sources,
      );
    }

    if (preferences.biggest_cooking_frustration !== undefined) {
      userData.biggestCookingFrustration =
        preferences.biggest_cooking_frustration;
    }

    if (Object.keys(userData).length > 0) {
      await tx.user.update({
        where: { id: userId },
        data: userData,
      });
    }

    if (preferences.preferred_cuisine_ids !== undefined) {
      await this.replacePreferredCuisines(
        tx,
        userId,
        preferences.preferred_cuisine_ids,
      );
    }

    if (preferences.preferred_tag_ids !== undefined) {
      await this.replacePreferredTags(
        tx,
        userId,
        preferences.preferred_tag_ids,
      );
    }
  }

  private buildJsonArrayInput(values: string[]): Prisma.InputJsonValue {
    return Array.from(
      new Set(values.map((value) => value.trim()).filter(Boolean)),
    );
  }

  private buildWeeklyNutritionTargetsInput(value: {
    calories?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
  }): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
    const targets = Object.fromEntries(
      Object.entries(value).filter(([, target]) => target !== undefined),
    );

    return Object.keys(targets).length > 0
      ? (targets as Prisma.InputJsonValue)
      : Prisma.JsonNull;
  }

  private async replacePreferredCuisines(
    tx: Prisma.TransactionClient,
    userId: string,
    cuisineIds: string[],
  ) {
    const ids = Array.from(new Set(cuisineIds.map((id) => id.trim())));

    if (ids.some((id) => !id)) {
      throw new BadRequestException(
        'preferred_cuisine_ids cannot contain empty ids',
      );
    }

    const cuisineCount =
      ids.length > 0
        ? await tx.cuisine.count({ where: { id: { in: ids } } })
        : 0;

    if (cuisineCount !== ids.length) {
      throw new BadRequestException(
        'One or more preferred_cuisine_ids are invalid',
      );
    }

    await tx.userPreferredCuisine.deleteMany({ where: { userId } });

    if (ids.length > 0) {
      await tx.userPreferredCuisine.createMany({
        data: ids.map((cuisineId) => ({ userId, cuisineId })),
      });
    }
  }

  private async replacePreferredTags(
    tx: Prisma.TransactionClient,
    userId: string,
    tagIds: string[],
  ) {
    const ids = Array.from(new Set(tagIds.map((id) => id.trim())));

    if (ids.some((id) => !id)) {
      throw new BadRequestException(
        'preferred_tag_ids cannot contain empty ids',
      );
    }

    const tags =
      ids.length > 0
        ? await tx.tag.findMany({ where: { id: { in: ids } } })
        : [];

    if (tags.length !== ids.length) {
      throw new BadRequestException(
        'One or more preferred_tag_ids are invalid',
      );
    }

    const nonSystemTag = tags.find((tag) => tag.scope !== 'system');

    if (nonSystemTag) {
      throw new ForbiddenException(
        'Preferences currently support only shared system tags',
      );
    }

    await tx.userPreferredTag.deleteMany({ where: { userId } });

    if (ids.length > 0) {
      await tx.userPreferredTag.createMany({
        data: ids.map((tagId) => ({ userId, tagId })),
      });
    }
  }

  private assertTemporalRange(startsAt: Date | null, expiresAt: Date | null) {
    if (startsAt && expiresAt && startsAt >= expiresAt) {
      throw new BadRequestException('starts_at must be before expires_at');
    }
  }

  private mapFoodRule(rule: FoodRuleWithRelations): SharedUserFoodRule {
    return {
      id: rule.id,
      kind: rule.kind,
      label: rule.label,
      normalized_label: rule.normalizedLabel,
      ingredient_id: rule.ingredientId ?? undefined,
      tag_id: rule.tagId ?? undefined,
      action: rule.action,
      strictness: rule.strictness,
      active: rule.active,
      starts_at: rule.startsAt?.toISOString(),
      expires_at: rule.expiresAt?.toISOString(),
      source: rule.source,
      confidence: rule.confidence,
      notes: rule.notes ?? undefined,
      created_at: rule.createdAt.toISOString(),
      updated_at: rule.updatedAt.toISOString(),
    };
  }

  private mapGoal(goal: Prisma.UserGoalGetPayload<object>): SharedUserGoal {
    return {
      id: goal.id,
      goal: goal.goal,
      priority: goal.priority,
      active: goal.active,
      starts_at: goal.startsAt?.toISOString(),
      expires_at: goal.expiresAt?.toISOString(),
      timeframe: fromPrismaGoalTimeframe(goal.timeframe),
      source: goal.source,
      confidence: goal.confidence,
      created_at: goal.createdAt.toISOString(),
      updated_at: goal.updatedAt.toISOString(),
    };
  }

  private mapPantryStaple(
    staple: PantryStapleWithIngredient,
  ): SharedUserPantryStaple {
    return {
      ingredient_id: staple.ingredientId,
      canonical_name: staple.ingredient.canonicalName,
      source: staple.source,
      confidence: staple.confidence,
      created_at: staple.createdAt.toISOString(),
      updated_at: staple.updatedAt.toISOString(),
    };
  }

  private buildSummary(input: {
    preferences: UserPreferences;
    foodRules: SharedUserFoodRule[];
    goals: SharedUserGoal[];
    pantryStaples: SharedUserPantryStaple[];
  }): ChefMemorySummary {
    const activeFoodRules = input.foodRules.filter((rule) =>
      isMemoryCurrentlyActive({
        active: rule.active,
        startsAt: rule.starts_at ? new Date(rule.starts_at) : null,
        expiresAt: rule.expires_at ? new Date(rule.expires_at) : null,
      }),
    );
    const activeGoals = input.goals
      .filter((goal) =>
        isMemoryCurrentlyActive({
          active: goal.active,
          startsAt: goal.starts_at ? new Date(goal.starts_at) : null,
          expiresAt: goal.expires_at ? new Date(goal.expires_at) : null,
        }),
      )
      .sort((left, right) => left.priority - right.priority);
    const hardRules = activeFoodRules.filter(
      (rule) => rule.strictness === 'hard',
    );
    const softRules = activeFoodRules.filter(
      (rule) => rule.strictness === 'soft',
    );
    const legacyRuleLabels = [
      ...(input.preferences.disliked_ingredients ?? []),
      ...(input.preferences.disliked_textures ?? []),
    ];
    const ruleLabels =
      activeFoodRules.length > 0
        ? activeFoodRules.map((rule) => rule.label)
        : legacyRuleLabels;

    const locationLabel =
      input.preferences.shopping_location?.label ??
      input.preferences.shopping_location?.zip_code;

    return {
      household: input.preferences.household_size
        ? {
            label: input.preferences.household_size,
            detail: input.preferences.kids_profile,
          }
        : undefined,
      taste: {
        cuisine_count: input.preferences.preferred_cuisine_ids.length,
        favorite_proteins: input.preferences.favorite_proteins ?? [],
        favorite_flavors: input.preferences.favorite_flavors ?? [],
        spice_level: input.preferences.spice_level,
      },
      rules: {
        hard_rule_count: hardRules.length,
        soft_rule_count:
          softRules.length > 0 ? softRules.length : legacyRuleLabels.length,
        labels: ruleLabels.slice(0, 8),
      },
      kitchen: {
        skill_level: input.preferences.cooking_skill_level,
        appliance_count: input.preferences.available_appliances?.length ?? 0,
        preferred_time: input.preferences.preferred_cooking_time,
      },
      pantry: {
        staple_count: input.pantryStaples.length,
        labels: input.pantryStaples
          .map((staple) => staple.canonical_name)
          .slice(0, 8),
      },
      goals:
        activeGoals.length > 0
          ? activeGoals.map((goal) => ({
              goal: goal.goal,
              priority: goal.priority,
              timeframe: goal.timeframe,
            }))
          : (input.preferences.goal_priorities ?? []).map((goal, index) => ({
              goal: this.mapLegacyGoal(goal),
              priority: index + 1,
              timeframe: 'default' as UserGoalTimeframe,
            })),
      shopping: {
        preferred_store_count: input.preferences.preferred_stores?.length ?? 0,
        shopping_mode: input.preferences.shopping_mode,
        location_label: locationLabel,
      },
      completion: {
        has_household: Boolean(input.preferences.household_size),
        has_taste:
          input.preferences.preferred_cuisine_ids.length > 0 ||
          Boolean(input.preferences.favorite_proteins?.length) ||
          Boolean(input.preferences.favorite_flavors?.length),
        has_rules: activeFoodRules.length > 0 || legacyRuleLabels.length > 0,
        has_kitchen:
          Boolean(input.preferences.cooking_skill_level) ||
          Boolean(input.preferences.available_appliances?.length),
        has_pantry: input.pantryStaples.length > 0,
        has_goals:
          activeGoals.length > 0 ||
          Boolean(input.preferences.goal_priorities?.length),
        has_shopping:
          Boolean(input.preferences.preferred_stores?.length) ||
          Boolean(input.preferences.shopping_mode),
        has_location: Boolean(input.preferences.shopping_location),
      },
    };
  }

  private mapLegacyGoal(goal: string) {
    const map: Record<string, SharedUserGoal['goal']> = {
      save_money: 'save_money',
      eat_healthier: 'eat_healthier',
      build_muscle: 'hit_protein',
      reduce_food_waste: 'reduce_waste',
      try_new_cuisines: 'try_new_foods',
      cook_faster: 'save_time',
    };

    return map[goal] ?? 'cook_more_at_home';
  }
}
