"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { BaseRecipe, KitchenInventoryItem } from "@cart/shared";
import { normalizeIngredientKey } from "@cart/shared";
import type { HandsFreeSessionContext } from "@/components/hands-free-mode-types";
import { HandsFreeSetupModal } from "@/components/hands-free-setup-modal";
import { RecipeImage } from "@/components/ui/recipe-image";
import {
  getIngredientPrepAction,
  getInventoryAlternativesAction,
  type InventoryAlternativeSuggestion,
} from "@/app/ai-actions";
import type { CookingContext } from "@/lib/cooking-context";
import {
  getIngredientReadiness,
  getIngredientReadinessSummary,
  type IngredientReadiness,
} from "@/lib/inventory-readiness";

const PreparationChefAssistant = dynamic(
  () =>
    import("@/components/ai/preparation-chef-assistant").then(
      (mod) => mod.PreparationChefAssistant,
    ),
  {
    loading: () => null,
    ssr: false,
  },
);

const HandsFreeMode = dynamic(
  () => import("@/components/hands-free-mode").then((mod) => mod.HandsFreeMode),
  {
    loading: () => null,
    ssr: false,
  },
);

function getDietaryBadges(recipe: BaseRecipe) {
  return recipe.tags.filter((tag) => tag.kind === "dietary_badge").slice(0, 3);
}

function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function splitStepCopy(copy: string) {
  const parts = copy.split(/(?<=[.!?])\s+/);
  return {
    title: parts[0] ?? copy,
    body: parts.slice(1).join(" "),
  };
}

function estimatePrepMinutes(recipe: BaseRecipe) {
  return Math.max(recipe.steps.length * 8, 15);
}

export function RecipePreparationClient({
  recipe,
  inventory,
  cookingContext,
}: {
  recipe: BaseRecipe;
  inventory: KitchenInventoryItem[];
  cookingContext?: CookingContext;
}) {
  const [started, setStarted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [handsFreeOpen, setHandsFreeOpen] = useState(false);
  const [handsFreeSetupOpen, setHandsFreeSetupOpen] = useState(false);
  const [handsFreeSessionContext, setHandsFreeSessionContext] = useState<
    HandsFreeSessionContext | undefined
  >();
  const [checkedIngredients, setCheckedIngredients] = useState<string[]>([]);
  const [prepNotes, setPrepNotes] = useState<string[]>([]);
  const [aiAlternatives, setAiAlternatives] = useState<
    InventoryAlternativeSuggestion[]
  >([]);
  const [aiAlternativesPending, setAiAlternativesPending] = useState(false);
  const [inventoryChecked, setInventoryChecked] = useState(false);
  const [inventoryCheckError, setInventoryCheckError] = useState<string | null>(
    null,
  );
  const [prepError, setPrepError] = useState<string | null>(null);
  const [isPrepPending, startPrepTransition] = useTransition();

  useEffect(() => {
    if (!started) {
      return;
    }

    const interval = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [started]);

  const nutrition = recipe.nutrition_data ?? {};
  const badges = getDietaryBadges(recipe);
  const prepMinutes = estimatePrepMinutes(recipe);
  const currentStep = recipe.steps[activeStep] ?? null;
  const checkedCount = checkedIngredients.length;
  const alternativeByIngredient = useMemo(
    () =>
      new Map(
        aiAlternatives.map((suggestion) => [
          normalizeIngredientKey(suggestion.ingredient_name),
          suggestion,
        ]),
      ),
    [aiAlternatives],
  );
  const inventorySummary = useMemo(
    () =>
      getIngredientReadinessSummary(
        recipe.ingredients,
        inventory,
        (ingredient) =>
          alternativeByIngredient.get(
            normalizeIngredientKey(ingredient.canonical_ingredient),
          ),
      ),
    [alternativeByIngredient, inventory, recipe.ingredients],
  );
  const ingredientCompletion = recipe.ingredients.length
    ? Math.round((checkedCount / recipe.ingredients.length) * 100)
    : 0;

  const macroSegments = useMemo(() => {
    const protein = nutrition.protein_g ?? 0;
    const carbs = nutrition.carbs_g ?? 0;
    const fat = nutrition.fat_g ?? 0;
    const total = protein + carbs + fat;

    if (!total) {
      return [
        { label: "Carbs", color: "bg-[#fe8e17]", width: 34 },
        { label: "Fat", color: "bg-[#f4be6b]", width: 33 },
        { label: "Protein", color: "bg-[#c0dedf]", width: 33 },
      ];
    }

    return [
      {
        label: "Carbs",
        color: "bg-[#fe8e17]",
        width: Math.max(12, Math.round((carbs / total) * 100)),
      },
      {
        label: "Fat",
        color: "bg-[#f4be6b]",
        width: Math.max(12, Math.round((fat / total) * 100)),
      },
      {
        label: "Protein",
        color: "bg-[#c0dedf]",
        width: Math.max(12, Math.round((protein / total) * 100)),
      },
    ];
  }, [nutrition.carbs_g, nutrition.fat_g, nutrition.protein_g]);

  async function handleCheckInventory() {
    setInventoryCheckError(null);
    setInventoryChecked(true);
    const candidates = recipe.ingredients.filter(
      (ingredient) =>
        getIngredientReadiness(ingredient, inventory).status !== "available",
    );

    if (candidates.length === 0 || inventory.length === 0) {
      setAiAlternatives([]);
      setAiAlternativesPending(false);
      return;
    }

    setAiAlternativesPending(true);
    const result = await getInventoryAlternativesAction({
      recipeName: recipe.name,
      ingredients: candidates.map((ingredient) => ({
        canonical_ingredient: ingredient.canonical_ingredient,
        display_ingredient: ingredient.display_ingredient ?? null,
        amount: ingredient.amount,
        unit: ingredient.unit,
      })),
      inventory: inventory.map((item) => ({
        id: item.id,
        display_name: item.display_name,
        category: item.ingredient?.category ?? null,
      })),
    });

    if (result.error) {
      setInventoryCheckError(result.error);
    }
    if (result.suggestions) {
      setAiAlternatives(result.suggestions);
    }
    setAiAlternativesPending(false);
  }

  function loadPrepGuide() {
    setPrepError(null);
    startPrepTransition(async () => {
      const result = await getIngredientPrepAction({
        recipeName: recipe.name,
        ingredients: recipe.ingredients.map((ingredient) => ({
          canonical_ingredient: ingredient.canonical_ingredient,
          display_ingredient: ingredient.display_ingredient ?? null,
          amount: ingredient.amount,
          unit: ingredient.unit,
        })),
      });
      if (result.error) {
        setPrepError(result.error);
      } else {
        setPrepNotes(result.notes ?? []);
      }
    });
  }

  function toggleIngredient(key: string) {
    setCheckedIngredients((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  }

  function startPreparation() {
    setStarted(true);
    setElapsedSeconds(0);
    setActiveStep(0);
  }

  function goToStep(nextStep: number) {
    setActiveStep(Math.max(0, Math.min(recipe.steps.length - 1, nextStep)));
    setElapsedSeconds(0);
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/recipes"
          className="mb-6 inline-flex items-center gap-2 text-label-lg text-on-surface-variant transition-colors hover:text-primary"
        >
          <span className="material-symbols-outlined text-[18px]">
            arrow_back
          </span>
          Back to Collection
        </Link>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="overflow-hidden rounded-[32px] bg-white shadow-[0_4px_20px_rgba(244,190,107,0.08)] lg:col-span-8">
            <div className="relative h-[23rem] w-full">
              <RecipeImage
                src={recipe.cover_image_url}
                alt={recipe.name}
                seed={recipe.id}
                className="h-full w-full"
                imgClassName="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-secondary-container px-3 py-1 text-label-md text-on-secondary-container">
                    {recipe.cuisine.label}
                  </span>
                  {badges.map((badge) => (
                    <span
                      key={badge.id}
                      className="rounded-full bg-white/20 px-3 py-1 text-label-md text-white backdrop-blur-sm"
                    >
                      {badge.name}
                    </span>
                  ))}
                </div>
                <h1 className="max-w-3xl text-headline-lg text-white">
                  {recipe.name}
                </h1>
                {recipe.description ? (
                  <p className="mt-2 max-w-2xl text-body-md text-white/85">
                    {recipe.description}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:col-span-4">
            <div className="rounded-[28px] bg-[#fff2e3] p-6 text-center">
              <span className="material-symbols-outlined mb-2 text-[24px] text-primary">
                local_fire_department
              </span>
              <p className="text-headline-md text-primary">
                {nutrition.calories ?? "-"}
              </p>
              <p className="text-label-md text-on-surface-variant">Calories</p>
            </div>
            <div className="rounded-[28px] bg-[#fff2e3] p-6 text-center">
              <span className="material-symbols-outlined mb-2 text-[24px] text-secondary">
                fitness_center
              </span>
              <p className="text-headline-md text-secondary">
                {nutrition.protein_g ? `${nutrition.protein_g}g` : "-"}
              </p>
              <p className="text-label-md text-on-surface-variant">Protein</p>
            </div>
            <div className="rounded-[28px] bg-surface-container-low p-6 text-center">
              <span className="material-symbols-outlined mb-2 text-[24px] text-outline">
                av_timer
              </span>
              <p className="text-headline-md text-on-surface">{prepMinutes}</p>
              <p className="text-label-md text-on-surface-variant">Mins</p>
            </div>
            <div className="rounded-[28px] bg-surface-container-low p-6 text-center">
              <span className="material-symbols-outlined mb-2 text-[24px] text-outline">
                group
              </span>
              <p className="text-headline-md text-on-surface">
                {recipe.servings}
              </p>
              <p className="text-label-md text-on-surface-variant">Servings</p>
            </div>
            <div className="col-span-2 rounded-[28px] border border-outline-variant/20 bg-white p-6">
              <h2 className="text-label-lg text-on-surface">Macros Split</h2>
              <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-surface-container-low">
                {macroSegments.map((segment) => (
                  <div
                    key={segment.label}
                    className={segment.color}
                    style={{ width: `${segment.width}%` }}
                  />
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-label-md text-on-surface-variant">
                {macroSegments.map((segment) => (
                  <div
                    key={segment.label}
                    className="flex items-center gap-1.5"
                  >
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${segment.color}`}
                    />
                    {segment.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="sticky top-24">
              <div className="mb-6 flex items-center justify-between gap-3">
                <h2 className="text-headline-sm text-on-surface">
                  Ingredients
                </h2>
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-secondary-container/30 px-3 py-1 text-label-sm text-on-secondary-container">
                    {checkedCount}/{recipe.ingredients.length} ready
                  </span>
                  <button
                    type="button"
                    onClick={loadPrepGuide}
                    disabled={isPrepPending}
                    className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1 text-label-sm text-primary transition-colors hover:bg-primary/20 disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {isPrepPending ? "progress_activity" : "menu_book"}
                    </span>
                    {isPrepPending ? "Generating…" : "Prep Guide"}
                  </button>
                </div>
              </div>
              {prepError && (
                <p className="mb-4 text-[11px] text-error">{prepError}</p>
              )}

              <div className="space-y-4">
                <div className="rounded-[22px] border border-[#c0dedf] bg-white p-3 shadow-sm">
                  <button
                    type="button"
                    onClick={handleCheckInventory}
                    disabled={aiAlternativesPending}
                    className="flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-[#2f7f83] px-4 py-2 text-label-md font-black text-white transition-colors hover:bg-[#25696d] disabled:opacity-60"
                  >
                    <span
                      className={`material-symbols-outlined text-[16px] ${
                        aiAlternativesPending ? "animate-spin" : ""
                      }`}
                    >
                      {aiAlternativesPending
                        ? "progress_activity"
                        : "inventory_2"}
                    </span>
                    {aiAlternativesPending
                      ? "Checking..."
                      : inventoryChecked
                        ? "Check again"
                        : "Check inventory"}
                  </button>
                  {inventoryCheckError ? (
                    <p className="mt-2 text-center text-[11px] text-error">
                      {inventoryCheckError}
                    </p>
                  ) : null}
                </div>

                {inventoryChecked ? (
                  <div className="grid grid-cols-3 gap-2">
                    <InventoryStatusCount
                      icon="check_circle"
                      value={inventorySummary.available}
                      label="Have"
                      className="bg-[#ecf8f4] text-[#256f5c]"
                    />
                    <InventoryStatusCount
                      icon="swap_horiz"
                      value={inventorySummary.alternative}
                      label="Alt"
                      className="bg-[#fff7dc] text-[#8a5d00]"
                    />
                    <InventoryStatusCount
                      icon="add_shopping_cart"
                      value={inventorySummary.missing}
                      label="Buy"
                      className="bg-[#fff0ed] text-[#a33720]"
                    />
                  </div>
                ) : null}
                {recipe.ingredients.map((ingredient, index) => {
                  const ingredientKey = `${ingredient.canonical_ingredient}-${index}`;
                  const checked = checkedIngredients.includes(ingredientKey);
                  const readiness = getIngredientReadiness(
                    ingredient,
                    inventory,
                    alternativeByIngredient.get(
                      normalizeIngredientKey(ingredient.canonical_ingredient),
                    ),
                  );
                  const inventoryNote = getReadinessNote(
                    readiness,
                    aiAlternativesPending &&
                      getIngredientReadiness(ingredient, inventory).status !==
                        "available",
                  );

                  return (
                    <button
                      key={ingredientKey}
                      type="button"
                      onClick={() => toggleIngredient(ingredientKey)}
                      className={`flex w-full items-center gap-3 rounded-[22px] border p-4 text-left shadow-sm transition-all ${
                        checked
                          ? "border-secondary-container bg-[#fff2e3]"
                          : "border-transparent bg-white hover:border-outline-variant/30"
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                          checked
                            ? "border-secondary-container bg-secondary-container text-on-secondary"
                            : "border-outline-variant/60 bg-white text-transparent"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          check
                        </span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-body-sm text-on-surface">
                          {ingredient.amount} {ingredient.unit}{" "}
                          {ingredient.display_ingredient ??
                            ingredient.canonical_ingredient}
                          {ingredient.preparation
                            ? `, ${ingredient.preparation}`
                            : ""}
                        </p>
                        {prepNotes[index] ? (
                          <p className="mt-1 text-[11px] italic text-primary/80">
                            {prepNotes[index]}
                          </p>
                        ) : !inventoryChecked ? (
                          <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
                            {checked
                              ? "Ready"
                              : ingredient.optional
                                ? "Optional"
                                : "Check before cooking"}
                          </p>
                        ) : (
                          <p
                            className={`mt-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide ${inventoryNote.className}`}
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              {inventoryNote.icon}
                            </span>
                            {checked ? "Ready" : inventoryNote.label}
                          </p>
                        )}
                        {inventoryChecked && inventoryNote.detail ? (
                          <p className="mt-1 text-[11px] text-on-surface-variant">
                            {inventoryNote.detail}
                          </p>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="mb-6 rounded-[28px] border border-outline-variant/20 bg-white p-6 shadow-[0_4px_20px_rgba(244,190,107,0.08)]">
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
                <div>
                  <h2 className="text-headline-sm text-on-surface">
                    Preparation
                  </h2>
                  <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
                    Work through the recipe one step at a time with a focused
                    cooking view.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[22px] bg-[#fff2e3] p-4">
                    <p className="text-label-sm uppercase tracking-[0.14em] text-primary">
                      Active Timer
                    </p>
                    <p className="mt-2 text-headline-md text-on-surface">
                      {started ? formatElapsed(elapsedSeconds) : "00:00"}
                    </p>
                    <p className="mt-1 text-body-sm text-on-surface-variant">
                      {started ? "This step" : "Starts when you begin"}
                    </p>
                  </div>
                  <div className="rounded-[22px] bg-surface-container-low p-4">
                    <p className="text-label-sm uppercase tracking-[0.14em] text-outline">
                      Progress
                    </p>
                    <p className="mt-2 text-headline-md text-on-surface">
                      {recipe.steps.length
                        ? `${activeStep + 1}/${recipe.steps.length}`
                        : "0/0"}
                    </p>
                    <p className="mt-1 text-body-sm text-on-surface-variant">
                      {ingredientCompletion}% ingredients checked
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <PreparationChefAssistant
                  recipe={recipe}
                  currentStepNumber={currentStep?.step ?? activeStep + 1}
                  currentStepText={currentStep?.what_to_do ?? null}
                  checkedCount={checkedCount}
                  ingredientCompletion={ingredientCompletion}
                  started={started}
                />
              </div>
            </div>

            {currentStep ? (
              <div className="rounded-[28px] border border-[#f4be6b] bg-[linear-gradient(135deg,#fff8ef_0%,#fff2e3_100%)] p-6 shadow-[0_18px_50px_rgba(244,121,13,0.18)]">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-label-lg text-on-primary">
                      {currentStep.step}
                    </div>
                    <div>
                      <p className="text-label-sm uppercase tracking-[0.16em] text-primary">
                        Now Cooking
                      </p>
                      <h3 className="mt-2 text-headline-md text-on-surface">
                        {splitStepCopy(currentStep.what_to_do).title}
                      </h3>
                      {splitStepCopy(currentStep.what_to_do).body ? (
                        <p className="mt-2 text-body-md text-on-surface-variant">
                          {splitStepCopy(currentStep.what_to_do).body}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => goToStep(activeStep - 1)}
                      disabled={activeStep === 0}
                      className="rounded-full border border-outline-variant bg-white px-4 py-2 text-label-md text-on-surface-variant transition-colors hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => goToStep(activeStep + 1)}
                      disabled={activeStep >= recipe.steps.length - 1}
                      className="rounded-full bg-primary px-5 py-2 text-label-md text-on-primary transition-colors hover:bg-on-primary-container disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next Step
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-8 space-y-8">
              {recipe.steps.map((step, index) => {
                const copy = splitStepCopy(step.what_to_do);
                const isActive = index === activeStep;

                return (
                  <button
                    key={step.step}
                    type="button"
                    onClick={() => goToStep(index)}
                    className={`flex w-full gap-5 text-left ${
                      index < recipe.steps.length - 1 ? "pb-8" : ""
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full text-label-lg ${
                          isActive
                            ? "bg-primary text-on-primary"
                            : "bg-primary/15 text-primary"
                        }`}
                      >
                        {step.step}
                      </div>
                      {index < recipe.steps.length - 1 ? (
                        <div className="my-2 w-0.5 flex-1 bg-outline-variant/35" />
                      ) : null}
                    </div>

                    <div
                      className={`flex-1 rounded-[24px] p-1 transition-all ${
                        isActive ? "bg-white/70" : ""
                      }`}
                    >
                      <h4 className="text-label-lg text-primary">
                        {copy.title}
                      </h4>
                      {copy.body ? (
                        <p className="mt-2 text-body-md text-on-surface-variant">
                          {copy.body}
                        </p>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-outline-variant/20 pt-8">
              <p className="text-body-sm text-on-surface-variant">
                {recipe.ingredients.length} ingredients - {recipe.servings}{" "}
                servings
                {nutrition.calories ? ` - ${nutrition.calories} kcal` : ""}
              </p>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStarted(false);
                    setElapsedSeconds(0);
                    setActiveStep(0);
                  }}
                  className="rounded-full bg-surface-container px-5 py-2.5 text-label-lg text-on-surface transition-colors hover:bg-surface-container-high"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setHandsFreeSetupOpen(true)}
                  className="flex items-center gap-2 rounded-full border border-outline-variant bg-white px-5 py-2.5 text-label-lg text-on-surface transition-colors hover:bg-surface-container-low"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    mic
                  </span>
                  Hands-free
                </button>
                <button
                  type="button"
                  onClick={startPreparation}
                  className="rounded-full bg-primary px-7 py-2.5 text-label-lg text-on-primary shadow-[0_10px_24px_rgba(244,121,13,0.25)] transition-opacity hover:opacity-90"
                >
                  {started ? "Restart Preparation" : "Start Preparation"}
                </button>
              </div>
            </div>

            {handsFreeSetupOpen ? (
              <HandsFreeSetupModal
                recipe={recipe}
                onCancel={() => setHandsFreeSetupOpen(false)}
                onStart={(context) => {
                  setHandsFreeSessionContext(context);
                  setHandsFreeSetupOpen(false);
                  setHandsFreeOpen(true);
                }}
              />
            ) : null}

            {handsFreeOpen ? (
              <HandsFreeMode
                recipe={recipe}
                cookingContext={cookingContext}
                sessionContext={handsFreeSessionContext}
                onClose={() => setHandsFreeOpen(false)}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function InventoryStatusCount({
  icon,
  value,
  label,
  className,
}: {
  icon: string;
  value: number;
  label: string;
  className: string;
}) {
  return (
    <div
      className={`flex min-w-0 items-center justify-center gap-1.5 rounded-2xl px-2.5 py-2 text-label-sm font-bold ${className}`}
    >
      <span className="material-symbols-outlined text-[16px]">{icon}</span>
      <span>{value}</span>
      <span className="truncate">{label}</span>
    </div>
  );
}

function getReadinessNote(
  readiness: IngredientReadiness,
  checkingAlternative: boolean,
) {
  if (checkingAlternative) {
    return {
      icon: "progress_activity",
      label: "Checking swaps",
      detail: "Asking AI to compare your inventory.",
      className: "text-[#5f8689]",
    };
  }

  if (readiness.status === "available") {
    return {
      icon: "check_circle",
      label: "In kitchen",
      detail: readiness.item.display_name,
      className: "text-[#2d806a]",
    };
  }

  if (readiness.status === "alternative") {
    return {
      icon: "swap_horiz",
      label: "Alternative in kitchen",
      detail: readiness.reason
        ? `${readiness.alternative.display_name}: ${readiness.reason}`
        : `You have ${readiness.alternative.display_name}. Add this ingredient to the cart if you want the recipe as written.`,
      className: "text-[#9a6900]",
    };
  }

  return {
    icon: "add_shopping_cart",
    label: "Need to buy",
    detail: "Will be added when you generate a cart.",
    className: "text-[#b24028]",
  };
}
