"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { BaseRecipe, RecipeNutritionData } from "@cart/shared";
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
  amount: number;
  unit: string;
  display_ingredient: string | null;
  preparation: string | null;
  optional: boolean;
  group: string | null;
};

export type AiRecipeStep = {
  step: number;
  what_to_do: string;
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
  estimated_cost_tier: "low" | "medium" | "high";
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
  imported_recipe: AiRecipePreview;
  extraction_notes: string[];
};

export type ImportRecipeActionState = {
  error?: string;
  result?: AiRecipeImportResult;
};

export type RecipeCoverImageActionState = {
  imageUrl?: string;
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
    return { error: "Ask Chef something first." };
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
      error: await readErrorMessage(response, "Chef is unavailable right now."),
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

export async function getIngredientPrepAction(input: {
  recipeName: string;
  ingredients: {
    canonical_ingredient: string;
    display_ingredient: string | null;
    amount: number;
    unit: string;
  }[];
}): Promise<IngredientPrepActionState> {
  const ingredientList = input.ingredients
    .map(
      (i, idx) =>
        `${idx + 1}. ${i.amount} ${i.unit} ${i.display_ingredient ?? i.canonical_ingredient}`,
    )
    .join("\n");

  const message = `For each ingredient in "${input.recipeName}", write one short prep instruction (how to wash, cut, measure, or get it ready before cooking starts). Reply ONLY with a valid JSON array of strings, one instruction per ingredient in the exact same order listed. No markdown, no extra text.\n\nIngredients:\n${ingredientList}`;

  const result = await askChefAction({ message, history: [] });

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

export async function generateMealsAction(input: {
  mealPrompt: string;
  servingsPerMeal?: number;
  mealsNeeded?: number;
  mealStyle?:
    | "standard"
    | "inventory_first"
    | "high_protein"
    | "low_calorie"
    | "meal_prep"
    | "quick";
  budgetMode?: "minimize_cost" | "balanced" | "premium";
  notes?: string;
}): Promise<GenerateMealsActionState> {
  const mealPrompt = input.mealPrompt.trim();

  if (!mealPrompt) {
    return { error: "Give Chef a meal idea first." };
  }

  const accessToken = await requireAccessToken();

  const response = await fetch(buildApiUrl("/ai/meals/generate"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      meal_prompt: mealPrompt,
      servings_per_meal: input.servingsPerMeal ?? 4,
      meals_needed: input.mealsNeeded ?? 1,
      meal_style: input.mealStyle ?? "standard",
      budget_mode: input.budgetMode ?? "balanced",
      notes: input.notes ?? "",
    }),
    cache: "no-store",
  }).catch(() => null);

  if (!response?.ok) {
    return {
      error: await readErrorMessage(response, "Chef could not generate meals right now."),
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

function normalizeRecipeImageQuery(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function findSpoonacularCoverImage(recipeName: string) {
  const apiKey = process.env.SPOONACULAR_API_KEY;
  if (!apiKey) return undefined;

  const url = new URL("https://api.spoonacular.com/recipes/complexSearch");
  url.searchParams.set("query", recipeName);
  url.searchParams.set("number", "3");
  url.searchParams.set("apiKey", apiKey);

  const response = await fetch(url, { cache: "no-store" }).catch(() => null);
  if (!response?.ok) return undefined;

  const payload = (await response.json().catch(() => null)) as
    | {
        results?: Array<{
          title?: string | null;
          image?: string | null;
        }>;
      }
    | null;

  const results = payload?.results?.filter((recipe) => recipe.image) ?? [];
  if (results.length === 0) return undefined;

  const normalizedRecipeName = normalizeRecipeImageQuery(recipeName);
  const bestMatch =
    results.find(
      (recipe) => normalizeRecipeImageQuery(recipe.title ?? "") === normalizedRecipeName,
    ) ??
    results.find((recipe) => {
      const normalizedTitle = normalizeRecipeImageQuery(recipe.title ?? "");
      return (
        normalizedTitle.includes(normalizedRecipeName) ||
        normalizedRecipeName.includes(normalizedTitle)
      );
    }) ??
    results[0];

  return bestMatch?.image ?? undefined;
}

async function findMealDbCoverImage(recipeName: string) {
  const response = await fetch(
    `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(recipeName)}`,
    { cache: "no-store" },
  ).catch(() => null);

  if (!response?.ok) return undefined;

  const payload = (await response.json().catch(() => null)) as
    | {
        meals?: Array<{
          strMeal?: string | null;
          strMealThumb?: string | null;
        }> | null;
      }
    | null;

  const meals = payload?.meals?.filter((meal) => meal.strMealThumb) ?? [];
  if (meals.length === 0) return undefined;

  const normalizedRecipeName = normalizeRecipeImageQuery(recipeName);
  const bestMatch =
    meals.find((meal) => normalizeRecipeImageQuery(meal.strMeal ?? "") === normalizedRecipeName) ??
    meals.find((meal) => {
      const normalizedMeal = normalizeRecipeImageQuery(meal.strMeal ?? "");
      return (
        normalizedMeal.includes(normalizedRecipeName) ||
        normalizedRecipeName.includes(normalizedMeal)
      );
    }) ??
    meals[0];

  return bestMatch?.strMealThumb ?? undefined;
}

export async function findRecipeCoverImageAction(input: {
  recipeName: string;
}): Promise<RecipeCoverImageActionState> {
  const recipeName = input.recipeName.trim();
  if (!recipeName) return {};

  return {
    imageUrl:
      (await findSpoonacularCoverImage(recipeName)) ??
      (await findMealDbCoverImage(recipeName)),
  };
}

export async function fetchUserRecipesAction(): Promise<UserRecipesActionState> {
  const accessToken = await requireAccessToken();

  const response = await fetch(buildApiUrl("/recipes"), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  }).catch(() => null);

  if (!response?.ok) {
    return {
      error: await readErrorMessage(response, "Could not load your recipes right now."),
    };
  }

  const payload = (await response.json()) as
    | BaseRecipe[]
    | { data?: BaseRecipe[]; recipes?: BaseRecipe[] };
  const recipes = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.data)
      ? payload.data
      : Array.isArray(payload.recipes)
        ? payload.recipes
        : [];
  const ownedRecipes = recipes.filter((recipe) => !recipe.is_system_recipe);

  return {
    recipes: ownedRecipes,
  };
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
        "Chef could not import that link right now.",
      ),
    };
  }

  const payload = (await response.json()) as AiRecipeImportResult;

  return {
    result: payload,
  };
}

