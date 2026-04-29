"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_TOKEN_COOKIE, buildApiUrl } from "@/lib/auth";

export type OnboardingActionState = {
  error?: string;
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
  _previousState: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const preferredCuisineIds = formData
    .getAll("preferred_cuisine_ids")
    .map((value) => String(value));
  const preferredTagIds = formData
    .getAll("preferred_tag_ids")
    .map((value) => String(value));
  const shoppingLocationZipCode = String(
    formData.get("shopping_location_zip_code") ?? "",
  ).trim();
  const shoppingLocationLabel = String(
    formData.get("shopping_location_label") ?? "",
  ).trim();
  const shoppingLocationKrogerLocationId = String(
    formData.get("shopping_location_kroger_location_id") ?? "",
  ).trim();

  // ─── New onboarding fields ─────────────────────────────────────────────
  const householdSize = String(formData.get("household_size") ?? "").trim();
  const kidsProfile = String(formData.get("kids_profile") ?? "").trim();
  const favoriteProteins = formData
    .getAll("favorite_proteins")
    .map((v) => String(v).trim())
    .filter(Boolean);
  const favoriteFlavors = formData
    .getAll("favorite_flavors")
    .map((v) => String(v).trim())
    .filter(Boolean);
  const spiceLevel = String(formData.get("spice_level") ?? "").trim();
  const dislikedIngredients = formData
    .getAll("disliked_ingredients")
    .map((v) => String(v).trim())
    .filter(Boolean);
  const dislikedTextures = formData
    .getAll("disliked_textures")
    .map((v) => String(v).trim())
    .filter(Boolean);
  const cookingSkillLevel = String(
    formData.get("cooking_skill_level") ?? "",
  ).trim();
  const availableAppliances = formData
    .getAll("available_appliances")
    .map((v) => String(v).trim())
    .filter(Boolean);
  const preferredCookingTime = String(
    formData.get("preferred_cooking_time") ?? "",
  ).trim();
  const typicalMealTimes = formData
    .getAll("typical_meal_times")
    .map((v) => String(v).trim())
    .filter(Boolean);
  const goalPriorities = formData
    .getAll("goal_priorities")
    .map((v) => String(v).trim())
    .filter(Boolean);
  const calorieTrackingMode = String(
    formData.get("calorie_tracking_mode") ?? "",
  ).trim();
  const weeklyBudget = String(formData.get("weekly_budget") ?? "").trim();
  const preferredStores = formData
    .getAll("preferred_stores")
    .map((v) => String(v).trim())
    .filter(Boolean);
  const shoppingMode = String(formData.get("shopping_mode") ?? "").trim();
  const recipeDiscoverySources = formData
    .getAll("recipe_discovery_sources")
    .map((v) => String(v).trim())
    .filter(Boolean);
  const biggestCookingFrustration = String(
    formData.get("biggest_cooking_frustration") ?? "",
  ).trim();

  const preferencesResponse = await callAuthedJson("/me/preferences", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      preferred_cuisine_ids: preferredCuisineIds,
      preferred_tag_ids: preferredTagIds,
      shopping_location: {
        zip_code: shoppingLocationZipCode,
        label: shoppingLocationLabel,
        kroger_location_id: shoppingLocationKrogerLocationId,
      },
      // ─── New onboarding fields ─────────────────────────────────────
      household_size: householdSize || undefined,
      kids_profile: kidsProfile || undefined,
      favorite_proteins: favoriteProteins.length > 0 ? favoriteProteins : undefined,
      favorite_flavors: favoriteFlavors.length > 0 ? favoriteFlavors : undefined,
      spice_level: spiceLevel || undefined,
      disliked_ingredients: dislikedIngredients.length > 0 ? dislikedIngredients : undefined,
      disliked_textures: dislikedTextures.length > 0 ? dislikedTextures : undefined,
      cooking_skill_level: cookingSkillLevel || undefined,
      available_appliances: availableAppliances.length > 0 ? availableAppliances : undefined,
      preferred_cooking_time: preferredCookingTime || undefined,
      typical_meal_times: typicalMealTimes.length > 0 ? typicalMealTimes : undefined,
      goal_priorities: goalPriorities.length > 0 ? goalPriorities : undefined,
      calorie_tracking_mode: calorieTrackingMode || undefined,
      weekly_budget: weeklyBudget || undefined,
      preferred_stores: preferredStores.length > 0 ? preferredStores : undefined,
      shopping_mode: shoppingMode || undefined,
      recipe_discovery_sources: recipeDiscoverySources.length > 0 ? recipeDiscoverySources : undefined,
      biggest_cooking_frustration: biggestCookingFrustration || undefined,
    }),
  }).catch(() => null);

  if (!preferencesResponse?.ok) {
    return {
      error: "Unable to save your preferences right now.",
    };
  }

  const completionResponse = await callAuthedJson("/me/onboarding/complete", {
    method: "POST",
  }).catch(() => null);

  if (!completionResponse?.ok) {
    return {
      error: "Preferences were saved, but onboarding could not be completed.",
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
