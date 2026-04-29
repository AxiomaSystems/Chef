"use client";

import { useState, useTransition } from "react";
import type { Cuisine, Tag, UserPreferences } from "@cart/shared";
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
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { StepHousehold } from "@/components/onboarding/steps/step-household";
import { StepCuisineDietary } from "@/components/onboarding/steps/step-cuisine-dietary";
import { StepTasteDislikes } from "@/components/onboarding/steps/step-taste-dislikes";
import { StepKitchenReality } from "@/components/onboarding/steps/step-kitchen-reality";
import { StepGoalsNutrition } from "@/components/onboarding/steps/step-goals-nutrition";
import { StepShoppingBehavior } from "@/components/onboarding/steps/step-shopping-behavior";
import { StepDiscoveryFriction } from "@/components/onboarding/steps/step-discovery-friction";
import { StepLocation } from "@/components/onboarding/steps/step-location";
import {
  savePreferencesAndCompleteAction,
  skipOnboardingAction,
} from "./actions";

const TOTAL_STEPS = 8;

const STEP_COPY: Record<number, { title: string; subtitle: string }> = {
  1: {
    title: "Who are you cooking for?",
    subtitle: "This helps us size recipes and plan portions correctly.",
  },
  2: {
    title: "Cuisine and dietary profile",
    subtitle: "Pick the cuisines you love and any dietary requirements.",
  },
  3: {
    title: "Taste and dislikes",
    subtitle:
      "Tell us what you love and what you'd rather avoid.",
  },
  4: {
    title: "Your kitchen reality",
    subtitle: "We'll only suggest recipes that fit your setup and schedule.",
  },
  5: {
    title: "Goals and nutrition",
    subtitle: "What are you optimising for? We'll weight recommendations to match.",
  },
  6: {
    title: "Shopping behaviour",
    subtitle: "We use this to build smarter grocery lists.",
  },
  7: {
    title: "Discovery and friction",
    subtitle: "A little context on how you find recipes and what gets in the way.",
  },
  8: {
    title: "Where do you shop?",
    subtitle:
      "We use your location to find in-stock items at nearby stores.",
  },
};

type FormState = {
  household_size: HouseholdSize | null;
  kids_profile: KidsProfile | null;
  preferred_cuisine_ids: string[];
  preferred_tag_ids: string[];
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
  shopping_location_zip: string;
  shopping_location_label: string;
  shopping_location_kroger_location_id: string;
};

function buildInitialState(prefs: UserPreferences | null): FormState {
  return {
    household_size: prefs?.household_size ?? null,
    kids_profile: prefs?.kids_profile ?? null,
    preferred_cuisine_ids: prefs?.preferred_cuisine_ids ?? [],
    preferred_tag_ids: prefs?.preferred_tag_ids ?? [],
    favorite_proteins: (prefs?.favorite_proteins ?? []) as FavoriteProtein[],
    favorite_flavors: (prefs?.favorite_flavors ?? []) as FavoriteFlavor[],
    spice_level: prefs?.spice_level ?? null,
    disliked_ingredients: (prefs?.disliked_ingredients ?? []) as DislikedIngredient[],
    disliked_textures: (prefs?.disliked_textures ?? []) as DislikedTexture[],
    cooking_skill_level: prefs?.cooking_skill_level ?? null,
    available_appliances: (prefs?.available_appliances ?? []) as AvailableAppliance[],
    preferred_cooking_time: prefs?.preferred_cooking_time ?? null,
    typical_meal_times: (prefs?.typical_meal_times ?? []) as TypicalMealTime[],
    goal_priorities: (prefs?.goal_priorities ?? []) as GoalPriority[],
    calorie_tracking_mode: prefs?.calorie_tracking_mode ?? null,
    weekly_budget: prefs?.weekly_budget ?? null,
    preferred_stores: (prefs?.preferred_stores ?? []) as PreferredStore[],
    shopping_mode: prefs?.shopping_mode ?? null,
    recipe_discovery_sources: (prefs?.recipe_discovery_sources ?? []) as RecipeDiscoverySource[],
    biggest_cooking_frustration: prefs?.biggest_cooking_frustration ?? null,
    shopping_location_zip: prefs?.shopping_location?.zip_code ?? "",
    shopping_location_label: prefs?.shopping_location?.label ?? "",
    shopping_location_kroger_location_id:
      prefs?.shopping_location?.kroger_location_id ?? "",
  };
}

export function OnboardingClient({
  cuisines,
  dietaryTags,
  existingPreferences,
}: {
  cuisines: Cuisine[];
  dietaryTags: Tag[];
  existingPreferences: UserPreferences | null;
}) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(() =>
    buildInitialState(existingPreferences),
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleNext() {
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
      setError(null);
    } else {
      handleFinish();
    }
  }

  function handleBack() {
    setStep((s) => Math.max(1, s - 1));
    setError(null);
  }

  function handleSkip() {
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
      setError(null);
    } else {
      startTransition(async () => {
        await skipOnboardingAction();
      });
    }
  }

  function handleFinish() {
    setError(null);
    startTransition(async () => {
      const result = await savePreferencesAndCompleteAction(form);
      if (result?.error) setError(result.error);
    });
  }

  const copy = STEP_COPY[step]!;

  return (
    <OnboardingShell
      currentStep={step}
      title={copy.title}
      subtitle={copy.subtitle}
      onBack={step > 1 ? handleBack : null}
      onSkip={handleSkip}
      onNext={handleNext}
      nextLabel={step === TOTAL_STEPS ? "Finish" : "Next"}
      isPending={isPending}
      error={error}
    >
      {step === 1 && (
        <StepHousehold
          householdSize={form.household_size}
          kidsProfile={form.kids_profile}
          onHouseholdSizeChange={(v) => patch("household_size", v)}
          onKidsProfileChange={(v) => patch("kids_profile", v)}
        />
      )}
      {step === 2 && (
        <StepCuisineDietary
          cuisines={cuisines}
          dietaryTags={dietaryTags}
          selectedCuisineIds={form.preferred_cuisine_ids}
          selectedTagIds={form.preferred_tag_ids}
          onCuisinesChange={(v) => patch("preferred_cuisine_ids", v)}
          onTagsChange={(v) => patch("preferred_tag_ids", v)}
        />
      )}
      {step === 3 && (
        <StepTasteDislikes
          favoriteProteins={form.favorite_proteins}
          favoriteFlavors={form.favorite_flavors}
          spiceLevel={form.spice_level}
          dislikedIngredients={form.disliked_ingredients}
          dislikedTextures={form.disliked_textures}
          onFavoriteProteinsChange={(v) => patch("favorite_proteins", v)}
          onFavoriteFlavorsChange={(v) => patch("favorite_flavors", v)}
          onSpiceLevelChange={(v) => patch("spice_level", v)}
          onDislikedIngredientsChange={(v) => patch("disliked_ingredients", v)}
          onDislikedTexturesChange={(v) => patch("disliked_textures", v)}
        />
      )}
      {step === 4 && (
        <StepKitchenReality
          cookingSkillLevel={form.cooking_skill_level}
          availableAppliances={form.available_appliances}
          preferredCookingTime={form.preferred_cooking_time}
          typicalMealTimes={form.typical_meal_times}
          onCookingSkillLevelChange={(v) => patch("cooking_skill_level", v)}
          onAvailableAppliancesChange={(v) => patch("available_appliances", v)}
          onPreferredCookingTimeChange={(v) => patch("preferred_cooking_time", v)}
          onTypicalMealTimesChange={(v) => patch("typical_meal_times", v)}
        />
      )}
      {step === 5 && (
        <StepGoalsNutrition
          goalPriorities={form.goal_priorities}
          calorieTrackingMode={form.calorie_tracking_mode}
          onGoalPrioritiesChange={(v) => patch("goal_priorities", v)}
          onCalorieTrackingModeChange={(v) => patch("calorie_tracking_mode", v)}
        />
      )}
      {step === 6 && (
        <StepShoppingBehavior
          weeklyBudget={form.weekly_budget}
          preferredStores={form.preferred_stores}
          shoppingMode={form.shopping_mode}
          onWeeklyBudgetChange={(v) => patch("weekly_budget", v)}
          onPreferredStoresChange={(v) => patch("preferred_stores", v)}
          onShoppingModeChange={(v) => patch("shopping_mode", v)}
        />
      )}
      {step === 7 && (
        <StepDiscoveryFriction
          recipeDiscoverySources={form.recipe_discovery_sources}
          biggestCookingFrustration={form.biggest_cooking_frustration}
          onRecipeDiscoverySourcesChange={(v) =>
            patch("recipe_discovery_sources", v)
          }
          onBiggestCookingFrustrationChange={(v) =>
            patch("biggest_cooking_frustration", v)
          }
        />
      )}
      {step === 8 && (
        <StepLocation
          zip={form.shopping_location_zip}
          label={form.shopping_location_label}
          onZipChange={(v) => patch("shopping_location_zip", v)}
          onLabelChange={(v) => patch("shopping_location_label", v)}
        />
      )}
    </OnboardingShell>
  );
}
