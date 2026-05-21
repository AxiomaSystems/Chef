import type { BaseRecipe, HomeRecipeRecommendations } from '@cart/shared';

export type RecipeRecommendationProfile = {
  preferredCuisineIds: string[];
  preferredTagIds: string[];
  favoriteProteins: string[];
  favoriteFlavors: string[];
  dislikedIngredients: string[];
  preferredCookingTime?: string | null;
  goalPriorities: string[];
  hardAvoidLabels: string[];
};

type ScoredRecipe = {
  recipe: BaseRecipe;
  score: number;
  reason: string;
};

export function buildHomeRecipeRecommendations(
  recipes: BaseRecipe[],
  profile: RecipeRecommendationProfile | null,
): HomeRecipeRecommendations {
  const safeRecipes = profile
    ? recipes.filter((recipe) => !violatesHardAvoid(recipe, profile))
    : recipes;
  const hero = pickHeroRecipe(safeRecipes, profile);
  const picked = profile
    ? safeRecipes
        .filter((recipe) => recipe.id !== hero?.id)
        .map((recipe) => scoreRecipe(recipe, profile))
        .filter((entry) => entry.score > 0)
        .sort(compareScoredRecipes)
        .slice(0, 4)
    : [];
  const usedIds = new Set([
    ...(hero ? [hero.id] : []),
    ...picked.map((entry) => entry.recipe.id),
  ]);
  const trending = safeRecipes
    .filter((recipe) => !usedIds.has(recipe.id))
    .sort(compareTrendingRecipes)
    .slice(0, 6);

  for (const recipe of trending) usedIds.add(recipe.id);

  const moreToCook = safeRecipes
    .filter((recipe) => !usedIds.has(recipe.id))
    .slice(0, 6);

  return {
    hero,
    picked_for_you: picked,
    trending,
    more_to_cook: moreToCook,
  };
}

function pickHeroRecipe(
  recipes: BaseRecipe[],
  profile: RecipeRecommendationProfile | null,
): BaseRecipe | null {
  if (recipes.length === 0) return null;
  if (!profile) return recipes[0] ?? null;

  return (
    recipes
      .map((recipe) => scoreRecipe(recipe, profile))
      .sort(compareScoredRecipes)[0]?.recipe ??
    recipes[0] ??
    null
  );
}

function scoreRecipe(
  recipe: BaseRecipe,
  profile: RecipeRecommendationProfile,
): ScoredRecipe {
  let score = 0;
  const reasons: string[] = [];
  const recipeText = buildRecipeText(recipe);
  const tagIds = new Set(recipe.tag_ids);

  if (profile.preferredCuisineIds.includes(recipe.cuisine_id)) {
    score += 8;
    reasons.push(`${recipe.cuisine.label} preference`);
  }

  for (const tag of recipe.tags) {
    if (profile.preferredTagIds.includes(tag.id)) {
      score += tag.kind === 'dietary_badge' ? 6 : 4;
      reasons.push(tag.name);
    }
  }

  for (const protein of profile.favoriteProteins) {
    const normalized = normalizeSearchText(protein);
    if (normalized && recipeText.includes(normalized)) {
      score += 3;
      reasons.push(`Likes ${humanizePreference(protein)}`);
    }
  }

  for (const flavor of profile.favoriteFlavors) {
    const normalized = normalizeSearchText(flavor);
    if (normalized && recipeText.includes(normalized)) {
      score += 2;
      reasons.push(humanizePreference(flavor));
    }
  }

  for (const disliked of profile.dislikedIngredients) {
    const normalized = normalizeSearchText(disliked);
    if (normalized && recipeText.includes(normalized)) {
      score -= 8;
    }
  }

  if (
    profile.preferredCookingTime === 'under_15_min' &&
    minutesFor(recipe) <= 20
  ) {
    score += 2;
    reasons.push('Quick cook');
  }

  if (
    profile.preferredCookingTime === '15_to_30_min' &&
    minutesFor(recipe) <= 30
  ) {
    score += 2;
    reasons.push('Weeknight timing');
  }

  if (
    profile.goalPriorities.includes('build_muscle') &&
    (recipe.nutrition_data?.protein_g ?? 0) >= 25
  ) {
    score += 3;
    reasons.push('High protein');
  }

  if (
    profile.goalPriorities.includes('eat_healthier') &&
    (recipe.nutrition_data?.fiber_g ?? 0) >= 5
  ) {
    score += 2;
    reasons.push('Fiber-rich');
  }

  return {
    recipe,
    score,
    reason: dedupeReasons(reasons)[0] ?? recipe.cuisine.label,
  };
}

function violatesHardAvoid(
  recipe: BaseRecipe,
  profile: RecipeRecommendationProfile,
): boolean {
  const recipeText = buildRecipeText(recipe);

  return profile.hardAvoidLabels.some((label) => {
    const normalized = normalizeSearchText(label);
    return normalized.length > 1 && recipeText.includes(normalized);
  });
}

function compareScoredRecipes(left: ScoredRecipe, right: ScoredRecipe) {
  if (right.score !== left.score) return right.score - left.score;
  return compareRecipeDates(left.recipe, right.recipe);
}

function compareTrendingRecipes(left: BaseRecipe, right: BaseRecipe) {
  if (left.is_system_recipe !== right.is_system_recipe) {
    return left.is_system_recipe ? -1 : 1;
  }

  return compareRecipeDates(left, right);
}

function compareRecipeDates(left: BaseRecipe, right: BaseRecipe) {
  const rightTime = Date.parse(right.created_at);
  const leftTime = Date.parse(left.created_at);
  if (rightTime !== leftTime) return rightTime - leftTime;
  return right.id.localeCompare(left.id);
}

function minutesFor(recipe: BaseRecipe) {
  return Math.max(20, recipe.steps.length * 7);
}

function buildRecipeText(recipe: BaseRecipe) {
  return [
    recipe.name,
    recipe.description,
    recipe.cuisine.label,
    ...recipe.tags.map((tag) => tag.name),
    ...recipe.ingredients.map((ingredient) => ingredient.canonical_ingredient),
    ...recipe.ingredients.map((ingredient) => ingredient.display_ingredient),
  ]
    .filter(Boolean)
    .map((value) => normalizeSearchText(String(value)))
    .join(' ');
}

function normalizeSearchText(value: string) {
  return value.replaceAll('_', ' ').trim().toLowerCase();
}

function humanizePreference(value: string) {
  return normalizeSearchText(value)
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function dedupeReasons(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}
