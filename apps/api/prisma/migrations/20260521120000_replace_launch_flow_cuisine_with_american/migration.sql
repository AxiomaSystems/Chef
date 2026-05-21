INSERT INTO "Cuisine" ("id", "slug", "label", "kind", "createdAt", "updatedAt")
VALUES ('cuisine-american', 'american', 'American', 'national', NOW(), NOW())
ON CONFLICT ("slug") DO UPDATE
SET
  "label" = EXCLUDED."label",
  "kind" = EXCLUDED."kind",
  "updatedAt" = NOW();

DO $$
DECLARE
  launch_id TEXT;
  american_id TEXT;
BEGIN
  SELECT "id" INTO launch_id
  FROM "Cuisine"
  WHERE "slug" = 'launch-flow-test'
     OR LOWER("label") = 'launch flow test'
  LIMIT 1;

  SELECT "id" INTO american_id
  FROM "Cuisine"
  WHERE "slug" = 'american'
  LIMIT 1;

  IF launch_id IS NOT NULL AND american_id IS NOT NULL AND launch_id <> american_id THEN
    UPDATE "BaseRecipe"
    SET "cuisineId" = american_id
    WHERE "cuisineId" = launch_id;

    INSERT INTO "UserPreferredCuisine" ("userId", "cuisineId", "createdAt")
    SELECT "userId", american_id, NOW()
    FROM "UserPreferredCuisine"
    WHERE "cuisineId" = launch_id
    ON CONFLICT ("userId", "cuisineId") DO NOTHING;

    DELETE FROM "UserPreferredCuisine"
    WHERE "cuisineId" = launch_id;

    DELETE FROM "Cuisine"
    WHERE "id" = launch_id;
  END IF;
END $$;
