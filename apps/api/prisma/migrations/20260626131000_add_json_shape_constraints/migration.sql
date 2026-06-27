-- JSON columns store snapshot/document contracts. These constraints enforce the
-- expected top-level JSON shape without normalizing the documents.
--
-- Applied and validated in Supabase first with short lock timeouts, then
-- recorded idempotently here. Nullable JSON fields allow SQL NULL and JSON null.

DO $$
DECLARE
  target record;
BEGIN
  FOR target IN
    SELECT *
    FROM (VALUES
      ('User', 'User_favoriteProteins_json_array_chk', '"favoriteProteins" IS NULL OR jsonb_typeof("favoriteProteins") IN (''array'', ''null'')'),
      ('User', 'User_favoriteFlavors_json_array_chk', '"favoriteFlavors" IS NULL OR jsonb_typeof("favoriteFlavors") IN (''array'', ''null'')'),
      ('User', 'User_dislikedIngredients_json_array_chk', '"dislikedIngredients" IS NULL OR jsonb_typeof("dislikedIngredients") IN (''array'', ''null'')'),
      ('User', 'User_dislikedTextures_json_array_chk', '"dislikedTextures" IS NULL OR jsonb_typeof("dislikedTextures") IN (''array'', ''null'')'),
      ('User', 'User_availableAppliances_json_array_chk', '"availableAppliances" IS NULL OR jsonb_typeof("availableAppliances") IN (''array'', ''null'')'),
      ('User', 'User_typicalMealTimes_json_array_chk', '"typicalMealTimes" IS NULL OR jsonb_typeof("typicalMealTimes") IN (''array'', ''null'')'),
      ('User', 'User_goalPriorities_json_array_chk', '"goalPriorities" IS NULL OR jsonb_typeof("goalPriorities") IN (''array'', ''null'')'),
      ('User', 'User_weeklyNutritionTargets_json_object_chk', '"weeklyNutritionTargets" IS NULL OR jsonb_typeof("weeklyNutritionTargets") IN (''object'', ''null'')'),
      ('User', 'User_preferredStores_json_array_chk', '"preferredStores" IS NULL OR jsonb_typeof("preferredStores") IN (''array'', ''null'')'),
      ('User', 'User_recipeDiscoverySources_json_array_chk', '"recipeDiscoverySources" IS NULL OR jsonb_typeof("recipeDiscoverySources") IN (''array'', ''null'')'),
      ('User', 'User_savedAddresses_json_array_chk', '"savedAddresses" IS NULL OR jsonb_typeof("savedAddresses") IN (''array'', ''null'')'),
      ('User', 'User_paymentCards_json_array_chk', '"paymentCards" IS NULL OR jsonb_typeof("paymentCards") IN (''array'', ''null'')'),
      ('Ingredient', 'Ingredient_aliases_json_array_chk', '"aliases" IS NULL OR jsonb_typeof("aliases") IN (''array'', ''null'')'),
      ('Ingredient', 'Ingredient_visionLabels_json_array_chk', '"visionLabels" IS NULL OR jsonb_typeof("visionLabels") IN (''array'', ''null'')'),
      ('CartDraft', 'CartDraft_selections_json_array_chk', 'jsonb_typeof("selections") = ''array'''),
      ('Cart', 'Cart_selections_json_array_chk', 'jsonb_typeof("selections") = ''array'''),
      ('Cart', 'Cart_dishes_json_array_chk', 'jsonb_typeof("dishes") = ''array'''),
      ('IngredientReview', 'IngredientReview_items_json_array_chk', 'jsonb_typeof("items") = ''array'''),
      ('ShoppingCart', 'ShoppingCart_overview_json_array_chk', 'jsonb_typeof("overview") = ''array'''),
      ('ShoppingCart', 'ShoppingCart_matchedItems_json_array_chk', 'jsonb_typeof("matchedItems") = ''array'''),
      ('MealPlan', 'MealPlan_days_json_array_chk', 'jsonb_typeof("days") = ''array'''),
      ('Capture', 'Capture_attribution_json_object_chk', 'jsonb_typeof("attribution") = ''object'''),
      ('Capture', 'Capture_recipePreview_json_object_chk', '"recipePreview" IS NULL OR jsonb_typeof("recipePreview") IN (''object'', ''null'')'),
      ('Capture', 'Capture_assumptions_json_array_chk', 'jsonb_typeof("assumptions") = ''array'''),
      ('Capture', 'Capture_missingInfo_json_array_chk', 'jsonb_typeof("missingInfo") = ''array'''),
      ('Capture', 'Capture_nextActions_json_array_chk', 'jsonb_typeof("nextActions") = ''array'''),
      ('Capture', 'Capture_extractionNotes_json_array_chk', 'jsonb_typeof("extractionNotes") = ''array'''),
      ('Capture', 'Capture_shortSnippets_json_array_chk', 'jsonb_typeof("shortSnippets") = ''array'''),
      ('VisionObservation', 'VisionObservation_bbox_json_object_chk', '"bbox" IS NULL OR jsonb_typeof("bbox") IN (''object'', ''null'')'),
      ('VisionObservation', 'VisionObservation_rawPayload_json_object_chk', '"rawPayload" IS NULL OR jsonb_typeof("rawPayload") IN (''object'', ''null'')')
    ) AS constraints(table_name, constraint_name, check_expression)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = target.constraint_name
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I CHECK (%s) NOT VALID',
        target.table_name,
        target.constraint_name,
        target.check_expression
      );
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE
  target record;
BEGIN
  FOR target IN
    SELECT conrelid::regclass::text AS table_name, conname AS constraint_name
    FROM pg_constraint
    WHERE conname IN (
      'User_favoriteProteins_json_array_chk',
      'User_favoriteFlavors_json_array_chk',
      'User_dislikedIngredients_json_array_chk',
      'User_dislikedTextures_json_array_chk',
      'User_availableAppliances_json_array_chk',
      'User_typicalMealTimes_json_array_chk',
      'User_goalPriorities_json_array_chk',
      'User_weeklyNutritionTargets_json_object_chk',
      'User_preferredStores_json_array_chk',
      'User_recipeDiscoverySources_json_array_chk',
      'User_savedAddresses_json_array_chk',
      'User_paymentCards_json_array_chk',
      'Ingredient_aliases_json_array_chk',
      'Ingredient_visionLabels_json_array_chk',
      'CartDraft_selections_json_array_chk',
      'Cart_selections_json_array_chk',
      'Cart_dishes_json_array_chk',
      'IngredientReview_items_json_array_chk',
      'ShoppingCart_overview_json_array_chk',
      'ShoppingCart_matchedItems_json_array_chk',
      'MealPlan_days_json_array_chk',
      'Capture_attribution_json_object_chk',
      'Capture_recipePreview_json_object_chk',
      'Capture_assumptions_json_array_chk',
      'Capture_missingInfo_json_array_chk',
      'Capture_nextActions_json_array_chk',
      'Capture_extractionNotes_json_array_chk',
      'Capture_shortSnippets_json_array_chk',
      'VisionObservation_bbox_json_object_chk',
      'VisionObservation_rawPayload_json_object_chk'
    )
      AND convalidated IS FALSE
  LOOP
    EXECUTE format(
      'ALTER TABLE %s VALIDATE CONSTRAINT %I',
      target.table_name,
      target.constraint_name
    );
  END LOOP;
END $$;
