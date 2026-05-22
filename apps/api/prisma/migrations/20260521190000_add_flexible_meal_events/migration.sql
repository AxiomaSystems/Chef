CREATE TABLE "MealEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "mealLabel" TEXT NOT NULL DEFAULT 'dinner',
    "customLabel" TEXT,
    "sourceType" TEXT NOT NULL DEFAULT 'recipe',
    "recipeId" TEXT,
    "title" TEXT NOT NULL,
    "servings" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MealEvent_pkey" PRIMARY KEY ("id")
);

INSERT INTO "MealEvent" (
    "id",
    "userId",
    "date",
    "sortOrder",
    "mealLabel",
    "sourceType",
    "recipeId",
    "title",
    "servings",
    "status",
    "locked",
    "createdAt",
    "updatedAt"
)
SELECT
    CONCAT('mev_', SUBSTRING(MD5(CONCAT(plan."id", '-', day_entry.ordinality::text, '-', slot.label)), 1, 24)),
    plan."userId",
    (plan."weekStart"::date + ((day_entry.ordinality - 1)::int))::date,
    CASE slot.label
        WHEN 'breakfast' THEN 0
        WHEN 'lunch' THEN 1
        ELSE 2
    END,
    slot.label,
    'recipe',
    slot.recipe_id,
    INITCAP(slot.label),
    1,
    'planned',
    false,
    plan."createdAt",
    plan."updatedAt"
FROM "MealPlan" plan
CROSS JOIN LATERAL jsonb_array_elements(plan."days"::jsonb) WITH ORDINALITY AS day_entry(day_json, ordinality)
CROSS JOIN LATERAL (
    VALUES
        ('breakfast', day_entry.day_json->>'breakfast'),
        ('lunch', day_entry.day_json->>'lunch'),
        ('dinner', day_entry.day_json->>'dinner')
) AS slot(label, recipe_id)
WHERE slot.recipe_id IS NOT NULL AND slot.recipe_id <> ''
ON CONFLICT ("id") DO NOTHING;

CREATE INDEX "MealEvent_userId_date_sortOrder_idx" ON "MealEvent"("userId", "date", "sortOrder");
CREATE INDEX "MealEvent_userId_status_date_idx" ON "MealEvent"("userId", "status", "date");
CREATE INDEX "MealEvent_recipeId_idx" ON "MealEvent"("recipeId");

ALTER TABLE "MealEvent"
ADD CONSTRAINT "MealEvent_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MealEvent"
ADD CONSTRAINT "MealEvent_recipeId_fkey"
FOREIGN KEY ("recipeId") REFERENCES "BaseRecipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;
