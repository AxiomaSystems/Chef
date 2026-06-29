"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type {
  BaseRecipe,
  AiPlanningOptimization,
  KitchenInventoryItem,
  RecipeCostTier,
  RecipeDifficulty,
  RecipeListPage,
  RecipeMealType,
  RecipeNutritionData,
  UserPreferences,
  UserProfileMemory,
} from "@cart/shared";
import { ACCESS_TOKEN_COOKIE, buildApiUrl } from "@/lib/auth";

export type ChefChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ChefChatActionState = {
  error?: string;
  message?: string;
  followUpPrompts?: string[];
  safetyNotes?: string[];
};

export type AiDishIngredient = {
  canonical_ingredient: string;
  amount: number | null;
  unit: string | null;
  amount_text: string | null;
  display_ingredient: string | null;
  preparation: string | null;
  substitutions: string[];
  optional: boolean;
  group: string | null;
};

export type AiRecipeStep = {
  step: number;
  what_to_do: string;
  duration_minutes: number | null;
  temperature: number | null;
  temperature_unit: "F" | "C" | null;
  timer_label: string | null;
  equipment: string[];
  ingredient_client_line_ids: string[];
};

export type AiRecipePreview = {
  name: string;
  cuisine: string;
  description: string;
  servings: number;
  ingredients: AiDishIngredient[];
  steps: AiRecipeStep[];
  tags: string[];
  nutrition_estimate: RecipeNutritionData | null;
  meal_types: RecipeMealType[];
  difficulty: RecipeDifficulty;
  difficulty_reason: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  total_time_minutes: number | null;
  estimated_cost_tier: RecipeCostTier;
  cost_notes: string[];
  quality_tradeoffs: string[];
  assumptions: string[];
};

export type GenerateMealsActionState = {
  error?: string;
  summary?: string;
  recipes?: AiRecipePreview[];
  planningNotes?: string[];
  costNotes?: string[];
};

type MealStyle =
  | "standard"
  | "inventory_first"
  | "high_protein"
  | "low_calorie"
  | "meal_prep"
  | "quick";

type BudgetMode = "minimize_cost" | "balanced" | "premium";

type GenerateMealsActionInput = {
  mealPrompt: string;
  servingsPerMeal?: number;
  mealsNeeded?: number;
  mealStyle?: MealStyle;
  budgetMode?: BudgetMode;
  dietaryPreferences?: string[];
  allergies?: string[];
  dislikedIngredients?: string[];
  inventory?: string[];
  maxTimeMinutes?: number;
  maxCostPerServing?: number;
  qualityGoals?: string[];
  aiPlanningOptimization?: AiPlanningOptimization;
  notes?: string;
};

export type UserRecipesActionState = {
  error?: string;
  recipes?: BaseRecipe[];
};

export type AiRecipeImportResult = {
  source_url: string;
  platform: "youtube" | "instagram" | "tiktok" | "generic";
  source_title: string;
  source_creator: string | null;
  source_description: string;
  source_image_url: string | null;
  imported_recipe: AiRecipePreview;
  extraction_notes: string[];
};

export type ImportRecipeActionState = {
  error?: string;
  result?: AiRecipeImportResult;
};

async function readErrorMessage(response: Response | null, fallback: string) {
  if (!response) return fallback;

  try {
    const payload = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(payload.message)) return payload.message[0] ?? fallback;
    if (typeof payload.message === "string") return payload.message;
  } catch {
    // Use fallback below.
  }

  return fallback;
}

export async function askChefAction(input: {
  message: string;
  history: ChefChatMessage[];
  context?: Record<string, unknown>;
}): Promise<ChefChatActionState> {
  const message = input.message.trim();

  if (!message) {
    return { error: "Ask Preppie something first." };
  }

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!accessToken) {
    redirect("/login");
  }

  const response = await fetch(buildApiUrl("/ai/chat"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      history: input.history.slice(-8),
      context: input.context ?? {},
    }),
    cache: "no-store",
  }).catch(() => null);

  if (!response?.ok) {
    return {
      error: await readErrorMessage(
        response,
        "Preppie is unavailable right now.",
      ),
    };
  }

  const payload = (await response.json()) as {
    message?: string;
    follow_up_prompts?: string[];
    safety_notes?: string[];
  };

  return {
    message: payload.message ?? "",
    followUpPrompts: payload.follow_up_prompts ?? [],
    safetyNotes: payload.safety_notes ?? [],
  };
}

export type IngredientPrepActionState = {
  error?: string;
  notes?: string[];
};

export type InventoryAlternativeSuggestion = {
  ingredient_name: string;
  inventory_item_id: string | null;
  replacement_ingredient: string | null;
  confidence: "low" | "medium" | "high";
  reason: string;
};

export async function getInventoryAlternativesAction(input: {
  recipeName: string;
  ingredients: {
    canonical_ingredient: string;
    display_ingredient?: string | null;
    amount: number;
    unit: string;
  }[];
  inventory: {
    id: string;
    display_name: string;
    ingredient_id?: string | null;
    canonical_name?: string | null;
    category?: string | null;
    estimated_amount?: number | null;
    unit?: string | null;
    aliases?: string[];
  }[];
}): Promise<{
  suggestions?: InventoryAlternativeSuggestion[];
  error?: string;
}> {
  if (input.ingredients.length === 0 || input.inventory.length === 0) {
    return { suggestions: [] };
  }

  const accessToken = await requireAccessToken();
  const response = await fetch(
    buildApiUrl("/ai/recipes/inventory-alternatives"),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipe_name: input.recipeName,
        ingredients: input.ingredients,
        inventory: input.inventory,
      }),
      cache: "no-store",
    },
  ).catch(() => null);

  if (!response?.ok) {
    return {
      error: await readErrorMessage(
        response,
        "Could not check inventory alternatives.",
      ),
    };
  }

  const payload = (await response.json()) as {
    suggestions?: InventoryAlternativeSuggestion[];
  };

  return { suggestions: payload.suggestions ?? [] };
}

export async function getIngredientPrepAction(input: {
  recipeName: string;
  recipeServings?: number;
  ingredients: {
    canonical_ingredient: string;
    display_ingredient: string | null;
    amount: number;
    unit: string;
    preparation?: string | null;
  }[];
}): Promise<IngredientPrepActionState> {
  const result = await askChefAction({
    message:
      "For each ingredient in the provided recipe context, write one short prep instruction. Reply only with a valid JSON array of strings, one instruction per ingredient in the exact same order.",
    history: [],
    context: {
      surface: "ingredient_prep_guide",
      active_recipe: {
        name: input.recipeName,
        servings: input.recipeServings ?? null,
      },
      ingredients: input.ingredients.map((ingredient, index) => ({
        index,
        name: ingredient.display_ingredient ?? ingredient.canonical_ingredient,
        canonical_ingredient: ingredient.canonical_ingredient,
        amount: ingredient.amount,
        unit: ingredient.unit,
        existing_preparation: ingredient.preparation ?? null,
      })),
      output_contract:
        "JSON array of strings only, same length and order as ingredients.",
    },
  });

  if (result.error || !result.message) {
    return { error: result.error ?? "Could not generate prep guide." };
  }

  try {
    const cleaned = result.message.replace(/```json\n?|\n?```/g, "").trim();
    const notes = JSON.parse(cleaned) as string[];
    if (!Array.isArray(notes)) return { error: "Unexpected response format." };
    return { notes };
  } catch {
    return { error: "Could not parse prep instructions." };
  }
}

async function requireAccessToken() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!accessToken) {
    redirect("/login");
  }

  return accessToken;
}

type MealGenerationContext = {
  profileMemory?: UserProfileMemory;
  preferences?: UserPreferences;
  inventory: KitchenInventoryItem[];
};

async function loadMealGenerationContext(
  accessToken: string,
): Promise<MealGenerationContext> {
  const [profileMemory, inventory] = await Promise.all([
    fetchOptionalAuthedResource<UserProfileMemory>(
      "/me/profile-memory",
      accessToken,
    ),
    fetchOptionalAuthedResource<KitchenInventoryItem[]>(
      "/me/kitchen-inventory",
      accessToken,
    ),
  ]);

  return {
    profileMemory,
    preferences: profileMemory?.preferences,
    inventory: Array.isArray(inventory) ? inventory : [],
  };
}

async function fetchOptionalAuthedResource<T>(
  path: string,
  accessToken: string,
): Promise<T | undefined> {
  const response = await fetch(buildApiUrl(path), {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  }).catch(() => null);

  if (!response?.ok) return undefined;

  return (await response.json().catch(() => undefined)) as T | undefined;
}

function buildGenerateMealsRequest(
  input: GenerateMealsActionInput,
  context: MealGenerationContext,
) {
  const preferences = context.preferences;
  const profileMemory = context.profileMemory;
  const inventory = uniqueStrings([
    ...(input.inventory ?? []),
    ...context.inventory.map(formatInventoryItemForPrompt),
    ...(profileMemory?.pantry_staples.map(
      (staple) => `pantry staple: ${staple.canonical_name}`,
    ) ?? []),
  ]);
  const mealStyle =
    input.mealStyle ?? mealStyleFromContext(preferences, inventory.length > 0);
  const budgetMode = input.budgetMode ?? budgetModeFromContext(preferences);
  const dietaryPreferences = uniqueStrings([
    ...(input.dietaryPreferences ?? []),
    ...(preferences?.preferred_tags.map((tag) => tag.name) ?? []),
  ]);
  const allergies = uniqueStrings([
    ...(input.allergies ?? []),
    ...(preferences?.preferred_tags
      .filter(isAllergyTag)
      .map((tag) => tag.name) ?? []),
    ...(profileMemory?.food_rules
      .filter(
        (rule) =>
          rule.active &&
          rule.strictness === "hard" &&
          /allerg/i.test(rule.label),
      )
      .map((rule) => rule.label) ?? []),
  ]);
  const dislikedIngredients = uniqueStrings([
    ...(input.dislikedIngredients ?? []),
    ...(preferences?.disliked_ingredients?.map(formatEnumLabel) ?? []),
    ...(profileMemory?.food_rules
      .filter(
        (rule) =>
          rule.active &&
          rule.kind === "ingredient_preference" &&
          (rule.action === "dislike" || rule.action === "avoid"),
      )
      .map((rule) => rule.label) ?? []),
  ]);
  const qualityGoals = uniqueStrings([
    ...(input.qualityGoals ?? []),
    ...(preferences?.goal_priorities?.map(qualityGoalFromLegacyGoal) ?? []),
    ...(profileMemory?.goals
      .filter((goal) => goal.active)
      .map((goal) => qualityGoalFromProfileGoal(goal.goal)) ?? []),
  ]);
  const notes = uniqueStrings([
    input.notes,
    mealGenerationContextNote(preferences, profileMemory),
  ]).join(" ");
  const aiPlanningOptimization =
    input.aiPlanningOptimization ??
    preferences?.ai_planning_optimization ??
    "cost_reduction";

  return {
    meal_prompt: input.mealPrompt.trim(),
    servings_per_meal: input.servingsPerMeal ?? 4,
    meals_needed: input.mealsNeeded ?? 1,
    meal_style: mealStyle,
    budget_mode: budgetMode,
    dietary_preferences: dietaryPreferences,
    allergies,
    disliked_ingredients: dislikedIngredients,
    inventory,
    max_time_minutes:
      input.maxTimeMinutes ?? maxTimeMinutesFromContext(preferences),
    max_cost_per_serving:
      input.maxCostPerServing ?? maxCostPerServingFromContext(preferences),
    quality_goals: qualityGoals,
    ai_planning_optimization: aiPlanningOptimization,
    notes,
  };
}

function uniqueStrings(values: Array<string | undefined | null>) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = value?.trim().replace(/\s+/g, " ");
    if (!normalized) continue;

    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(normalized);
  }

  return result;
}

function formatInventoryItemForPrompt(item: KitchenInventoryItem) {
  const amount =
    item.estimated_amount !== undefined && item.unit
      ? `${item.estimated_amount} ${item.unit} `
      : "";
  const canonical = item.ingredient?.canonical_name
    ? `canonical: ${item.ingredient.canonical_name}`
    : undefined;
  const category = item.ingredient?.category
    ? `category: ${item.ingredient.category}`
    : undefined;
  const metadata = [canonical, category].filter(Boolean).join("; ");
  return `${amount}${item.display_name}${metadata ? ` (${metadata})` : ""}`.trim();
}

function isAllergyTag(tag: { name: string; slug: string }) {
  return /allerg/i.test(`${tag.name} ${tag.slug}`);
}

function formatEnumLabel(value: string) {
  return value.replace(/_/g, " ");
}

function mealStyleFromContext(
  preferences: UserPreferences | undefined,
  hasInventory: boolean,
): MealStyle {
  const goals = new Set(preferences?.goal_priorities ?? []);
  const mealTimes = new Set(preferences?.typical_meal_times ?? []);

  if (goals.has("build_muscle")) return "high_protein";
  if (goals.has("save_money") || goals.has("reduce_food_waste")) {
    return "inventory_first";
  }
  if (hasInventory) return "inventory_first";
  if (goals.has("cook_faster")) return "quick";
  if (mealTimes.has("meal_prep")) return "meal_prep";

  return "standard";
}

function budgetModeFromContext(preferences?: UserPreferences): BudgetMode {
  const goals = new Set(preferences?.goal_priorities ?? []);
  if (goals.has("save_money")) return "minimize_cost";
  if (preferences?.weekly_budget === "under_50") return "minimize_cost";
  if (preferences?.weekly_budget === "50_to_100") return "minimize_cost";
  if (preferences?.weekly_budget === "no_budget_limit") return "premium";
  return "balanced";
}

function maxTimeMinutesFromContext(preferences?: UserPreferences) {
  switch (preferences?.preferred_cooking_time) {
    case "under_15_min":
      return 15;
    case "15_to_30_min":
      return 30;
    case "30_to_45_min":
      return 45;
    case "up_to_1_hour":
      return 60;
    default:
      return undefined;
  }
}

function maxCostPerServingFromContext(preferences?: UserPreferences) {
  switch (preferences?.weekly_budget) {
    case "under_50":
      return 3;
    case "50_to_100":
      return 5;
    case "100_to_150":
      return 7;
    case "150_to_200":
      return 9;
    default:
      return undefined;
  }
}

function qualityGoalFromLegacyGoal(goal: string) {
  const labels: Record<string, string> = {
    save_money: "budget friendly",
    eat_healthier: "healthy",
    lose_weight: "lower calorie",
    build_muscle: "high protein",
    reduce_food_waste: "use what is already available",
    try_new_cuisines: "varied cuisines",
    cook_faster: "quick cooking",
    eat_more_plant_based: "more plant based meals",
  };

  return labels[goal] ?? formatEnumLabel(goal);
}

function qualityGoalFromProfileGoal(goal: string) {
  const labels: Record<string, string> = {
    save_money: "budget friendly",
    save_time: "quick cooking",
    eat_healthier: "healthy",
    hit_protein: "high protein",
    reduce_waste: "use what is already available",
    try_new_foods: "varied meals",
    cook_more_at_home: "easy home cooking",
    meal_prep: "meal prep friendly",
    spend_less_on_takeout: "takeout replacement",
  };

  return labels[goal] ?? formatEnumLabel(goal);
}

function mealGenerationContextNote(
  preferences?: UserPreferences,
  profileMemory?: UserProfileMemory,
) {
  if (!preferences && !profileMemory) return undefined;

  const notes = [
    preferences?.preferred_cuisines.length
      ? `Preferred cuisines: ${preferences.preferred_cuisines
          .map((cuisine) => cuisine.label)
          .join(", ")}.`
      : undefined,
    preferences?.ai_planning_optimization
      ? `AI planning optimization: ${formatEnumLabel(
          preferences.ai_planning_optimization,
        )}.`
      : undefined,
    preferences?.household_size
      ? `Household size: ${formatEnumLabel(preferences.household_size)}.`
      : undefined,
    preferences?.kids_profile
      ? `Kids profile: ${formatEnumLabel(preferences.kids_profile)}.`
      : undefined,
    preferences?.favorite_proteins?.length
      ? `Favorite proteins: ${preferences.favorite_proteins
          .map(formatEnumLabel)
          .join(", ")}.`
      : undefined,
    preferences?.favorite_flavors?.length
      ? `Favorite flavors: ${preferences.favorite_flavors
          .map(formatEnumLabel)
          .join(", ")}.`
      : undefined,
    preferences?.spice_level
      ? `Spice level: ${formatEnumLabel(preferences.spice_level)}.`
      : undefined,
    preferences?.cooking_skill_level
      ? `Cooking skill: ${formatEnumLabel(preferences.cooking_skill_level)}.`
      : undefined,
    preferences?.available_appliances?.length
      ? `Available appliances: ${preferences.available_appliances
          .map(formatEnumLabel)
          .join(", ")}.`
      : undefined,
    preferences?.weekly_nutrition_targets &&
    Object.values(preferences.weekly_nutrition_targets).some(Boolean)
      ? `Weekly nutrition targets: ${[
          preferences.weekly_nutrition_targets.calories
            ? `${preferences.weekly_nutrition_targets.calories} calories`
            : undefined,
          preferences.weekly_nutrition_targets.protein_g
            ? `${preferences.weekly_nutrition_targets.protein_g}g protein`
            : undefined,
          preferences.weekly_nutrition_targets.carbs_g
            ? `${preferences.weekly_nutrition_targets.carbs_g}g carbs`
            : undefined,
          preferences.weekly_nutrition_targets.fat_g
            ? `${preferences.weekly_nutrition_targets.fat_g}g fat`
            : undefined,
        ]
          .filter(Boolean)
          .join(", ")}.`
      : undefined,
    profileMemory?.summary.pantry.labels.length
      ? `Pantry staples: ${profileMemory.summary.pantry.labels.join(", ")}.`
      : undefined,
    profileMemory?.food_rules.some(
      (rule) => rule.active && rule.strictness === "hard",
    )
      ? `Hard dietary rules: ${profileMemory.food_rules
          .filter((rule) => rule.active && rule.strictness === "hard")
          .map((rule) => `${rule.action} ${rule.label}`)
          .slice(0, 12)
          .join(", ")}.`
      : undefined,
  ];

  const note = uniqueStrings(notes).join(" ");
  return note || undefined;
}

export async function generateMealsAction(
  input: GenerateMealsActionInput,
): Promise<GenerateMealsActionState> {
  const mealPrompt = input.mealPrompt.trim();

  if (!mealPrompt) {
    return { error: "Give Preppie a meal idea first." };
  }

  const accessToken = await requireAccessToken();
  const context = await loadMealGenerationContext(accessToken);
  const requestBody = buildGenerateMealsRequest(input, context);

  const response = await fetch(buildApiUrl("/ai/meals/generate"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
    cache: "no-store",
  }).catch(() => null);

  if (!response?.ok) {
    return {
      error: await readErrorMessage(
        response,
        "Preppie could not generate meals right now.",
      ),
    };
  }

  const payload = (await response.json()) as {
    summary?: string;
    recipes?: AiRecipePreview[];
    planning_notes?: string[];
    cost_minimization_notes?: string[];
  };

  return {
    summary: payload.summary ?? "",
    recipes: payload.recipes ?? [],
    planningNotes: payload.planning_notes ?? [],
    costNotes: payload.cost_minimization_notes ?? [],
  };
}

export async function fetchUserRecipesAction(): Promise<UserRecipesActionState> {
  const accessToken = await requireAccessToken();
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  const [mineResponse, savedResponse] = await Promise.all([
    fetch(buildApiUrl("/recipes?limit=24&owner=mine"), {
      method: "GET",
      headers,
      cache: "no-store",
    }).catch(() => null),
    fetch(buildApiUrl("/recipes?limit=24&owner=saved"), {
      method: "GET",
      headers,
      cache: "no-store",
    }).catch(() => null),
  ]);

  if (!mineResponse?.ok && !savedResponse?.ok) {
    return {
      error: await readErrorMessage(
        mineResponse ?? savedResponse,
        "Could not load your recipes right now.",
      ),
    };
  }

  const [minePage, savedPage] = await Promise.all([
    mineResponse?.ok
      ? ((await mineResponse.json()) as RecipeListPage)
      : Promise.resolve(null),
    savedResponse?.ok
      ? ((await savedResponse.json()) as RecipeListPage)
      : Promise.resolve(null),
  ]);

  const recipesById = new Map<string, BaseRecipe>();
  for (const recipe of [
    ...(minePage?.items ?? []),
    ...(savedPage?.items ?? []),
  ]) {
    recipesById.set(recipe.id, recipe);
  }

  const recipes = Array.from(recipesById.values()).sort((left, right) => {
    const leftDate = left.updated_at ?? left.created_at;
    const rightDate = right.updated_at ?? right.created_at;
    return rightDate.localeCompare(leftDate);
  });

  return {
    recipes,
  };
}

export async function fetchUnsplashImageAction(input: {
  recipeName: string;
  cuisine?: string;
  ingredients?: string[];
  instructions?: string;
  dietaryRestrictions?: string;
}): Promise<string | null> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) return null;

  try {
    const importantIngredients = (input.ingredients ?? [])
      .map((ingredient) => ingredient.trim())
      .filter(Boolean)
      .slice(0, 6);
    const query = [
      input.recipeName,
      input.cuisine,
      ...importantIngredients,
      input.dietaryRestrictions,
      input.instructions,
      "food dish",
    ]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    const randomParams = new URLSearchParams({
      query,
      orientation: "landscape",
      content_filter: "high",
      client_id: accessKey,
    });
    const randomResponse = await fetch(
      `https://api.unsplash.com/photos/random?${randomParams}`,
      { cache: "no-store" },
    );
    if (randomResponse.ok) {
      const data = (await randomResponse.json()) as {
        urls?: { regular?: string };
      };
      if (data.urls?.regular) return data.urls.regular;
    }

    const searchParams = new URLSearchParams({
      query,
      orientation: "landscape",
      content_filter: "high",
      per_page: "1",
      client_id: accessKey,
    });
    const searchResponse = await fetch(
      `https://api.unsplash.com/search/photos?${searchParams}`,
      { cache: "no-store" },
    );
    if (!searchResponse.ok) return null;
    const searchData = (await searchResponse.json()) as {
      results?: { urls?: { regular?: string } }[];
    };
    return searchData.results?.[0]?.urls?.regular ?? null;
  } catch {
    return null;
  }
}

export async function importRecipeFromUrlAction(input: {
  url: string;
  supplementalText?: string;
}): Promise<ImportRecipeActionState> {
  const url = input.url.trim();

  if (!url) {
    return { error: "Paste a recipe link first." };
  }

  const accessToken = await requireAccessToken();

  const response = await fetch(buildApiUrl("/ai/recipe-imports/structure"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      supplemental_text: input.supplementalText?.trim() || undefined,
    }),
    cache: "no-store",
  }).catch(() => null);

  if (!response?.ok) {
    return {
      error: await readErrorMessage(
        response,
        "Preppie could not import that link right now.",
      ),
    };
  }

  const payload = (await response.json()) as AiRecipeImportResult;

  return {
    result: payload,
  };
}
