"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { BaseRecipe } from "@cart/shared";
import { RecipeImage } from "@/components/ui/recipe-image";

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
}: {
  recipe: BaseRecipe;
}) {
  const [started, setStarted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [checkedIngredients, setCheckedIngredients] = useState<string[]>([]);

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
        { label: "Carbs", color: "bg-[#f4a340]", width: 34 },
        { label: "Fat", color: "bg-[#f2d978]", width: 33 },
        { label: "Protein", color: "bg-[#d7d2cb]", width: 33 },
      ];
    }

    return [
      {
        label: "Carbs",
        color: "bg-[#f4a340]",
        width: Math.max(12, Math.round((carbs / total) * 100)),
      },
      {
        label: "Fat",
        color: "bg-[#f2d978]",
        width: Math.max(12, Math.round((fat / total) * 100)),
      },
      {
        label: "Protein",
        color: "bg-[#d7d2cb]",
        width: Math.max(12, Math.round((protein / total) * 100)),
      },
    ];
  }, [nutrition.carbs_g, nutrition.fat_g, nutrition.protein_g]);

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

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/recipes"
          className="mb-6 inline-flex items-center gap-2 text-label-lg text-on-surface-variant transition-colors hover:text-primary"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to Collection
        </Link>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="overflow-hidden rounded-[32px] bg-white shadow-[0_4px_20px_rgba(255,179,71,0.08)] lg:col-span-8">
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
            <div className="rounded-[28px] bg-[#fff2e2] p-6 text-center">
              <span className="material-symbols-outlined mb-2 text-[24px] text-primary">
                local_fire_department
              </span>
              <p className="text-headline-md text-primary">
                {nutrition.calories ?? "-"}
              </p>
              <p className="text-label-md text-on-surface-variant">Calories</p>
            </div>
            <div className="rounded-[28px] bg-[#fff9dc] p-6 text-center">
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
              <p className="text-headline-md text-on-surface">{recipe.servings}</p>
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
                  <div key={segment.label} className="flex items-center gap-1.5">
                    <span className={`h-2.5 w-2.5 rounded-full ${segment.color}`} />
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
                <h2 className="text-headline-sm text-on-surface">Ingredients</h2>
                <span className="rounded-lg bg-secondary-container/30 px-3 py-1 text-label-sm text-on-secondary-container">
                  {checkedCount}/{recipe.ingredients.length} ready
                </span>
              </div>

              <div className="space-y-4">
                {recipe.ingredients.map((ingredient, index) => {
                  const ingredientKey = `${ingredient.canonical_ingredient}-${index}`;
                  const checked = checkedIngredients.includes(ingredientKey);

                  return (
                    <button
                      key={ingredientKey}
                      type="button"
                      onClick={() => toggleIngredient(ingredientKey)}
                      className={`flex w-full items-center gap-3 rounded-[22px] border p-4 text-left shadow-sm transition-all ${
                        checked
                          ? "border-secondary-container bg-[#fff6dc]"
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
                        <p
                          className={`text-body-sm ${
                            checked
                              ? "text-on-surface"
                              : "text-on-surface"
                          }`}
                        >
                          {ingredient.amount} {ingredient.unit}{" "}
                          {ingredient.display_ingredient ??
                            ingredient.canonical_ingredient}
                          {ingredient.preparation
                            ? `, ${ingredient.preparation}`
                            : ""}
                        </p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
                          {checked
                            ? "Ready"
                            : ingredient.optional
                              ? "Optional"
                              : "Check before cooking"}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="mb-6 flex flex-col gap-4 rounded-[28px] border border-outline-variant/20 bg-white p-6 shadow-[0_4px_20px_rgba(255,179,71,0.08)] lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-headline-sm text-on-surface">Preparation</h2>
                <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
                  Work through the recipe one step at a time with a focused cooking view.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:min-w-[19rem]">
                <div className="rounded-[22px] bg-[#fff5e8] p-4">
                  <p className="text-label-sm uppercase tracking-[0.14em] text-primary">
                    Active Timer
                  </p>
                  <p className="mt-2 text-headline-md text-on-surface">
                    {started ? formatElapsed(elapsedSeconds) : "00:00"}
                  </p>
                  <p className="mt-1 text-body-sm text-on-surface-variant">
                    {started ? "Since preparation started" : "Starts when you begin"}
                  </p>
                </div>
                <div className="rounded-[22px] bg-surface-container-low p-4">
                  <p className="text-label-sm uppercase tracking-[0.14em] text-outline">
                    Progress
                  </p>
                  <p className="mt-2 text-headline-md text-on-surface">
                    {recipe.steps.length ? `${activeStep + 1}/${recipe.steps.length}` : "0/0"}
                  </p>
                  <p className="mt-1 text-body-sm text-on-surface-variant">
                    {ingredientCompletion}% ingredients checked
                  </p>
                </div>
              </div>
            </div>

            {currentStep ? (
              <div className="rounded-[28px] border border-[#f0d4b8] bg-[linear-gradient(135deg,#fff8ee_0%,#fff1dc_100%)] p-6 shadow-[0_18px_50px_rgba(243,148,71,0.18)]">
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
                      onClick={() => setActiveStep((step) => Math.max(0, step - 1))}
                      disabled={activeStep === 0}
                      className="rounded-full border border-outline-variant bg-white px-4 py-2 text-label-md text-on-surface-variant transition-colors hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveStep((step) =>
                          Math.min(recipe.steps.length - 1, step + 1),
                        )
                      }
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
                    onClick={() => setActiveStep(index)}
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
                      <h4 className="text-label-lg text-primary">{copy.title}</h4>
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
                {recipe.ingredients.length} ingredients - {recipe.servings} servings
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
                  onClick={startPreparation}
                  className="rounded-full bg-primary px-7 py-2.5 text-label-lg text-on-primary shadow-[0_10px_24px_rgba(243,148,71,0.25)] transition-opacity hover:opacity-90"
                >
                  {started ? "Restart Preparation" : "Start Preparation"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
