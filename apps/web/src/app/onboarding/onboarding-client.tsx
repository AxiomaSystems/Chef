"use client";

import { useCallback, useState, useTransition } from "react";
import type {
  Cuisine,
  KitchenInventoryItem,
  Tag,
  UserPreferences,
} from "@cart/shared";
import type {
  AiPlanningOptimization,
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
  WeeklyNutritionTargets,
} from "@cart/shared";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { StepHousehold } from "@/components/onboarding/steps/step-household";
import { StepCuisineDietary } from "@/components/onboarding/steps/step-cuisine-dietary";
import { StepFavorites } from "@/components/onboarding/steps/step-favorites";
import { StepAvoids } from "@/components/onboarding/steps/step-avoids";
import { StepKitchenReality } from "@/components/onboarding/steps/step-kitchen-reality";
import { StepGoalsNutrition } from "@/components/onboarding/steps/step-goals-nutrition";
import { StepShoppingBehavior } from "@/components/onboarding/steps/step-shopping-behavior";
import { StepDiscoveryFriction } from "@/components/onboarding/steps/step-discovery-friction";
import { StepLocation } from "@/components/onboarding/steps/step-location";
import { InventoryClient } from "@/app/inventory/inventory-client";
import {
  AVAILABLE_APPLIANCE_LABELS,
  AI_PLANNING_OPTIMIZATION_LABELS,
  DISLIKED_INGREDIENT_LABELS,
  DISLIKED_TEXTURE_LABELS,
  FAVORITE_FLAVOR_LABELS,
  FAVORITE_PROTEIN_LABELS,
  GOAL_PRIORITY_LABELS,
  HOUSEHOLD_SIZE_LABELS,
  PREFERRED_STORE_LABELS,
  SPICE_LEVEL_LABELS,
} from "@/components/onboarding/labels";
import {
  savePreferencesAndCompleteAction,
  skipOnboardingAction,
} from "./actions";

const TOTAL_STEPS = 10;

const STEP_COPY: Record<number, { title: string; subtitle: string }> = {
  1: {
    title: "Who should Preppie plan for?",
    subtitle: "Set the default serving context.",
  },
  2: {
    title: "What food feels like you?",
    subtitle: "Cuisine and dietary defaults.",
  },
  3: {
    title: "What should Preppie reach for first?",
    subtitle: "Soft taste preferences.",
  },
  4: {
    title: "What should Preppie avoid?",
    subtitle: "Soft dislikes for recipe ranking.",
  },
  5: {
    title: "Your kitchen reality",
    subtitle: "Equipment and time constraints.",
  },
  6: {
    title: "What is already in your kitchen?",
    subtitle:
      "Add staples now so Preppie can avoid telling you to buy what you already have. You can skip this and edit it later.",
  },
  7: {
    title: "What should Preppie optimize for?",
    subtitle: "Prioritized planning goals.",
  },
  8: {
    title: "How do you shop?",
    subtitle: "Budget and store defaults.",
  },
  9: {
    title: "How should Preppie help first?",
    subtitle: "Guide future agent behavior.",
  },
  10: {
    title: "Where should Preppie build your cart?",
    subtitle: "Store availability and cart accuracy.",
  },
};

type FormState = {
  household_size: HouseholdSize | null;
  kids_profile: KidsProfile | null;
  preferred_cuisine_ids: string[];
  preferred_tag_ids: string[];
  custom_cuisine_labels: string[];
  dietary_restrictions: string[];
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
  ai_planning_optimization: AiPlanningOptimization | null;
  calorie_tracking_mode: CalorieTrackingMode | null;
  weekly_nutrition_targets: WeeklyNutritionTargets;
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
    custom_cuisine_labels: [],
    dietary_restrictions: [],
    favorite_proteins: (prefs?.favorite_proteins ?? []) as FavoriteProtein[],
    favorite_flavors: (prefs?.favorite_flavors ?? []) as FavoriteFlavor[],
    spice_level: prefs?.spice_level ?? null,
    disliked_ingredients: (prefs?.disliked_ingredients ??
      []) as DislikedIngredient[],
    disliked_textures: (prefs?.disliked_textures ?? []) as DislikedTexture[],
    cooking_skill_level: prefs?.cooking_skill_level ?? null,
    available_appliances: (prefs?.available_appliances ??
      []) as AvailableAppliance[],
    preferred_cooking_time: prefs?.preferred_cooking_time ?? null,
    typical_meal_times: (prefs?.typical_meal_times ?? []) as TypicalMealTime[],
    goal_priorities: (prefs?.goal_priorities ?? []) as GoalPriority[],
    ai_planning_optimization: prefs?.ai_planning_optimization ?? null,
    calorie_tracking_mode: prefs?.calorie_tracking_mode ?? null,
    weekly_nutrition_targets: prefs?.weekly_nutrition_targets ?? {},
    weekly_budget: prefs?.weekly_budget ?? null,
    preferred_stores: (prefs?.preferred_stores ?? []) as PreferredStore[],
    shopping_mode: prefs?.shopping_mode ?? null,
    recipe_discovery_sources: (prefs?.recipe_discovery_sources ??
      []) as RecipeDiscoverySource[],
    biggest_cooking_frustration: prefs?.biggest_cooking_frustration ?? null,
    shopping_location_zip: prefs?.shopping_location?.zip_code ?? "",
    shopping_location_label: prefs?.shopping_location?.label ?? "",
    shopping_location_kroger_location_id:
      prefs?.shopping_location?.kroger_location_id ?? "",
  };
}

function joinLabels(labels: string[], max = 3) {
  const visible = labels.slice(0, max);
  const extra = labels.length - visible.length;
  return extra > 0 ? `${visible.join(", ")} +${extra}` : visible.join(", ");
}

function buildMemoryItems(
  form: FormState,
  cuisines: Cuisine[],
  dietaryTags: Tag[],
) {
  const items: string[] = [];
  const cuisineLabels = form.preferred_cuisine_ids
    .map((id) => cuisines.find((cuisine) => cuisine.id === id)?.label)
    .filter((label): label is string => Boolean(label));
  const dietaryLabels = form.preferred_tag_ids
    .map((id) => dietaryTags.find((tag) => tag.id === id)?.name)
    .filter((label): label is string => Boolean(label));
  const favoriteLabels = [
    ...form.favorite_proteins.map((value) => FAVORITE_PROTEIN_LABELS[value]),
    ...form.favorite_flavors.map((value) => FAVORITE_FLAVOR_LABELS[value]),
  ];
  const avoidLabels = [
    ...form.disliked_ingredients.map(
      (value) => DISLIKED_INGREDIENT_LABELS[value],
    ),
    ...form.disliked_textures.map((value) => DISLIKED_TEXTURE_LABELS[value]),
  ];
  const goalLabels = form.goal_priorities.map(
    (value) => GOAL_PRIORITY_LABELS[value],
  );

  if (form.household_size) {
    items.push(`Planning for ${HOUSEHOLD_SIZE_LABELS[form.household_size]}`);
  }

  if (cuisineLabels.length > 0) {
    items.push(`Likes ${joinLabels(cuisineLabels)}`);
  }

  if (dietaryLabels.length > 0) {
    items.push(`Uses ${joinLabels(dietaryLabels)} as dietary filters`);
  }

  const restrictionLabels = form.dietary_restrictions.map((slug) =>
    slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
  );
  if (restrictionLabels.length > 0) {
    items.push(`Restrictions: ${joinLabels(restrictionLabels)}`);
  }

  if (favoriteLabels.length > 0 || form.spice_level) {
    const spice = form.spice_level
      ? SPICE_LEVEL_LABELS[form.spice_level]
      : null;
    items.push(
      `Prefers ${joinLabels([...favoriteLabels, ...(spice ? [spice] : [])])}`,
    );
  }

  if (avoidLabels.length > 0) {
    items.push(`Down-ranks ${joinLabels(avoidLabels)}`);
  }

  if (form.available_appliances.length > 0) {
    items.push(
      `Kitchen has ${joinLabels(
        form.available_appliances.map(
          (value) => AVAILABLE_APPLIANCE_LABELS[value],
        ),
      )}`,
    );
  }

  if (goalLabels.length > 0) {
    items.push(`Optimizes for ${joinLabels(goalLabels)}`);
  }

  if (form.ai_planning_optimization) {
    items.push(
      `AI planning: ${AI_PLANNING_OPTIMIZATION_LABELS[form.ai_planning_optimization]}`,
    );
  }

  if (Object.values(form.weekly_nutrition_targets).some(Boolean)) {
    items.push("Uses custom weekly nutrition targets");
  }

  if (form.preferred_stores.length > 0 || form.shopping_location_zip) {
    const stores = form.preferred_stores.map(
      (value) => PREFERRED_STORE_LABELS[value],
    );
    items.push(
      `Shopping defaults: ${joinLabels([
        ...stores,
        ...(form.shopping_location_zip
          ? [`ZIP ${form.shopping_location_zip}`]
          : []),
      ])}`,
    );
  }

  return items;
}

export function OnboardingClient({
  cuisines,
  dietaryTags,
  existingPreferences,
  existingInventory,
}: {
  cuisines: Cuisine[];
  dietaryTags: Tag[];
  existingPreferences: UserPreferences | null;
  existingInventory: KitchenInventoryItem[];
}) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(() =>
    buildInitialState(existingPreferences),
  );
  const [inventoryItems, setInventoryItems] =
    useState<KitchenInventoryItem[]>(existingInventory);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const handleInventoryItemsChange = useCallback(
    (items: KitchenInventoryItem[]) => {
      setInventoryItems(items);
    },
    [],
  );

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleHouseholdSizeChange(value: HouseholdSize) {
    setForm((prev) => ({
      ...prev,
      household_size: value,
      kids_profile: value === "just_me" ? "no_kids" : prev.kids_profile,
    }));
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
  const memoryItems = [
    ...buildMemoryItems(form, cuisines, dietaryTags),
    ...(inventoryItems.length > 0
      ? [
          `${inventoryItems.length} inventory ${
            inventoryItems.length === 1 ? "item" : "items"
          } ready for meal planning`,
        ]
      : []),
  ];

  return (
    <OnboardingShell
      currentStep={step}
      title={copy.title}
      subtitle={copy.subtitle}
      memoryItems={memoryItems}
      onBack={step > 1 ? handleBack : null}
      onSkip={handleSkip}
      onNext={handleNext}
      nextLabel={step === TOTAL_STEPS ? "Save memory" : "Continue"}
      isPending={isPending}
      error={error}
      layout={step === 6 ? "workspace" : "card"}
    >
      {step === 1 && (
        <StepHousehold
          householdSize={form.household_size}
          kidsProfile={form.kids_profile}
          onHouseholdSizeChange={handleHouseholdSizeChange}
          onKidsProfileChange={(v) => patch("kids_profile", v)}
        />
      )}
      {step === 2 && (
        <StepCuisineDietary
          cuisines={cuisines}
          dietaryTags={dietaryTags}
          selectedCuisineIds={form.preferred_cuisine_ids}
          selectedTagIds={form.preferred_tag_ids}
          customCuisineLabels={form.custom_cuisine_labels}
          dietaryRestrictions={form.dietary_restrictions}
          onCuisinesChange={(v) => patch("preferred_cuisine_ids", v)}
          onTagsChange={(v) => patch("preferred_tag_ids", v)}
          onCustomCuisineLabelsChange={(v) => patch("custom_cuisine_labels", v)}
          onDietaryRestrictionsChange={(v) => patch("dietary_restrictions", v)}
        />
      )}
      {step === 3 && (
        <StepFavorites
          favoriteProteins={form.favorite_proteins}
          favoriteFlavors={form.favorite_flavors}
          spiceLevel={form.spice_level}
          onFavoriteProteinsChange={(v) => patch("favorite_proteins", v)}
          onFavoriteFlavorsChange={(v) => patch("favorite_flavors", v)}
          onSpiceLevelChange={(v) => patch("spice_level", v)}
        />
      )}
      {step === 4 && (
        <StepAvoids
          dislikedIngredients={form.disliked_ingredients}
          dislikedTextures={form.disliked_textures}
          onDislikedIngredientsChange={(v) => patch("disliked_ingredients", v)}
          onDislikedTexturesChange={(v) => patch("disliked_textures", v)}
        />
      )}
      {step === 5 && (
        <StepKitchenReality
          cookingSkillLevel={form.cooking_skill_level}
          availableAppliances={form.available_appliances}
          preferredCookingTime={form.preferred_cooking_time}
          typicalMealTimes={form.typical_meal_times}
          onCookingSkillLevelChange={(v) => patch("cooking_skill_level", v)}
          onAvailableAppliancesChange={(v) => patch("available_appliances", v)}
          onPreferredCookingTimeChange={(v) =>
            patch("preferred_cooking_time", v)
          }
          onTypicalMealTimesChange={(v) => patch("typical_meal_times", v)}
        />
      )}
      {step === 6 && (
        <InventoryClient
          realItems={inventoryItems}
          embedded
          onItemsChange={handleInventoryItemsChange}
        />
      )}
      {step === 7 && (
        <StepGoalsNutrition
          goalPriorities={form.goal_priorities}
          aiPlanningOptimization={form.ai_planning_optimization}
          calorieTrackingMode={form.calorie_tracking_mode}
          weeklyNutritionTargets={form.weekly_nutrition_targets}
          onGoalPrioritiesChange={(v) => patch("goal_priorities", v)}
          onAiPlanningOptimizationChange={(v) =>
            patch("ai_planning_optimization", v)
          }
          onCalorieTrackingModeChange={(v) => patch("calorie_tracking_mode", v)}
          onWeeklyNutritionTargetsChange={(v) =>
            patch("weekly_nutrition_targets", v)
          }
        />
      )}
      {step === 8 && (
        <StepShoppingBehavior
          weeklyBudget={form.weekly_budget}
          preferredStores={form.preferred_stores}
          shoppingMode={form.shopping_mode}
          onWeeklyBudgetChange={(v) => patch("weekly_budget", v)}
          onPreferredStoresChange={(v) => patch("preferred_stores", v)}
          onShoppingModeChange={(v) => patch("shopping_mode", v)}
        />
      )}
      {step === 9 && (
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
      {step === 10 && (
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
