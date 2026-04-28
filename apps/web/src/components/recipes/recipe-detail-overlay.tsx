"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BaseRecipe } from "@cart/shared";
import { RecipeImage } from "../ui/recipe-image";
import { deleteRecipeAction } from "@/app/home-actions";

function getDietaryBadges(recipe: BaseRecipe) {
  return recipe.tags.filter((tag) => tag.kind === "dietary_badge").slice(0, 4);
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

export function RecipeDetailOverlay({
  recipe,
  onClose,
  onAddToCart,
  onEdit,
  onDeleted,
}: {
  recipe: BaseRecipe | null;
  onClose: () => void;
  onAddToCart: (recipe: BaseRecipe) => void;
  onEdit?: (recipe: BaseRecipe) => void;
  onDeleted?: (recipeId: string) => void;
}) {
  if (!recipe) return null;

  return (
    <RecipeDetailOverlayContent
      key={recipe.id}
      recipe={recipe}
      onClose={onClose}
      onAddToCart={onAddToCart}
      onEdit={onEdit}
      onDeleted={onDeleted}
    />
  );
}

function RecipeDetailOverlayContent({
  recipe,
  onClose,
  onAddToCart,
  onEdit,
  onDeleted,
}: {
  recipe: BaseRecipe;
  onClose: () => void;
  onAddToCart: (recipe: BaseRecipe) => void;
  onEdit?: (recipe: BaseRecipe) => void;
  onDeleted?: (recipeId: string) => void;
}) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | undefined>();
  const [, startDelete] = useTransition();
  const [deleting, setDeleting] = useState(false);
  const [prepStarted] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!prepStarted) return;

    const interval = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [prepStarted]);

  const currentRecipe = recipe;
  const badges = getDietaryBadges(currentRecipe);
  const nutrition = currentRecipe.nutrition_data ?? {};
  const canEdit = !!currentRecipe.owner_user_id && !currentRecipe.is_system_recipe;
  const hasSteps = currentRecipe.steps.length > 0;
  const currentStep = currentRecipe.steps[activeStep] ?? null;
  const statCards = [
    {
      label: "Calories",
      value: nutrition.calories ? `${nutrition.calories}` : "--",
      eyebrow: "Energy",
    },
    {
      label: "Protein",
      value: nutrition.protein_g ? `${nutrition.protein_g}g` : "--",
      eyebrow: "Balance",
    },
    {
      label: "Servings",
      value: `${currentRecipe.servings}`,
      eyebrow: "Yield",
    },
    {
      label: "Carbs",
      value: nutrition.carbs_g ? `${nutrition.carbs_g}g` : "--",
      eyebrow: "Fuel",
    },
  ];

  function handleDelete() {
    setDeleteError(undefined);
    setDeleting(true);
    startDelete(async () => {
      const result = await deleteRecipeAction(currentRecipe.id);
      setDeleting(false);
      if (result.error) {
        setDeleteError(result.error);
        setConfirmDelete(false);
        return;
      }
      onDeleted?.(currentRecipe.id);
    });
  }

  function handleStartPreparation() {
    onClose();
    router.push(`/recipes/preparation/${currentRecipe.id}`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div
        className="absolute inset-0 bg-on-surface/45 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative flex max-h-[95vh] w-full flex-col overflow-hidden rounded-t-2xl bg-[#fffdf9] shadow-2xl sm:max-h-[92vh] sm:max-w-6xl sm:rounded-[2rem]">
        <div className="relative h-[300px] flex-shrink-0 bg-surface-container sm:h-[360px]">
          <RecipeImage
            src={currentRecipe.cover_image_url}
            alt={currentRecipe.name}
            seed={currentRecipe.id}
            className="absolute inset-0 h-full w-full"
            imgClassName="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,14,9,0.16)_0%,rgba(20,14,9,0.42)_38%,rgba(20,14,9,0.88)_100%)]" />

          <button
            onClick={onClose}
            className="absolute left-5 top-5 flex items-center gap-1.5 rounded-full bg-white/18 px-3.5 py-2 text-label-sm font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/28"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to Collection
          </button>

          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
            <div className="max-w-3xl">
              <div className="mb-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-primary-fixed-dim px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-on-primary-fixed">
                  {currentRecipe.cuisine.label}
                </span>
                {badges.map((badge) => (
                  <span
                    key={badge.id}
                    className="rounded-full bg-white/14 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white backdrop-blur-md"
                  >
                    {badge.name}
                  </span>
                ))}
              </div>

              <h2 className="text-[2.2rem] font-black leading-[1.02] text-white sm:text-[3.2rem]">
                {currentRecipe.name}
              </h2>
              {currentRecipe.description && (
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/82 sm:text-[1.02rem]">
                  {currentRecipe.description}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="border-b border-[#ecdfd2] bg-white px-4 py-4 sm:px-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {statCards.map((card) => (
              <div
                key={card.label}
                className="rounded-[1.35rem] border border-[#efdfd2] bg-[#fffaf5] px-4 py-4 shadow-[0_8px_24px_rgba(97,58,29,0.04)]"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-outline">
                  {card.eyebrow}
                </p>
                <p className="mt-2 text-[2rem] font-black leading-none text-on-surface">
                  {card.value}
                </p>
                <p className="mt-1 text-sm text-on-surface-variant">{card.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid min-h-0 grid-cols-1 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.15fr)]">
            <div className="space-y-6 border-b border-[#ecdfd2] bg-[#fffdfa] p-6 sm:p-8 xl:border-b-0 xl:border-r">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-[2rem] font-bold tracking-tight text-on-surface">
                    Ingredients
                  </h3>
                  <p className="mt-1 text-sm text-outline">
                    Everything you need for the full dish.
                  </p>
                </div>
                <span className="rounded-full bg-[#fff1e4] px-3 py-1.5 text-label-sm font-semibold text-primary">
                  {currentRecipe.ingredients.length} items
                </span>
              </div>

              <div className="space-y-3">
                {currentRecipe.ingredients.map((ingredient, index) => (
                  <div
                    key={`${ingredient.canonical_ingredient}-${index}`}
                    className="flex items-start gap-3 rounded-[1.4rem] border border-[#efe2d6] bg-white px-4 py-3.5 shadow-[0_10px_30px_rgba(137,80,50,0.04)]"
                  >
                    <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-[#e2cbbd]" />

                    <div className="min-w-0 flex-1">
                      <p className="text-body-sm font-medium text-on-surface">
                        {ingredient.display_ingredient ?? ingredient.canonical_ingredient}
                        {ingredient.preparation ? `, ${ingredient.preparation}` : ""}
                      </p>
                      {ingredient.optional && (
                        <p className="mt-0.5 text-[10px] text-outline">Optional</p>
                      )}
                    </div>

                    <span className="shrink-0 rounded-full bg-[#fff8f1] px-2.5 py-1 text-label-sm text-outline">
                      {ingredient.amount} {ingredient.unit}
                    </span>
                  </div>
                ))}
              </div>

              {Object.values(nutrition).some(Boolean) && (
                <div className="rounded-[1.75rem] border border-[#efdfd2] bg-white p-5 shadow-sm">
                  <div className="mb-4">
                    <h4 className="text-lg font-bold text-on-surface">Nutrition</h4>
                    <p className="mt-1 text-sm text-outline">
                      Estimated per serving.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      ["Calories", nutrition.calories, ""],
                      ["Protein", nutrition.protein_g, "g"],
                      ["Carbs", nutrition.carbs_g, "g"],
                      ["Fat", nutrition.fat_g, "g"],
                      ["Fiber", nutrition.fiber_g, "g"],
                      ["Sodium", nutrition.sodium_mg, "mg"],
                    ]
                      .filter(([, value]) => value !== undefined && value !== null)
                      .map(([label, value, unit]) => (
                        <div key={String(label)} className="rounded-[1rem] bg-[#fffaf5] p-3">
                          <p className="text-[10px] uppercase tracking-[0.14em] text-outline">
                            {String(label)}
                          </p>
                          <p className="mt-1 text-lg font-bold text-on-surface">
                            {String(value)}
                            {String(unit)}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6 bg-[radial-gradient(circle_at_top_right,rgba(243,148,71,0.12),transparent_24%),linear-gradient(180deg,#fffdfa_0%,#fff8f2_100%)] p-6 sm:p-8">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-[2rem] font-bold tracking-tight text-on-surface">
                      Preparation
                    </h3>
                    {prepStarted && (
                      <span className="rounded-full bg-primary-fixed-dim/15 px-3 py-1.5 text-label-sm font-semibold text-primary">
                        In progress
                      </span>
                    )}
                  </div>
                  <p className="max-w-xl text-body-sm leading-7 text-on-surface-variant">
                    Step through the recipe with a focused current action, visible
                    progress, and a timer that feels ready for the kitchen.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 rounded-[1.75rem] border border-[#efdfd2] bg-white/90 p-4 shadow-sm">
                  <div className="rounded-[1.25rem] bg-[#fff4e7] p-4">
                    <p className="text-label-sm uppercase tracking-[0.14em] text-primary">
                      Active timer
                    </p>
                    <p className="mt-2 text-[2rem] font-black leading-none text-on-surface">
                      {prepStarted ? formatElapsed(elapsedSeconds) : "00:00"}
                    </p>
                    <p className="mt-1 text-body-sm text-on-surface-variant">
                      {prepStarted ? "Since prep started" : "Starts when you begin"}
                    </p>
                  </div>

                  <div className="rounded-[1.25rem] bg-[#f7f2ed] p-4">
                    <p className="text-label-sm uppercase tracking-[0.14em] text-outline">
                      Progress
                    </p>
                    <p className="mt-2 text-[2rem] font-black leading-none text-on-surface">
                      {hasSteps
                        ? `${Math.min(activeStep + 1, currentRecipe.steps.length)}/${currentRecipe.steps.length}`
                        : "0/0"}
                    </p>
                    <p className="mt-1 text-body-sm text-on-surface-variant">
                      {prepStarted ? "Current step unlocked" : "Ready to cook"}
                    </p>
                  </div>
                </div>
              </div>

              {prepStarted && currentStep && (
                <div className="rounded-[1.75rem] border border-[#f0d4b8] bg-[linear-gradient(135deg,#fff8ee_0%,#fff1dc_100%)] p-5 shadow-[0_18px_50px_rgba(243,148,71,0.18)]">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex gap-4">
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary-fixed-dim text-label-lg font-black text-on-primary-fixed">
                        {currentStep.step}
                      </div>
                      <div className="space-y-2">
                        <p className="text-label-sm uppercase tracking-[0.16em] text-primary">
                          Now cooking
                        </p>
                        <p className="text-xl font-black text-on-surface">
                          {splitStepCopy(currentStep.what_to_do).title}
                        </p>
                        {splitStepCopy(currentStep.what_to_do).body && (
                          <p className="text-body-sm leading-relaxed text-on-surface-variant">
                            {splitStepCopy(currentStep.what_to_do).body}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        onClick={() => setActiveStep((step) => Math.max(0, step - 1))}
                        disabled={activeStep === 0}
                        className="rounded-full border border-outline-variant bg-white px-4 py-2 text-label-md font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() =>
                          setActiveStep((step) =>
                            Math.min(currentRecipe.steps.length - 1, step + 1),
                          )
                        }
                        disabled={activeStep >= currentRecipe.steps.length - 1}
                        className="rounded-full bg-primary px-5 py-2 text-label-md font-semibold text-on-primary transition-colors hover:bg-on-primary-container disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Next step
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {currentRecipe.steps.map((step, index) => {
                  const { title, body } = splitStepCopy(step.what_to_do);
                  const isActive = prepStarted && index === activeStep;

                  return (
                    <button
                      key={step.step}
                      type="button"
                      onClick={() => setActiveStep(index)}
                      className={`flex w-full gap-4 rounded-[1.5rem] border p-4 text-left transition-all ${
                        isActive
                          ? "border-[#f0c18f] bg-white shadow-[0_16px_40px_rgba(137,80,50,0.10)]"
                          : "border-[#f2e5da] bg-white/76 hover:border-[#e7cfbc] hover:bg-white"
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-label-lg font-black ${
                          isActive
                            ? "bg-primary-fixed-dim text-on-primary-fixed"
                            : "bg-primary-fixed-dim/20 text-primary"
                        }`}
                      >
                        {step.step}
                      </div>

                      <div className="flex-1 space-y-1.5 pt-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-label-lg font-bold text-on-surface">{title}</p>
                          {isActive && (
                            <span className="rounded-full bg-primary-fixed-dim/15 px-2.5 py-1 text-label-sm font-semibold text-primary">
                              Active
                            </span>
                          )}
                        </div>
                        {body && (
                          <p className="text-body-sm leading-relaxed text-on-surface-variant">
                            {body}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-outline-variant/30 bg-white px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-body-sm text-outline">
              {currentRecipe.ingredients.length} ingredients · {currentRecipe.servings} servings
              {nutrition.calories ? ` · ${nutrition.calories} kcal` : ""}
            </p>
            {deleteError && <p className="text-body-sm text-error">{deleteError}</p>}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {hasSteps && (
              <button
                onClick={handleStartPreparation}
                className="flex items-center gap-2 rounded-full bg-[#f39447] px-5 py-2.5 text-label-lg font-bold text-on-primary shadow-sm transition-all hover:brightness-95 active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {prepStarted ? "restart_alt" : "play_arrow"}
                </span>
                {prepStarted ? "Restart Preparation" : "Start Preparation"}
              </button>
            )}

            {canEdit && onDeleted && !confirmDelete && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 rounded-full border border-error/40 px-4 py-2.5 text-label-md font-semibold text-error transition-colors hover:bg-error-container/30"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                Delete
              </button>
            )}

            {canEdit && onDeleted && confirmDelete && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-body-sm text-on-surface-variant">
                  Delete this recipe?
                </span>
                <button
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  className="rounded-full border border-outline-variant px-3 py-1.5 text-label-sm text-on-surface-variant transition-colors hover:bg-surface-container-low disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-1.5 rounded-full bg-error px-4 py-1.5 text-label-sm font-semibold text-on-error transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {deleting && (
                    <span className="material-symbols-outlined animate-spin text-[14px]">
                      refresh
                    </span>
                  )}
                  {deleting ? "Deleting..." : "Yes, delete"}
                </button>
              </div>
            )}

            {canEdit && onEdit && (
              <button
                onClick={() => onEdit(currentRecipe)}
                className="rounded-full border border-outline-variant px-5 py-2.5 text-label-md font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-low"
              >
                Edit Recipe
              </button>
            )}

            <button
              onClick={() => onAddToCart(currentRecipe)}
              className="flex items-center gap-2 rounded-full bg-primary px-8 py-2.5 text-label-lg font-bold text-on-primary shadow-sm transition-all hover:bg-on-primary-container active:scale-[0.97]"
            >
              <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
