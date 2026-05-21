DELETE FROM "Cuisine" AS cuisine
WHERE cuisine."label" ILIKE 'cuisines.map%'
  AND NOT EXISTS (
    SELECT 1
    FROM "BaseRecipe" AS recipe
    WHERE recipe."cuisineId" = cuisine."id"
  )
  AND NOT EXISTS (
    SELECT 1
    FROM "UserPreferredCuisine" AS preference
    WHERE preference."cuisineId" = cuisine."id"
  );

UPDATE "Cuisine"
SET "label" = 'Other',
    "kind" = 'other',
    "updatedAt" = NOW()
WHERE "label" ILIKE 'cuisines.map%';
