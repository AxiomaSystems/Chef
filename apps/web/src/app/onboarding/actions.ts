"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_TOKEN_COOKIE, buildApiUrl } from "@/lib/auth";
import type {
  AvailableAppliance,
  BiggestCookingFrustration,
  CalorieTrackingMode,
  CookingSkillLevel,
  DislikedIngredient,
  DislikedTexture,
  FavoriteFlavor,
  FavoriteProtein,
  GoalPriority,
  HouseholdSize,
  KidsProfile,
  PreferredCookingTime,
  PreferredStore,
  RecipeDiscoverySource,
  ShoppingMode,
  SpiceLevel,
  TypicalMealTime,
  UpdateUserProfileMemoryRequest,
  UserGoalKind,
  WeeklyBudget,
} from "@cart/shared";
import {
  DISLIKED_INGREDIENT_LABELS,
  DISLIKED_TEXTURE_LABELS,
} from "@/components/onboarding/labels";

export type OnboardingActionState = {
  error?: string;
};

export type SavePreferencesInput = {
  preferred_cuisine_ids: string[];
  preferred_tag_ids: string[];
  shopping_location_zip: string;
  shopping_location_label: string;
  shopping_location_kroger_location_id: string;
  household_size: HouseholdSize | null;
  kids_profile: KidsProfile | null;
  favorite_proteins: FavoriteProtein[];
  favorite_flavors: FavoriteFlavor[];
  spice_level: SpiceLevel | null;
  disliked_ingredients: DislikedIngredient[];
  disliked_textures: DislikedTexture[];
  cooking_skill_level: CookingSkillLevel | null;
  available_appliances: AvailableAppliance[];
  preferred_cooking_time: PreferredCookingTime | null;
  typical_meal_times: TypicalMealTime[];
  goal_priorities: GoalPriority[];
  calorie_tracking_mode: CalorieTrackingMode | null;
  weekly_budget: WeeklyBudget | null;
  preferred_stores: PreferredStore[];
  shopping_mode: ShoppingMode | null;
  recipe_discovery_sources: RecipeDiscoverySource[];
  biggest_cooking_frustration: BiggestCookingFrustration | null;
};

async function callAuthedJson(path: string, init?: RequestInit) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!accessToken) {
    redirect("/login");
  }

  return fetch(buildApiUrl(path), {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
}

const LEGACY_GOAL_TO_MEMORY_GOAL: Record<GoalPriority, UserGoalKind> = {
  save_money: "save_money",
  eat_healthier: "eat_healthier",
  lose_weight: "eat_healthier",
  build_muscle: "hit_protein",
  reduce_food_waste: "reduce_waste",
  try_new_cuisines: "try_new_foods",
  cook_faster: "save_time",
  eat_more_plant_based: "eat_healthier",
};

function buildProfileMemoryRequest(
  input: SavePreferencesInput,
): UpdateUserProfileMemoryRequest {
  const uniqueGoals = Array.from(
    new Set(
      input.goal_priorities.map((goal) => LEGACY_GOAL_TO_MEMORY_GOAL[goal]),
    ),
  );

  return {
    preferences: {
      preferred_cuisine_ids: input.preferred_cuisine_ids,
      preferred_tag_ids: input.preferred_tag_ids,
      shopping_location: {
        zip_code: input.shopping_location_zip || undefined,
        label: input.shopping_location_label || undefined,
        kroger_location_id:
          input.shopping_location_kroger_location_id || undefined,
      },
      household_size: input.household_size ?? undefined,
      kids_profile: input.kids_profile ?? undefined,
      favorite_proteins: input.favorite_proteins,
      favorite_flavors: input.favorite_flavors,
      spice_level: input.spice_level ?? undefined,
      cooking_skill_level: input.cooking_skill_level ?? undefined,
      available_appliances: input.available_appliances,
      preferred_cooking_time: input.preferred_cooking_time ?? undefined,
      typical_meal_times: input.typical_meal_times,
      calorie_tracking_mode: input.calorie_tracking_mode ?? undefined,
      weekly_budget: input.weekly_budget ?? undefined,
      preferred_stores: input.preferred_stores,
      shopping_mode: input.shopping_mode ?? undefined,
      recipe_discovery_sources: input.recipe_discovery_sources,
      biggest_cooking_frustration:
        input.biggest_cooking_frustration ?? undefined,
    },
    food_rules: [
      ...input.disliked_ingredients.map((ingredient) => ({
        kind: "ingredient_preference" as const,
        label: DISLIKED_INGREDIENT_LABELS[ingredient],
        action: "dislike" as const,
        strictness: "soft" as const,
        active: true,
        source: "onboarding" as const,
        confidence: "high" as const,
      })),
      ...input.disliked_textures.map((texture) => ({
        kind: "texture_preference" as const,
        label: DISLIKED_TEXTURE_LABELS[texture],
        action: "dislike" as const,
        strictness: "soft" as const,
        active: true,
        source: "onboarding" as const,
        confidence: "high" as const,
      })),
    ],
    goals: uniqueGoals.map((goal, index) => ({
      goal,
      priority: Math.min(index + 1, 5),
      active: true,
      timeframe: "default",
      source: "onboarding",
      confidence: "high",
    })),
  };
}

export async function savePreferencesAndCompleteAction(
  input: SavePreferencesInput,
): Promise<OnboardingActionState> {
  const profileMemoryResponse = await callAuthedJson("/me/profile-memory", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildProfileMemoryRequest(input)),
  }).catch(() => null);

  if (!profileMemoryResponse?.ok) {
    return { error: "Unable to save your Chef memory right now." };
  }

  const completionResponse = await callAuthedJson("/me/onboarding/complete", {
    method: "POST",
  }).catch(() => null);

  if (!completionResponse?.ok) {
    return {
      error:
        "Preferences were saved, but onboarding could not be completed.",
    };
  }

  redirect("/dashboard");
}

export async function skipOnboardingAction() {
  const completionResponse = await callAuthedJson("/me/onboarding/complete", {
    method: "POST",
  }).catch(() => null);

  if (!completionResponse?.ok) {
    redirect("/onboarding?error=skip-failed");
    return;
  }

  redirect("/dashboard");
}
