"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BaseRecipe } from "@cart/shared";
import { RecipeImage } from "../ui/recipe-image";
import { deleteRecipeAction } from "@/app/home-actions";

function getDietaryBadges(recipe: BaseRecipe) {
  return recipe.tags.filter((tag) => tag.kind === "dietary_badge").slice(0, 4);
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

  const currentRecipe = recipe;
  const badges = getDietaryBadges(currentRecipe);
  const nutrition = currentRecipe.nutrition_data ?? {};
  const canEdit = !!currentRecipe.owner_user_id && !currentRecipe.is_system_recipe;
  const hasSteps = currentRecipe.steps.length > 0;

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
    <div className="fixed inset-0 z-50 flex items-stretch justify-center p-0 sm:items-center sm:p-6">
      <div
        className="absolute inset-0 bg-on-surface/45 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-[#fffdf9] shadow-2xl sm:h-auto sm:max-h-[92vh] sm:max-w-6xl sm:rounded-[2rem]">
        <div className="relative h-[280px] flex-shrink-0 bg-surface-container sm:h-[360px]">
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
            className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-white/18 px-3.5 py-2 text-label-sm font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/28 sm:left-5 sm:top-5"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to Collection
          </button>

          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-8">
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

              <h2 className="text-[2rem] font-black leading-[1.04] text-white sm:text-[3.2rem]">
                {currentRecipe.name}
              </h2>
              {currentRecipe.description && (
                <p className="mt-3 line-clamp-3 max-w-2xl text-sm leading-6 text-white/82 sm:mt-4 sm:line-clamp-none sm:text-[1.02rem] sm:leading-7">
                  {currentRecipe.description}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="border-b border-[#ecdfd2] bg-white px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            {nutrition.calories && (
              <span className="text-sm text-on-surface-variant">
                <span className="font-semibold text-on-surface">{nutrition.calories}</span> kcal
              </span>
            )}
            {nutrition.protein_g && (
              <span className="text-sm text-on-surface-variant">
                <span className="font-semibold text-on-surface">{nutrition.protein_g}g</span> protein
              </span>
            )}
            {nutrition.carbs_g && (
              <span className="text-sm text-on-surface-variant">
                <span className="font-semibold text-on-surface">{nutrition.carbs_g}g</span> carbs
              </span>
            )}
            {nutrition.fat_g && (
              <span className="text-sm text-on-surface-variant">
                <span className="font-semibold text-on-surface">{nutrition.fat_g}g</span> fat
              </span>
            )}
            <span className="text-sm text-on-surface-variant">
              <span className="font-semibold text-on-surface">{currentRecipe.servings}</span> servings
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid min-h-0 grid-cols-1 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.15fr)]">
            <div className="space-y-5 border-b border-[#ecdfd2] bg-[#fffdfa] p-4 sm:space-y-6 sm:p-8 xl:border-b-0 xl:border-r">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-[1.6rem] font-bold tracking-tight text-on-surface">
                  Ingredients
                </h3>
                <span className="rounded-full bg-[#fff1e4] px-3 py-1.5 text-label-sm font-semibold text-primary">
                  {currentRecipe.ingredients.length} items
                </span>
              </div>

              <div className="space-y-3">
                {currentRecipe.ingredients.map((ingredient, index) => (
                  <div
                    key={`${ingredient.canonical_ingredient}-${index}`}
                    className="flex items-start gap-3 rounded-[1.4rem] border border-[#efe2d6] bg-white px-3 py-3 shadow-[0_10px_30px_rgba(137,80,50,0.04)] sm:px-4 sm:py-3.5"
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

                    <span className="shrink-0 rounded-full bg-[#fff8f1] px-2.5 py-1 text-[11px] text-outline sm:text-label-sm">
                      {ingredient.amount} {ingredient.unit}
                    </span>
                  </div>
                ))}
              </div>

            </div>

            <div className="space-y-5 bg-[radial-gradient(circle_at_top_right,rgba(243,148,71,0.12),transparent_24%),linear-gradient(180deg,#fffdfa_0%,#fff8f2_100%)] p-4 sm:space-y-6 sm:p-8">
              <div className="flex items-center gap-3">
                <h3 className="text-[1.6rem] font-bold tracking-tight text-on-surface">
                  Preparation
                </h3>
                {hasSteps && (
                  <span className="rounded-full bg-[#fff1e4] px-3 py-1.5 text-label-sm font-semibold text-primary">
                    {currentRecipe.steps.length} steps
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {currentRecipe.steps.map((step) => {
                  const { title, body } = splitStepCopy(step.what_to_do);
                  return (
                    <div
                      key={step.step}
                      className="flex gap-3 rounded-[1.5rem] border border-[#f2e5da] bg-white/76 p-3 sm:gap-4 sm:p-4"
                    >
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary-fixed-dim/20 text-label-lg font-black text-primary">
                        {step.step}
                      </div>
                      <div className="flex-1 space-y-1 pt-1">
                        <p className="text-label-lg font-bold text-on-surface">{title}</p>
                        {body && (
                          <p className="text-body-sm leading-relaxed text-on-surface-variant">
                            {body}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-outline-variant/30 bg-white px-4 py-3 sm:px-6 sm:py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
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
                className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#f39447] px-5 py-2.5 text-label-lg font-bold text-on-primary shadow-sm transition-all hover:brightness-95 active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                Start Preparation
              </button>
            )}

            {canEdit && onDeleted && !confirmDelete && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-error/40 px-4 py-2.5 text-label-md font-semibold text-error transition-colors hover:bg-error-container/30"
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
                className="min-h-11 rounded-full border border-outline-variant px-5 py-2.5 text-label-md font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-low"
              >
                Edit Recipe
              </button>
            )}

            <button
              onClick={() => onAddToCart(currentRecipe)}
              className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-8 py-2.5 text-label-lg font-bold text-on-primary shadow-sm transition-all hover:bg-on-primary-container active:scale-[0.97]"
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
