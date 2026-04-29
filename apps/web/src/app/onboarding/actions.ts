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
  WeeklyBudget,
} from "@cart/shared";

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

export async function savePreferencesAndCompleteAction(
  input: SavePreferencesInput,
): Promise<OnboardingActionState> {
  const body: Record<string, unknown> = {
    preferred_cuisine_ids: input.preferred_cuisine_ids,
    preferred_tag_ids: input.preferred_tag_ids,
    shopping_location: {
      zip_code: input.shopping_location_zip || undefined,
      label: input.shopping_location_label || undefined,
      kroger_location_id:
        input.shopping_location_kroger_location_id || undefined,
    },
  };

  if (input.household_size) body.household_size = input.household_size;
  if (input.kids_profile) body.kids_profile = input.kids_profile;
  if (input.favorite_proteins.length)
    body.favorite_proteins = input.favorite_proteins;
  if (input.favorite_flavors.length)
    body.favorite_flavors = input.favorite_flavors;
  if (input.spice_level) body.spice_level = input.spice_level;
  if (input.disliked_ingredients.length)
    body.disliked_ingredients = input.disliked_ingredients;
  if (input.disliked_textures.length)
    body.disliked_textures = input.disliked_textures;
  if (input.cooking_skill_level)
    body.cooking_skill_level = input.cooking_skill_level;
  if (input.available_appliances.length)
    body.available_appliances = input.available_appliances;
  if (input.preferred_cooking_time)
    body.preferred_cooking_time = input.preferred_cooking_time;
  if (input.typical_meal_times.length)
    body.typical_meal_times = input.typical_meal_times;
  if (input.goal_priorities.length)
    body.goal_priorities = input.goal_priorities;
  if (input.calorie_tracking_mode)
    body.calorie_tracking_mode = input.calorie_tracking_mode;
  if (input.weekly_budget) body.weekly_budget = input.weekly_budget;
  if (input.preferred_stores.length)
    body.preferred_stores = input.preferred_stores;
  if (input.shopping_mode) body.shopping_mode = input.shopping_mode;
  if (input.recipe_discovery_sources.length)
    body.recipe_discovery_sources = input.recipe_discovery_sources;
  if (input.biggest_cooking_frustration)
    body.biggest_cooking_frustration = input.biggest_cooking_frustration;

  const preferencesResponse = await callAuthedJson("/me/preferences", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null);

  if (!preferencesResponse?.ok) {
    return { error: "Unable to save your preferences right now." };
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
