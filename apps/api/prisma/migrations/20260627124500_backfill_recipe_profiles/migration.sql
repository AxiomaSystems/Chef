INSERT INTO "RecipePlanningProfile" (
  "recipeId",
  "difficulty",
  "difficultyReason",
  "prepTimeMinutes",
  "cookTimeMinutes",
  "totalTimeMinutes",
  "estimatedCostTier",
  "costNotes",
  "updatedAt"
)
SELECT
  recipe."id",
  CASE
    WHEN ingredient_counts.count + step_counts.count * 2 <= 13 THEN 'easy'::"RecipeDifficulty"
    WHEN ingredient_counts.count + step_counts.count * 2 <= 21 THEN 'medium'::"RecipeDifficulty"
    ELSE 'hard'::"RecipeDifficulty"
  END,
  ingredient_counts.count || ' ingredients and ' || step_counts.count || ' cooking steps from existing recipe data.',
  LEAST(35, 5 + ingredient_counts.count * 2),
  LEAST(75, GREATEST(10, step_counts.count * 8 + 5)),
  LEAST(110, 15 + ingredient_counts.count * 2 + step_counts.count * 8),
  CASE
    WHEN ingredient_names.names ~* '\m(shrimp|salmon|steak|pecan|parmesan|saffron|lamb)\M' THEN 'high'::"RecipeCostTier"
    WHEN ingredient_names.names ~* '\m(chicken|beef|fish|cheese|nut|nuts)\M' THEN 'medium'::"RecipeCostTier"
    ELSE 'low'::"RecipeCostTier"
  END,
  CASE
    WHEN ingredient_names.names ~* '\m(shrimp|salmon|steak|pecan|parmesan|saffron|lamb)\M' THEN '["Uses one or more premium ingredients relative to the catalog."]'::jsonb
    WHEN ingredient_names.names ~* '\m(chicken|beef|fish|cheese|nut|nuts)\M' THEN '["Uses common proteins or dairy with moderate relative cost."]'::jsonb
    ELSE '["Mostly pantry staples, grains, beans, or vegetables."]'::jsonb
  END,
  CURRENT_TIMESTAMP
FROM "BaseRecipe" recipe
CROSS JOIN LATERAL (
  SELECT COUNT(*)::integer AS count
  FROM "DishIngredient" ingredient
  WHERE ingredient."baseRecipeId" = recipe."id"
) ingredient_counts
CROSS JOIN LATERAL (
  SELECT COUNT(*)::integer AS count
  FROM "RecipeStep" step
  WHERE step."baseRecipeId" = recipe."id"
) step_counts
CROSS JOIN LATERAL (
  SELECT COALESCE(string_agg(ingredient."canonicalIngredient", ' '), '') AS names
  FROM "DishIngredient" ingredient
  WHERE ingredient."baseRecipeId" = recipe."id"
) ingredient_names
WHERE NOT EXISTS (
  SELECT 1
  FROM "RecipePlanningProfile" existing
  WHERE existing."recipeId" = recipe."id"
);

INSERT INTO "RecipeMealType" ("recipeId", "mealType")
SELECT recipe."id", inferred."mealType"::"MealType"
FROM "BaseRecipe" recipe
CROSS JOIN LATERAL (
  SELECT lower(
    recipe."name" || ' ' ||
    COALESCE(recipe."description", '') || ' ' ||
    COALESCE(string_agg(tag."slug" || ' ' || tag."name", ' '), '')
  ) AS value
  FROM "RecipeTag" recipe_tag
  JOIN "Tag" tag ON tag."id" = recipe_tag."tagId"
  WHERE recipe_tag."recipeId" = recipe."id"
) tag_text
CROSS JOIN LATERAL (
  SELECT CASE
    WHEN tag_text.value ~* '\m(breakfast|pancake|toast|oat)\M' THEN ARRAY['breakfast']
    WHEN tag_text.value ~* '\m(dessert|cake|cookie|sweet)\M' THEN ARRAY['dessert']
    WHEN tag_text.value ~* '\m(side|side-dish)\M' THEN ARRAY['side']
    WHEN tag_text.value ~* '\msnack\M' THEN ARRAY['snack']
    ELSE ARRAY['lunch', 'dinner']
  END AS meal_types
) meal_type_groups
CROSS JOIN LATERAL unnest(meal_type_groups.meal_types) AS inferred("mealType")
ON CONFLICT ("recipeId", "mealType") DO NOTHING;

INSERT INTO "RecipeProvenanceProfile" (
  "recipeId",
  "sourceType",
  "sourceName",
  "attributionLabel",
  "reviewStatus",
  "updatedAt"
)
SELECT
  recipe."id",
  CASE
    WHEN recipe."isSystemRecipe" THEN 'unknown'::"RecipeSourceType"
    ELSE 'user_created'::"RecipeSourceType"
  END,
  CASE WHEN recipe."isSystemRecipe" THEN 'Preppie' ELSE NULL END,
  CASE WHEN recipe."isSystemRecipe" THEN 'Curated by Preppie' ELSE NULL END,
  CASE
    WHEN recipe."isSystemRecipe" THEN 'trusted'::"RecipeReviewStatus"
    ELSE 'reviewed'::"RecipeReviewStatus"
  END,
  CURRENT_TIMESTAMP
FROM "BaseRecipe" recipe
WHERE NOT EXISTS (
  SELECT 1
  FROM "RecipeProvenanceProfile" existing
  WHERE existing."recipeId" = recipe."id"
);
