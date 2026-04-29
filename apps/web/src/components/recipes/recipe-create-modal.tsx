"use client";

import { useRef, useState, useTransition } from "react";
import type { BaseRecipe, Cuisine, Tag } from "@cart/shared";
import { createRecipeAction, updateRecipeAction } from "@/app/home-actions";
import { generateMealsAction, type AiRecipePreview } from "@/app/ai-actions";

type IngredientRow = {
  canonical_ingredient: string;
  amount: string;
  unit: string;
  preparation: string;
  optional: boolean;
};
type StepRow = { what_to_do: string };

const UNITS = [
  "cup",
  "tbsp",
  "tsp",
  "g",
  "kg",
  "ml",
  "l",
  "oz",
  "lb",
  "piece",
  "clove",
  "slice",
  "handful",
  "pinch",
  "to taste",
];

export function RecipeCreateModal({
  cuisines,
  tags,
  onClose,
  onCreated,
  initialRecipe,
}: {
  cuisines: Cuisine[];
  tags: Tag[];
  onClose: () => void;
  onCreated: (recipe: BaseRecipe) => void;
  initialRecipe?: BaseRecipe | null;
}) {
  const isEditing = !!initialRecipe;
  const dietaryTags = tags.filter((tag) => tag.kind === "dietary_badge");

  const [name, setName] = useState(initialRecipe?.name ?? "");
  const [description, setDescription] = useState(
    initialRecipe?.description ?? "",
  );
  const [cuisineId, setCuisineId] = useState(
    initialRecipe?.cuisine_id ?? cuisines[0]?.id ?? "",
  );
  const initialCuisine = cuisines.find(
    (cuisine) => cuisine.id === (initialRecipe?.cuisine_id ?? cuisines[0]?.id),
  );
  const [cuisineQuery, setCuisineQuery] = useState(initialCuisine?.label ?? "");
  const [isCuisineMenuOpen, setIsCuisineMenuOpen] = useState(false);
  const [servings, setServings] = useState(
    initialRecipe?.servings !== undefined ? String(initialRecipe.servings) : "2",
  );
  const [coverImageUrl, setCoverImageUrl] = useState(
    initialRecipe?.cover_image_url ?? "",
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleImageFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setCoverImageUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    initialRecipe?.tag_ids ?? [],
  );
  const [ingredients, setIngredients] = useState<IngredientRow[]>(
    initialRecipe?.ingredients.map((ingredient) => ({
      canonical_ingredient: ingredient.canonical_ingredient,
      amount: String(ingredient.amount),
      unit: ingredient.unit,
      preparation: ingredient.preparation ?? "",
      optional: !!ingredient.optional,
    })) ?? [
      {
        canonical_ingredient: "",
        amount: "",
        unit: "cup",
        preparation: "",
        optional: false,
      },
    ],
  );
  const [steps, setSteps] = useState<StepRow[]>(
    initialRecipe?.steps.map((step) => ({
      what_to_do: step.what_to_do,
    })) ?? [{ what_to_do: "" }],
  );
  const [calories, setCalories] = useState(
    initialRecipe?.nutrition_data?.calories !== undefined
      ? String(initialRecipe.nutrition_data.calories)
      : "",
  );
  const [proteinG, setProteinG] = useState(
    initialRecipe?.nutrition_data?.protein_g !== undefined
      ? String(initialRecipe.nutrition_data.protein_g)
      : "",
  );
  const [carbsG, setCarbsG] = useState(
    initialRecipe?.nutrition_data?.carbs_g !== undefined
      ? String(initialRecipe.nutrition_data.carbs_g)
      : "",
  );
  const [fatG, setFatG] = useState(
    initialRecipe?.nutrition_data?.fat_g !== undefined
      ? String(initialRecipe.nutrition_data.fat_g)
      : "",
  );
  const [error, setError] = useState<string | undefined>();
  const [, startSave] = useTransition();
  const [isAutofilling, startAutofill] = useTransition();
  const [saving, setSaving] = useState(false);
  const [autofillHint, setAutofillHint] = useState<string | undefined>();
  const [lastAutofilledName, setLastAutofilledName] = useState("");

  function isLikelyEmptyRecipeDraft() {
    const hasDescription = description.trim().length > 0;
    const hasRealIngredients = ingredients.some(
      (row) => row.canonical_ingredient.trim() || row.amount.trim(),
    );
    const hasRealSteps = steps.some((row) => row.what_to_do.trim());
    const hasNutrition = calories || proteinG || carbsG || fatG;

    return (
      !hasDescription &&
      !hasRealIngredients &&
      !hasRealSteps &&
      !hasNutrition &&
      selectedTagIds.length === 0
    );
  }

  function normalizeCuisineText(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function findCuisineFromLabel(label: string) {
    const normalized = label.trim().toLowerCase();
    const searchable = normalizeCuisineText(label);

    if (!searchable) return null;

    const exactMatch = cuisines.find(
      (cuisine) =>
        cuisine.label.trim().toLowerCase() === normalized ||
        cuisine.slug.trim().toLowerCase() === normalized,
    );

    if (exactMatch) return exactMatch;

    const normalizedMatch = cuisines.find((cuisine) => {
      const labelText = normalizeCuisineText(cuisine.label);
      const slugText = normalizeCuisineText(cuisine.slug);
      return (
        labelText === searchable ||
        slugText === searchable ||
        labelText.includes(searchable) ||
        searchable.includes(labelText) ||
        slugText.includes(searchable) ||
        searchable.includes(slugText)
      );
    });

    if (normalizedMatch) return normalizedMatch;

    const searchWords = searchable.split(" ").filter(Boolean);
    const wordMatch = cuisines.find((cuisine) => {
      const cuisineWords = new Set(
        `${normalizeCuisineText(cuisine.label)} ${normalizeCuisineText(cuisine.slug)}`
          .split(" ")
          .filter(Boolean),
      );
      return searchWords.some((word) => cuisineWords.has(word));
    });

    return wordMatch ?? null;
  }

  function getFallbackCuisine() {
    return (
      cuisines.find((cuisine) => cuisine.slug === "other") ??
      cuisines.find((cuisine) => cuisine.kind === "other") ??
      cuisines.find(
        (cuisine) => cuisine.label.trim().toLowerCase() === "other",
      ) ??
      cuisines[0] ??
      null
    );
  }

  function resolveCuisineForText(label: string) {
    return findCuisineFromLabel(label) ?? getFallbackCuisine();
  }

  function handleCuisineQueryChange(nextQuery: string) {
    setCuisineQuery(nextQuery);
    setIsCuisineMenuOpen(true);
    const cuisine = nextQuery.trim() ? resolveCuisineForText(nextQuery) : null;
    setCuisineId(cuisine?.id ?? "");
  }

  function commitCuisineQuery() {
    const matchedCuisine = findCuisineFromLabel(cuisineQuery);

    if (matchedCuisine) {
      setCuisineId(matchedCuisine.id);
      setCuisineQuery(matchedCuisine.label);
      return;
    }

    if (cuisineQuery.trim()) {
      setCuisineId(getFallbackCuisine()?.id ?? "");
    }

    setIsCuisineMenuOpen(false);
  }

  function parseServings(value: string, fallback = 2) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  const filteredCuisines = cuisines.filter((cuisine) => {
    const query = normalizeCuisineText(cuisineQuery);
    if (!query) return true;
    const label = normalizeCuisineText(cuisine.label);
    const slug = normalizeCuisineText(cuisine.slug);
    return label.includes(query) || slug.includes(query);
  });

  const cuisineOptions =
    filteredCuisines.length > 0 ? filteredCuisines : cuisines.slice(0, 8);

  function chooseCuisine(cuisine: Cuisine) {
    setCuisineId(cuisine.id);
    setCuisineQuery(cuisine.label);
    setIsCuisineMenuOpen(false);
  }

  function handleServingsChange(nextValue: string) {
    if (/^\d*$/.test(nextValue)) {
      setServings(nextValue);
    }
  }

  function normalizeServings() {
    setServings((prev) => String(parseServings(prev)));
  }

  function getAutofillServings() {
    return parseServings(servings);
  }

  function getSubmitServings() {
    return parseServings(servings);
  }

  function applyCuisineFromAi(label: string) {
    const matchedCuisine = findCuisineFromLabel(label);

    if (matchedCuisine) {
      setCuisineId(matchedCuisine.id);
      setCuisineQuery(matchedCuisine.label);
      return;
    }

    setCuisineId(getFallbackCuisine()?.id ?? "");
    setCuisineQuery(label.trim());
  }

  function getSelectedCuisineLabel() {
    return cuisines.find((cuisine) => cuisine.id === cuisineId)?.label ?? "";
  }

  function isCuisineQueryValid() {
    return !!cuisineId && cuisineQuery.trim() === getSelectedCuisineLabel();
  }

  function shouldShowCuisineOptions() {
    return (
      isCuisineMenuOpen &&
      cuisineQuery.trim().length > 0 &&
      !isCuisineQueryValid() &&
      cuisineOptions.length > 0
    );
  }

  function findTagIdsFromNames(nextTags: string[]) {
    const normalizedTags = nextTags.map((tag) => tag.trim().toLowerCase());

    return dietaryTags
      .filter((tag) => normalizedTags.includes(tag.name.trim().toLowerCase()))
      .map((tag) => tag.id);
  }

  function applyAiRecipePreview(recipe: AiRecipePreview) {
    setDescription(recipe.description ?? "");
    applyCuisineFromAi(recipe.cuisine);
    setServings(String(recipe.servings > 0 ? recipe.servings : 2));
    setIngredients(
      recipe.ingredients.length > 0
        ? recipe.ingredients.map((ingredient) => ({
            canonical_ingredient: ingredient.canonical_ingredient,
            amount: String(ingredient.amount),
            unit: ingredient.unit || "cup",
            preparation: ingredient.preparation ?? "",
            optional: !!ingredient.optional,
          }))
        : [
            {
              canonical_ingredient: "",
              amount: "",
              unit: "cup",
              preparation: "",
              optional: false,
            },
          ],
    );
    setSteps(
      recipe.steps.length > 0
        ? recipe.steps.map((step) => ({
            what_to_do: step.what_to_do,
          }))
        : [{ what_to_do: "" }],
    );
    setSelectedTagIds(findTagIdsFromNames(recipe.tags ?? []));
    setCalories(
      recipe.nutrition_estimate?.calories !== undefined
        ? String(recipe.nutrition_estimate.calories)
        : "",
    );
    setProteinG(
      recipe.nutrition_estimate?.protein_g !== undefined
        ? String(recipe.nutrition_estimate.protein_g)
        : "",
    );
    setCarbsG(
      recipe.nutrition_estimate?.carbs_g !== undefined
        ? String(recipe.nutrition_estimate.carbs_g)
        : "",
    );
    setFatG(
      recipe.nutrition_estimate?.fat_g !== undefined
        ? String(recipe.nutrition_estimate.fat_g)
        : "",
    );
  }

  function autofillFromName(trigger: "auto" | "manual") {
    const normalizedName = name.trim();

    if (!normalizedName || isEditing || isAutofilling) return;
    if (trigger === "auto" && !isLikelyEmptyRecipeDraft()) return;
    if (trigger === "auto" && lastAutofilledName === normalizedName) return;

    setError(undefined);
    setAutofillHint(undefined);

    startAutofill(async () => {
      const result = await generateMealsAction({
        mealPrompt: normalizedName,
        mealsNeeded: 1,
        servingsPerMeal: getAutofillServings(),
        mealStyle: "standard",
        notes:
          "Return one practical recipe preview suitable for pre-filling a manual recipe creation form.",
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      const recipe = result.recipes?.[0];
      if (!recipe) {
        setError("Chef could not generate a recipe draft from that name.");
        return;
      }

      applyAiRecipePreview(recipe);
      setLastAutofilledName(normalizedName);
      setAutofillHint(
        trigger === "auto"
          ? "Chef filled in the rest of the form from the recipe name."
          : "Chef refreshed the recipe draft with AI suggestions.",
      );
    });
  }

  function updateIngredient<K extends keyof IngredientRow>(
    i: number,
    key: K,
    val: IngredientRow[K],
  ) {
    setIngredients((prev) =>
      prev.map((row, idx) => (idx === i ? { ...row, [key]: val } : row)),
    );
  }

  function addIngredient() {
    setIngredients((prev) => [
      ...prev,
      {
        canonical_ingredient: "",
        amount: "",
        unit: "cup",
        preparation: "",
        optional: false,
      },
    ]);
  }

  function removeIngredient(i: number) {
    setIngredients((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateStep(i: number, val: string) {
    setSteps((prev) =>
      prev.map((row, idx) => (idx === i ? { what_to_do: val } : row)),
    );
  }

  function addStep() {
    setSteps((prev) => [...prev, { what_to_do: "" }]);
  }

  function removeStep(i: number) {
    setSteps((prev) => prev.filter((_, idx) => idx !== i));
  }

  function toggleTag(id: string) {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((tagId) => tagId !== id) : [...prev, id],
    );
  }

  function handleSubmit() {
    setError(undefined);

    if (!name.trim()) {
      setError("Recipe name is required.");
      return;
    }

    const resolvedCuisineId =
      cuisineId || (cuisineQuery.trim() ? getFallbackCuisine()?.id : "");

    if (!resolvedCuisineId) {
      setError("Cuisine is required.");
      return;
    }

    const normalizedServingCount = getSubmitServings();

    const validIngredients = ingredients.filter(
      (row) => row.canonical_ingredient.trim() && row.amount && row.unit,
    );
    if (validIngredients.length === 0) {
      setError("Add at least one ingredient.");
      return;
    }

    const validSteps = steps.filter((step) => step.what_to_do.trim());
    if (validSteps.length === 0) {
      setError("Add at least one preparation step.");
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      cuisine_id: resolvedCuisineId,
      servings: normalizedServingCount,
      cover_image_url: coverImageUrl.trim() || undefined,
      tag_ids: selectedTagIds.length ? selectedTagIds : undefined,
      ingredients: validIngredients.map((row) => ({
        canonical_ingredient: row.canonical_ingredient.trim(),
        amount: parseFloat(row.amount),
        unit: row.unit,
        preparation: row.preparation.trim() || undefined,
        optional: row.optional || undefined,
      })),
      steps: validSteps.map((step, index) => ({
        step: index + 1,
        what_to_do: step.what_to_do.trim(),
      })),
      nutrition_data:
        calories || proteinG || carbsG || fatG
          ? {
              calories: calories ? parseFloat(calories) : undefined,
              protein_g: proteinG ? parseFloat(proteinG) : undefined,
              carbs_g: carbsG ? parseFloat(carbsG) : undefined,
              fat_g: fatG ? parseFloat(fatG) : undefined,
            }
          : undefined,
    };

    setSaving(true);
    startSave(async () => {
      const result =
        isEditing && initialRecipe?.id
          ? await updateRecipeAction(initialRecipe.id, payload)
          : await createRecipeAction(payload);
      setSaving(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.recipe) {
        onCreated(result.recipe);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div
        className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative flex max-h-[95vh] w-full flex-col overflow-hidden rounded-t-2xl bg-background shadow-2xl sm:max-h-[90vh] sm:max-w-2xl sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-outline-variant/30 px-6 py-4">
          <div>
            <h2 className="text-headline-sm font-bold text-on-surface">
              {isEditing ? "Edit Recipe" : "Create Recipe"}
            </h2>
            <p className="mt-0.5 text-body-sm text-outline">
              {isEditing
                ? "Update your recipe details and save changes"
                : "Build your own culinary masterpiece"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-surface-container"
          >
            <span className="material-symbols-outlined text-[20px] text-outline">
              close
            </span>
          </button>
        </div>

        <div className="flex-1 space-y-7 overflow-y-auto px-6 py-6">
          {error && (
            <div className="rounded-xl bg-error-container p-3 text-body-sm text-on-error-container">
              {error}
            </div>
          )}
          {autofillHint && (
            <div className="rounded-xl bg-primary-surface p-3 text-body-sm text-on-surface">
              {autofillHint}
            </div>
          )}

          <section className="space-y-4">
            <h3 className="border-b border-outline-variant/30 pb-2 text-label-lg font-bold text-on-surface">
              Basics
            </h3>

            <div className="space-y-1">
              <label className="text-label-sm uppercase tracking-wide text-outline">
                Recipe Name *
              </label>
              <input
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setAutofillHint(undefined);
                }}
                onBlur={() => autofillFromName("auto")}
                placeholder="e.g. Lemon Herb Salmon"
                className="w-full rounded-xl border border-outline-variant/50 bg-white px-4 py-2.5 text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {!isEditing && (
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-[11px] leading-5 text-outline">
                    Enter a recipe name and Chef can draft the rest automatically.
                  </p>
                  <button
                    type="button"
                    onClick={() => autofillFromName("manual")}
                    disabled={!name.trim() || isAutofilling}
                    className="flex shrink-0 items-center gap-1.5 rounded-full border border-outline-variant/50 bg-white px-3 py-1.5 text-[11px] font-semibold text-primary transition-colors hover:bg-primary-surface disabled:opacity-50"
                  >
                    {isAutofilling ? (
                      <span className="material-symbols-outlined animate-spin text-[14px]">
                        refresh
                      </span>
                    ) : (
                      <span className="material-symbols-outlined text-[14px]">
                        auto_awesome
                      </span>
                    )}
                    {isAutofilling ? "Drafting..." : "Autofill with AI"}
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-label-sm uppercase tracking-wide text-outline">
                Description
              </label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="A brief description of the dish..."
                rows={2}
                className="w-full resize-none rounded-xl border border-outline-variant/50 bg-white px-4 py-2.5 text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-label-sm uppercase tracking-wide text-outline">
                  Cuisine *
                </label>
                <div className="relative">
                  <input
                    value={cuisineQuery}
                    onChange={(event) =>
                      handleCuisineQueryChange(event.target.value)
                    }
                    onFocus={() => setIsCuisineMenuOpen(true)}
                    onBlur={commitCuisineQuery}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === "Escape") {
                        event.currentTarget.blur();
                      }
                    }}
                    list="recipe-cuisine-options"
                    placeholder="Type a cuisine"
                    className="w-full rounded-xl border border-outline-variant/50 bg-white px-4 py-2.5 text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <datalist id="recipe-cuisine-options">
                    {cuisines.map((cuisine) => (
                      <option key={cuisine.id} value={cuisine.label} />
                    ))}
                  </datalist>
                  {shouldShowCuisineOptions() && (
                    <div className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-xl border border-outline-variant/50 bg-white py-1 shadow-lg">
                      {cuisineOptions.slice(0, 8).map((cuisine) => (
                        <button
                          key={cuisine.id}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => chooseCuisine(cuisine)}
                          className="block w-full px-4 py-2 text-left text-body-sm text-on-surface transition-colors hover:bg-surface-container-low"
                        >
                          {cuisine.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-label-sm uppercase tracking-wide text-outline">
                  Servings *
                </label>
                <input
                  type="number"
                  min={1}
                  value={servings}
                  onChange={(event) => handleServingsChange(event.target.value)}
                  onBlur={normalizeServings}
                  className="w-full rounded-xl border border-outline-variant/50 bg-white px-4 py-2.5 text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-label-sm uppercase tracking-wide text-outline">
                Cover Image
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageFile}
              />
              {coverImageUrl ? (
                <div className="relative overflow-hidden rounded-xl border border-outline-variant/50">
                  <img
                    src={coverImageUrl}
                    alt="Cover preview"
                    className="h-32 w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setCoverImageUrl("");
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-black/70"
                  >
                    <span className="material-symbols-outlined text-[12px]">edit</span>
                    Change
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-outline-variant/50 bg-white px-4 py-6 text-body-sm text-outline transition-colors hover:bg-surface-container-low"
                >
                  <span className="material-symbols-outlined text-[20px]">add_photo_alternate</span>
                  Upload cover image
                </button>
              )}
            </div>
          </section>

          {tags.length > 0 && (
            <section className="space-y-3">
              <h3 className="border-b border-outline-variant/30 pb-2 text-label-lg font-bold text-on-surface">
                Dietary Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {tags
                  .filter((tag) => tag.kind === "dietary_badge")
                  .map((tag) => {
                    const selected = selectedTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className={`rounded-full px-3 py-1.5 text-label-sm font-semibold transition-all ${
                          selected
                            ? "bg-primary text-on-primary"
                            : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                        }`}
                      >
                        {tag.name}
                      </button>
                    );
                  })}
              </div>
            </section>
          )}

          <section className="space-y-3">
            <h3 className="border-b border-outline-variant/30 pb-2 text-label-lg font-bold text-on-surface">
              Ingredients *
            </h3>

            <div className="space-y-2">
              {ingredients.map((row, i) => (
                <div key={i} className="flex items-start gap-2">
                  <input
                    value={row.canonical_ingredient}
                    onChange={(event) =>
                      updateIngredient(
                        i,
                        "canonical_ingredient",
                        event.target.value,
                      )
                    }
                    placeholder="Ingredient"
                    className="flex-1 rounded-xl border border-outline-variant/50 bg-white px-3 py-2 text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <input
                    type="number"
                    min={0}
                    step={0.25}
                    value={row.amount}
                    onChange={(event) =>
                      updateIngredient(i, "amount", event.target.value)
                    }
                    placeholder="Qty"
                    className="w-20 rounded-xl border border-outline-variant/50 bg-white px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <select
                    value={row.unit}
                    onChange={(event) =>
                      updateIngredient(i, "unit", event.target.value)
                    }
                    className="w-28 rounded-xl border border-outline-variant/50 bg-white px-2 py-2 text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {UNITS.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeIngredient(i)}
                    disabled={ingredients.length === 1}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-outline transition-colors hover:bg-error-container/30 hover:text-error disabled:opacity-30"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      delete
                    </span>
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={addIngredient}
              className="flex items-center gap-2 text-label-sm font-semibold text-primary transition-colors hover:text-on-primary-container"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Add ingredient
            </button>
          </section>

          <section className="space-y-3">
            <h3 className="border-b border-outline-variant/30 pb-2 text-label-lg font-bold text-on-surface">
              Preparation Steps *
            </h3>

            <div className="space-y-3">
              {steps.map((row, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-fixed-dim text-label-sm font-bold text-on-primary-fixed">
                    {i + 1}
                  </div>
                  <textarea
                    value={row.what_to_do}
                    onChange={(event) => updateStep(i, event.target.value)}
                    placeholder={`Describe step ${i + 1}...`}
                    rows={2}
                    className="flex-1 resize-none rounded-xl border border-outline-variant/50 bg-white px-3 py-2 text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    onClick={() => removeStep(i)}
                    disabled={steps.length === 1}
                    className="mt-1 flex h-9 w-9 items-center justify-center rounded-xl text-outline transition-colors hover:bg-error-container/30 hover:text-error disabled:opacity-30"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      delete
                    </span>
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={addStep}
              className="flex items-center gap-2 text-label-sm font-semibold text-primary transition-colors hover:text-on-primary-container"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Add step
            </button>
          </section>

          <section className="space-y-3">
            <h3 className="border-b border-outline-variant/30 pb-2 text-label-lg font-bold text-on-surface">
              Nutrition <span className="text-body-sm font-normal text-outline">(optional)</span>
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Calories", calories, setCalories],
                ["Protein g", proteinG, setProteinG],
                ["Carbs g", carbsG, setCarbsG],
                ["Fat g", fatG, setFatG],
              ].map(([label, value, setter]) => (
                <div key={String(label)} className="space-y-1">
                  <label className="text-label-sm text-outline">
                    {String(label)}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={String(value)}
                    onChange={(event) =>
                      (setter as (next: string) => void)(event.target.value)
                    }
                    placeholder="-"
                    className="w-full rounded-xl border border-outline-variant/50 bg-white px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="flex shrink-0 justify-end gap-3 border-t border-outline-variant/30 bg-white px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-full border border-outline-variant px-5 py-2.5 text-label-md text-on-surface-variant transition-colors hover:bg-surface-container-low"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-label-md font-semibold text-on-primary transition-colors hover:bg-on-primary-container disabled:opacity-50"
          >
            {saving && (
              <span className="material-symbols-outlined animate-spin text-[16px]">
                refresh
              </span>
            )}
            {saving
              ? isEditing
                ? "Saving..."
                : "Creating..."
              : isEditing
                ? "Save Changes"
                : "Create Recipe"}
          </button>
        </div>
      </div>
    </div>
  );
}
