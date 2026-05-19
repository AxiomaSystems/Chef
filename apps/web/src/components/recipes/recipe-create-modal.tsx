"use client";

import { useRef, useState, useTransition } from "react";
import type {
  BaseRecipe,
  CaptureRecipePreview,
  Cuisine,
  Tag,
} from "@cart/shared";
import { createRecipeAction, updateRecipeAction } from "@/app/home-actions";
import {
  fetchUnsplashImageAction,
  generateMealsAction,
  type AiRecipePreview,
} from "@/app/ai-actions";

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

function normalizeTagName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function normalizeTagSlug(name: string) {
  return normalizeTagName(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isUserFacingImportedTag(name: string) {
  const slug = normalizeTagSlug(name);
  return ![
    "instagram",
    "tiktok",
    "youtube",
    "social",
    "unverified",
    "insufficient-data",
    "imported",
    "unknown",
  ].includes(slug);
}

function normalizeCuisineTextForInitialMatch(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveInitialCuisineForText(cuisines: Cuisine[], label: string) {
  const normalized = label.trim().toLowerCase();
  const searchable = normalizeCuisineTextForInitialMatch(label);

  if (!searchable) return null;

  const exactMatch = cuisines.find(
    (cuisine) =>
      cuisine.label.trim().toLowerCase() === normalized ||
      cuisine.slug.trim().toLowerCase() === normalized,
  );

  if (exactMatch) return exactMatch;

  return (
    cuisines.find((cuisine) => {
      const labelText = normalizeCuisineTextForInitialMatch(cuisine.label);
      const slugText = normalizeCuisineTextForInitialMatch(cuisine.slug);
      return (
        labelText === searchable ||
        slugText === searchable ||
        labelText.includes(searchable) ||
        searchable.includes(labelText) ||
        slugText.includes(searchable) ||
        searchable.includes(slugText)
      );
    }) ??
    cuisines.find((cuisine) => cuisine.slug === "other") ??
    cuisines.find((cuisine) => cuisine.kind === "other") ??
    cuisines[0] ??
    null
  );
}

export function RecipeCreateModal({
  cuisines,
  tags,
  onClose,
  onCreated,
  initialRecipe,
  initialDraft,
  presentation = "modal",
}: {
  cuisines: Cuisine[];
  tags: Tag[];
  onClose: () => void;
  onCreated: (recipe: BaseRecipe) => void;
  initialRecipe?: BaseRecipe | null;
  initialDraft?: CaptureRecipePreview | null;
  presentation?: "modal" | "page";
}) {
  const isPage = presentation === "page";
  const isEditing = !!initialRecipe;
  const dietaryTags = tags.filter((tag) => tag.kind === "dietary_badge");
  const draftCuisine = initialDraft?.cuisine
    ? resolveInitialCuisineForText(cuisines, initialDraft.cuisine)
    : null;
  const initialCuisineId =
    initialRecipe?.cuisine_id ?? draftCuisine?.id ?? cuisines[0]?.id ?? "";

  const [name, setName] = useState(
    initialRecipe?.name ?? initialDraft?.name ?? "",
  );
  const [description, setDescription] = useState(
    initialRecipe?.description ?? initialDraft?.description ?? "",
  );
  const [cuisineId, setCuisineId] = useState(initialCuisineId);
  const initialCuisine = cuisines.find(
    (cuisine) => cuisine.id === initialCuisineId,
  );
  const [cuisineQuery, setCuisineQuery] = useState(
    initialCuisine?.label ?? initialDraft?.cuisine ?? "",
  );
  const [isCuisineMenuOpen, setIsCuisineMenuOpen] = useState(false);
  const [servings, setServings] = useState(
    initialRecipe?.servings !== undefined
      ? String(initialRecipe.servings)
      : initialDraft?.servings !== undefined
        ? String(initialDraft.servings)
        : "2",
  );
  const [coverImageUrl, setCoverImageUrl] = useState(
    initialRecipe?.cover_image_url ?? initialDraft?.cover_image_url ?? "",
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverImageSourceRef = useRef<"ai" | "upload" | "initial" | null>(
    initialRecipe?.cover_image_url || initialDraft?.cover_image_url
      ? "initial"
      : null,
  );
  const uploadVersionRef = useRef(0);

  function openFilePicker() {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  }

  function handleImageFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(undefined);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result !== "string") {
        setError("Chef could not read that image file.");
        return;
      }
      uploadVersionRef.current += 1;
      coverImageSourceRef.current = "upload";
      setCoverImageUrl(result);
    };
    reader.onerror = () => {
      setError("Chef could not read that image file.");
    };
    reader.readAsDataURL(file);
  }
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    initialRecipe?.tag_ids ??
      (initialDraft?.tags ? findTagIdsFromNames(initialDraft.tags) : []),
  );
  const [ingredients, setIngredients] = useState<IngredientRow[]>(
    initialRecipe?.ingredients.map((ingredient) => ({
      canonical_ingredient: ingredient.canonical_ingredient,
      amount: String(ingredient.amount),
      unit: ingredient.unit,
      preparation: ingredient.preparation ?? "",
      optional: !!ingredient.optional,
    })) ??
      (initialDraft?.ingredients.length
        ? initialDraft.ingredients.map((ingredient) => ({
            canonical_ingredient:
              ingredient.display_ingredient ?? ingredient.canonical_ingredient,
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
          ]),
  );
  const [steps, setSteps] = useState<StepRow[]>(
    initialRecipe?.steps.map((step) => ({
      what_to_do: step.what_to_do,
    })) ??
      (initialDraft?.steps.length
        ? initialDraft.steps.map((step) => ({
            what_to_do: step.what_to_do,
          }))
        : [{ what_to_do: "" }]),
  );
  const [calories, setCalories] = useState(
    initialRecipe?.nutrition_data?.calories !== undefined
      ? String(initialRecipe.nutrition_data.calories)
      : initialDraft?.nutrition_estimate?.calories !== undefined
        ? String(initialDraft.nutrition_estimate.calories)
        : "",
  );
  const [proteinG, setProteinG] = useState(
    initialRecipe?.nutrition_data?.protein_g !== undefined
      ? String(initialRecipe.nutrition_data.protein_g)
      : initialDraft?.nutrition_estimate?.protein_g !== undefined
        ? String(initialDraft.nutrition_estimate.protein_g)
        : "",
  );
  const [carbsG, setCarbsG] = useState(
    initialRecipe?.nutrition_data?.carbs_g !== undefined
      ? String(initialRecipe.nutrition_data.carbs_g)
      : initialDraft?.nutrition_estimate?.carbs_g !== undefined
        ? String(initialDraft.nutrition_estimate.carbs_g)
        : "",
  );
  const [fatG, setFatG] = useState(
    initialRecipe?.nutrition_data?.fat_g !== undefined
      ? String(initialRecipe.nutrition_data.fat_g)
      : initialDraft?.nutrition_estimate?.fat_g !== undefined
        ? String(initialDraft.nutrition_estimate.fat_g)
        : "",
  );
  const [dietaryRestrictionInput, setDietaryRestrictionInput] = useState("");
  const [customTagNames, setCustomTagNames] = useState<string[]>(
    initialRecipe
      ? []
      : initialDraft?.tags
        ? findCustomTagNamesFromNames(
            initialDraft.tags.filter(isUserFacingImportedTag),
          )
        : [],
  );
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [, startSave] = useTransition();
  const [isAutofilling, startAutofill] = useTransition();
  const [saving, setSaving] = useState(false);
  const [autofillHint, setAutofillHint] = useState<string | undefined>(
    initialDraft
      ? "Chef imported this as a draft. Review the fields before creating the recipe."
      : undefined,
  );
  const [lastAutofilledName, setLastAutofilledName] = useState("");
  const [editSaveMode, setEditSaveMode] = useState<"update" | "copy">("update");

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
    const normalizedTags = nextTags
      .filter(isUserFacingImportedTag)
      .map(normalizeTagSlug);

    return dietaryTags
      .filter((tag) => normalizedTags.includes(normalizeTagSlug(tag.name)))
      .map((tag) => tag.id);
  }

  function findCustomTagNamesFromNames(nextTags: string[]) {
    const matchedSlugs = new Set(
      tags.flatMap((tag) => [
        normalizeTagSlug(tag.name),
        normalizeTagSlug(tag.slug),
      ]),
    );

    return Array.from(
      new Map(
        nextTags
          .filter(isUserFacingImportedTag)
          .map(normalizeTagName)
          .filter(Boolean)
          .filter((name) => !matchedSlugs.has(normalizeTagSlug(name)))
          .map((name) => [normalizeTagSlug(name), name]),
      ).values(),
    );
  }

  function findTagFromName(name: string) {
    const slug = normalizeTagSlug(name);
    if (!slug) return null;

    return (
      tags.find(
        (tag) =>
          normalizeTagSlug(tag.name) === slug ||
          normalizeTagSlug(tag.slug) === slug,
      ) ?? null
    );
  }

  function addDietaryRestrictionChips(
    value: string | string[] = dietaryRestrictionInput,
  ) {
    const labels = (Array.isArray(value) ? value : value.split(","))
      .map((label) => normalizeTagName(label.replace(/,+$/g, "")))
      .filter(Boolean);
    if (labels.length === 0) return;

    const matchedTagIds: string[] = [];
    const customLabels = new Map<string, string>();

    for (const label of labels) {
      const existingTag = findTagFromName(label);
      if (existingTag) {
        matchedTagIds.push(existingTag.id);
        continue;
      }

      customLabels.set(normalizeTagSlug(label), label);
    }

    if (matchedTagIds.length > 0) {
      setSelectedTagIds((prev) =>
        Array.from(new Set([...prev, ...matchedTagIds])),
      );
    }

    if (customLabels.size > 0) {
      setCustomTagNames((prev) => {
        const next = new Map(
          prev.map((name) => [normalizeTagSlug(name), name]),
        );
        for (const [slug, label] of customLabels) {
          if (!next.has(slug)) next.set(slug, label);
        }
        return Array.from(next.values());
      });
    }

    setDietaryRestrictionInput("");
  }

  function removeDietaryRestrictionChip(chip: {
    type: "tag" | "custom";
    value: string;
  }) {
    if (chip.type === "tag") {
      setSelectedTagIds((prev) => prev.filter((tagId) => tagId !== chip.value));
      return;
    }

    setCustomTagNames((prev) => prev.filter((name) => name !== chip.value));
  }

  function removeLastDietaryRestrictionChip() {
    const tagChips = tags
      .filter((tag) => selectedTagIds.includes(tag.id))
      .map((tag) => ({ type: "tag" as const, value: tag.id }));
    const customChips = customTagNames.map((name) => ({
      type: "custom" as const,
      value: name,
    }));
    const lastChip = [...tagChips, ...customChips].at(-1);

    if (lastChip) removeDietaryRestrictionChip(lastChip);
  }

  const dietaryRestrictionChips = [
    ...tags
      .filter((tag) => selectedTagIds.includes(tag.id))
      .map((tag) => ({
        type: "tag" as const,
        value: tag.id,
        label: tag.name,
      })),
    ...customTagNames.map((name) => ({
      type: "custom" as const,
      value: name,
      label: name,
    })),
  ];

  const dietaryRestrictionText = dietaryRestrictionChips
    .map((chip) => chip.label)
    .join(", ");

  function applyAiRecipePreview(
    recipe: AiRecipePreview,
    options: { renameRecipe?: boolean } = {},
  ) {
    if (options.renameRecipe && recipe.name.trim()) {
      setName(recipe.name.trim());
    }
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
    setSelectedTagIds((prev) =>
      Array.from(new Set([...prev, ...findTagIdsFromNames(recipe.tags ?? [])])),
    );
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
    const shouldSaveAsNew = isEditing && editSaveMode === "copy";

    if (!normalizedName || isAutofilling) return;
    if (trigger === "auto" && isEditing) return;
    if (trigger === "auto" && !isLikelyEmptyRecipeDraft()) return;
    if (trigger === "auto" && lastAutofilledName === normalizedName) return;

    setError(undefined);
    setAutofillHint(undefined);
    const uploadVersionAtAutofillStart = uploadVersionRef.current;

    startAutofill(async () => {
      const result = await generateMealsAction({
        mealPrompt: normalizedName,
        mealsNeeded: 1,
        servingsPerMeal: getAutofillServings(),
        dietaryPreferences: dietaryRestrictionChips.map((chip) => chip.label),
        notes: [
          "Return one practical recipe preview suitable for pre-filling a manual recipe creation form.",
          isEditing
            ? "Use the current recipe as the base and revise it according to the user's instructions."
            : "",
          shouldSaveAsNew
            ? "Generate a clear new recipe name that reflects the edited version."
            : "",
          isEditing
            ? `Current recipe name: ${initialRecipe?.name ?? normalizedName}.`
            : "",
          isEditing && description.trim()
            ? `Current description: ${description.trim()}.`
            : "",
          isEditing
            ? `Current ingredients: ${ingredients
                .map((ingredient) => ingredient.canonical_ingredient.trim())
                .filter(Boolean)
                .join(", ")}.`
            : "",
          dietaryRestrictionText
            ? `Dietary restrictions: ${dietaryRestrictionText}.`
            : "",
          additionalInstructions.trim()
            ? `Additional instructions: ${additionalInstructions.trim()}.`
            : "",
        ]
          .filter(Boolean)
          .join(" "),
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

      const imageUrl = await fetchUnsplashImageAction({
        recipeName: recipe.name || normalizedName,
        cuisine: recipe.cuisine,
        ingredients: recipe.ingredients.map(
          (ingredient) =>
            ingredient.display_ingredient ?? ingredient.canonical_ingredient,
        ),
        instructions: additionalInstructions.trim() || undefined,
        dietaryRestrictions: dietaryRestrictionText || undefined,
      });

      applyAiRecipePreview(recipe, { renameRecipe: shouldSaveAsNew });
      if (
        imageUrl &&
        uploadVersionRef.current === uploadVersionAtAutofillStart
      ) {
        coverImageSourceRef.current = "ai";
        setCoverImageUrl(imageUrl);
      }
      setLastAutofilledName(normalizedName);
      setAutofillHint(
        trigger === "auto"
          ? "Chef filled in the rest of the form from the recipe name."
          : shouldSaveAsNew
            ? "Chef drafted a new edited version with a fresh name."
            : "Chef refreshed this recipe with AI suggestions.",
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

  function handleSubmit(mode = editSaveMode) {
    setError(undefined);
    const shouldCreateNewRecipe = isEditing && mode === "copy";

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
      name:
        shouldCreateNewRecipe &&
        initialRecipe?.name &&
        name.trim() === initialRecipe.name.trim()
          ? `${name.trim()} Variation`
          : name.trim(),
      description: description.trim() || undefined,
      cuisine_id: resolvedCuisineId,
      servings: normalizedServingCount,
      cover_image_url: coverImageUrl.trim() || undefined,
      tag_ids: selectedTagIds.length ? selectedTagIds : undefined,
      custom_tag_names: customTagNames.length ? customTagNames : undefined,
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
        isEditing && initialRecipe?.id && !shouldCreateNewRecipe
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
    <div
      className={
        isPage
          ? "w-full"
          : "fixed inset-0 z-[60] flex items-stretch justify-center p-0 sm:items-center sm:p-6"
      }
    >
      {!isPage && (
        <div
          className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <div
        className={
          isPage
            ? "relative flex w-full flex-col"
            : "relative flex h-dvh w-full flex-col overflow-hidden bg-background shadow-2xl sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-2xl"
        }
      >
        {!isPage && (
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-outline-variant/30 px-4 py-4 sm:items-center sm:px-6">
            <div className="min-w-0">
              <h2 className="truncate text-title-lg font-bold text-on-surface sm:text-headline-sm">
                {isEditing ? "Edit Recipe" : "Create Recipe"}
              </h2>
              <p className="mt-0.5 text-body-sm leading-snug text-outline">
                {isEditing
                  ? "Update this recipe or save the edit as a new version"
                  : initialDraft
                    ? "Review Chef's imported draft before saving it"
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
        )}

        <div
          className={
            isPage
              ? "space-y-8"
              : "flex-1 space-y-7 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6"
          }
        >
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
                placeholder="e.g. Lemon Herb Salmon"
                className="w-full rounded-xl border border-outline-variant/50 bg-white px-4 py-2.5 text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-1">
              <label className="text-label-sm uppercase tracking-wide text-outline">
                Dietary Restrictions
              </label>
              <div className="flex min-h-[46px] w-full flex-wrap items-center gap-2 rounded-xl border border-outline-variant/50 bg-white px-3 py-2 text-body-sm text-on-surface focus-within:ring-2 focus-within:ring-primary/20">
                {dietaryRestrictionChips.map((chip) => (
                  <button
                    key={`${chip.type}-${chip.value}`}
                    type="button"
                    onClick={() => removeDietaryRestrictionChip(chip)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary-surface px-3 py-1.5 text-label-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-on-primary"
                  >
                    {chip.label}
                    <span className="material-symbols-outlined text-[14px]">
                      close
                    </span>
                  </button>
                ))}
                <input
                  value={dietaryRestrictionInput}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    if (nextValue.includes(",")) {
                      const parts = nextValue.split(",");
                      addDietaryRestrictionChips(parts.slice(0, -1));
                      setDietaryRestrictionInput(
                        (parts.at(-1) ?? "").trimStart(),
                      );
                      return;
                    }
                    setDietaryRestrictionInput(nextValue);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "," || event.key === "Enter") {
                      event.preventDefault();
                      addDietaryRestrictionChips();
                      return;
                    }

                    if (
                      event.key === "Backspace" &&
                      !dietaryRestrictionInput &&
                      dietaryRestrictionChips.length > 0
                    ) {
                      event.preventDefault();
                      removeLastDietaryRestrictionChip();
                    }
                  }}
                  onPaste={(event) => {
                    const pastedText = event.clipboardData.getData("text");
                    if (!pastedText.includes(",")) return;

                    event.preventDefault();
                    const parts = pastedText.split(",");
                    addDietaryRestrictionChips([
                      dietaryRestrictionInput,
                      ...parts.slice(0, -1),
                    ]);
                    setDietaryRestrictionInput(
                      (parts.at(-1) ?? "").trimStart(),
                    );
                  }}
                  onBlur={() => addDietaryRestrictionChips()}
                  placeholder={
                    dietaryRestrictionChips.length
                      ? "Add another..."
                      : "e.g. dairy free, nut free..."
                  }
                  className="min-w-32 flex-1 border-0 bg-transparent px-1 py-1.5 outline-none placeholder:text-outline"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-label-sm uppercase tracking-wide text-outline">
                Additional Instructions{" "}
                <span className="normal-case text-[11px] font-normal">
                  (optional)
                </span>
              </label>
              <textarea
                value={additionalInstructions}
                onChange={(e) => setAdditionalInstructions(e.target.value)}
                placeholder="e.g. keep it under 30 minutes, use pantry staples, make it spicy..."
                rows={2}
                className="w-full resize-none rounded-xl border border-outline-variant/50 bg-white px-4 py-2.5 text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="grid gap-3 sm:flex sm:items-center">
              <div className="flex items-center gap-2 sm:shrink-0">
                <label className="text-label-sm uppercase tracking-wide text-outline">
                  Servings *
                </label>
                <input
                  type="number"
                  min={1}
                  value={servings}
                  onChange={(event) => handleServingsChange(event.target.value)}
                  onBlur={() => {
                    normalizeServings();
                    autofillFromName("auto");
                  }}
                  className="w-16 rounded-xl border border-outline-variant/50 bg-white px-3 py-2 text-center text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <p className="text-[11px] leading-5 text-outline sm:flex-1">
                {isEditing
                  ? "Use AI after adding dietary restrictions or edit instructions."
                  : "Set servings, then Chef can draft the rest automatically."}
              </p>
              <button
                type="button"
                onClick={() => autofillFromName("manual")}
                disabled={!name.trim() || isAutofilling}
                className="flex min-h-10 w-full shrink-0 items-center justify-center gap-1.5 rounded-full border border-outline-variant/50 bg-white px-3 py-1.5 text-[11px] font-semibold text-primary transition-colors hover:bg-primary-surface disabled:opacity-50 sm:w-auto"
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
                {isAutofilling
                  ? "Drafting..."
                  : isEditing
                    ? "Apply AI edits"
                    : "Autofill with AI"}
              </button>
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
                      coverImageSourceRef.current = null;
                      setCoverImageUrl("");
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      close
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={openFilePicker}
                    className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-black/70"
                  >
                    <span className="material-symbols-outlined text-[12px]">
                      edit
                    </span>
                    Change
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={openFilePicker}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-outline-variant/50 bg-white px-4 py-6 text-body-sm text-outline transition-colors hover:bg-surface-container-low"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    add_photo_alternate
                  </span>
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
                <div
                  key={i}
                  className={
                    isPage
                      ? "grid grid-cols-[minmax(0,1fr)_4.8rem_5.8rem_2.25rem] gap-2 sm:grid-cols-[minmax(0,1fr)_5.5rem_7rem_2.5rem]"
                      : "flex items-start gap-2"
                  }
                >
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
                    className="w-full rounded-xl border border-outline-variant/50 bg-white px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 sm:w-20"
                  />
                  <select
                    value={row.unit}
                    onChange={(event) =>
                      updateIngredient(i, "unit", event.target.value)
                    }
                    className="w-full rounded-xl border border-outline-variant/50 bg-white px-2 py-2 text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 sm:w-28"
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
                    className="flex h-10 w-full items-center justify-center rounded-xl text-outline transition-colors hover:bg-error-container/30 hover:text-error disabled:opacity-30 sm:h-9 sm:w-9"
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
                <div
                  key={i}
                  className={
                    isPage
                      ? "grid grid-cols-[2.25rem_minmax(0,1fr)_2.25rem] gap-2 sm:gap-3"
                      : "flex items-start gap-3"
                  }
                >
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
              Nutrition{" "}
              <span className="text-body-sm font-normal text-outline">
                (optional)
              </span>
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

        <div
          className={
            isPage
              ? "mt-8 grid shrink-0 grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-end"
              : "sticky bottom-0 grid shrink-0 grid-cols-2 gap-3 border-t border-outline-variant/30 bg-white/95 px-4 py-3 backdrop-blur sm:flex sm:flex-wrap sm:items-center sm:justify-end sm:px-6 sm:py-4"
          }
        >
          <button
            onClick={onClose}
            className="min-h-11 rounded-full border border-outline-variant px-5 py-2.5 text-label-md text-on-surface-variant transition-colors hover:bg-surface-container-low"
          >
            Cancel
          </button>
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditSaveMode("copy");
                  handleSubmit("copy");
                }}
                disabled={saving}
                className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-outline-variant px-5 py-2.5 text-label-md font-semibold text-primary transition-colors hover:bg-primary-surface disabled:opacity-50 sm:justify-start"
              >
                {saving && editSaveMode === "copy" && (
                  <span className="material-symbols-outlined animate-spin text-[16px]">
                    refresh
                  </span>
                )}
                {saving && editSaveMode === "copy"
                  ? "Creating..."
                  : "Save as New Recipe"}
              </button>
              <button
                onClick={() => {
                  setEditSaveMode("update");
                  handleSubmit("update");
                }}
                disabled={saving}
                className="col-span-2 flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 py-2.5 text-label-md font-semibold text-on-primary transition-colors hover:bg-on-primary-container disabled:opacity-50 sm:col-span-1 sm:justify-start"
              >
                {saving && editSaveMode === "update" && (
                  <span className="material-symbols-outlined animate-spin text-[16px]">
                    refresh
                  </span>
                )}
                {saving && editSaveMode === "update"
                  ? "Saving..."
                  : "Save Changes"}
              </button>
            </>
          ) : (
            <button
              onClick={() => handleSubmit()}
              disabled={saving}
              className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 py-2.5 text-label-md font-semibold text-on-primary transition-colors hover:bg-on-primary-container disabled:opacity-50"
            >
              {saving && (
                <span className="material-symbols-outlined animate-spin text-[16px]">
                  refresh
                </span>
              )}
              {saving ? "Creating..." : "Create Recipe"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
