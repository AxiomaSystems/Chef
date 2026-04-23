"use client";

import type { BaseRecipe } from "@cart/shared";
import { RecipeImage } from "../ui/recipe-image";

function getDietaryBadges(recipe: BaseRecipe) {
  return recipe.tags.filter((t) => t.kind === "dietary_badge").slice(0, 4);
}

export function RecipeDetailOverlay({
  recipe,
  onClose,
  onAddToCart,
  onEdit,
}: {
  recipe: BaseRecipe | null;
  onClose: () => void;
  onAddToCart: (recipe: BaseRecipe) => void;
  onEdit?: (recipe: BaseRecipe) => void;
}) {
  if (!recipe) return null;

  const badges    = getDietaryBadges(recipe);
  const nutrition = recipe.nutrition_data ?? {};
  const canEdit = !!recipe.owner_user_id && !recipe.is_system_recipe;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full sm:max-w-5xl max-h-[95vh] sm:max-h-[90vh] bg-background rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col shadow-2xl">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative h-52 sm:h-64 flex-shrink-0 bg-surface-container">
          <RecipeImage
            src={recipe.cover_image_url}
            alt={recipe.name}
            seed={recipe.id}
            className="absolute inset-0 w-full h-full"
            imgClassName="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

          {/* Back / close */}
          <button
            onClick={onClose}
            className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-white text-label-sm hover:bg-white/30 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to Collection
          </button>

          {/* Overlay content */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            {/* Badges */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              <span className="px-2.5 py-1 rounded-full bg-primary-fixed-dim text-on-primary-fixed text-[10px] font-bold uppercase tracking-wide">
                {recipe.cuisine.label}
              </span>
              {badges.map((b) => (
                <span key={b.id} className="px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container text-[10px] font-bold uppercase tracking-wide">
                  {b.name}
                </span>
              ))}
            </div>
            <h2 className="text-headline-md text-white font-black leading-tight">{recipe.name}</h2>
            {recipe.description && (
              <p className="text-body-sm text-white/75 mt-1 line-clamp-2">{recipe.description}</p>
            )}
          </div>
        </div>

        {/* ── Stats bar ────────────────────────────────────────── */}
        <div className="grid grid-cols-4 divide-x divide-outline-variant/30 border-b border-outline-variant/30 bg-white flex-shrink-0">
          {[
            { label: "Calories", value: nutrition.calories ?? "—", unit: "" },
            { label: "Protein",  value: nutrition.protein_g ? `${nutrition.protein_g}g` : "—", unit: "" },
            { label: "Servings", value: recipe.servings, unit: "" },
            { label: "Carbs",    value: nutrition.carbs_g ? `${nutrition.carbs_g}g` : "—", unit: "" },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col items-center justify-center py-3 px-2">
              <p className="text-headline-sm font-black text-on-surface">{value}</p>
              <p className="text-label-sm text-outline mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Body ─────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col md:flex-row min-h-0">

            {/* ── LEFT: Ingredients ──────────────────────────── */}
            <div className="md:w-[45%] border-r border-outline-variant/30 p-6 space-y-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-headline-sm font-bold text-on-surface">Ingredients</h3>
                <span className="text-label-sm text-primary font-semibold">
                  {recipe.ingredients.length} items
                </span>
              </div>

              <div className="space-y-2">
                {recipe.ingredients.map((ing, i) => (
                  <div
                    key={`${ing.canonical_ingredient}-${i}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low"
                  >
                    {/* Status dot — placeholder, no inventory data yet */}
                    <span className="w-2 h-2 rounded-full bg-outline-variant flex-shrink-0" />

                    <div className="flex-1 min-w-0">
                      <p className="text-body-sm text-on-surface font-medium">
                        {ing.display_ingredient ?? ing.canonical_ingredient}
                        {ing.preparation ? `, ${ing.preparation}` : ""}
                      </p>
                      {ing.optional && (
                        <p className="text-[10px] text-outline mt-0.5">Optional</p>
                      )}
                    </div>

                    <span className="text-label-sm text-outline shrink-0">
                      {ing.amount} {ing.unit}
                    </span>
                  </div>
                ))}
              </div>

              {/* Nutrition sidebar below ingredients on mobile */}
              {Object.values(nutrition).some(Boolean) && (
                <div className="bg-white rounded-2xl border border-outline-variant/30 p-4 shadow-sm">
                  <h4 className="text-label-lg text-primary mb-3">Nutrition Info</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ["Calories", nutrition.calories, ""],
                      ["Protein",  nutrition.protein_g, "g"],
                      ["Carbs",    nutrition.carbs_g,   "g"],
                      ["Fat",      nutrition.fat_g,     "g"],
                      ["Fiber",    nutrition.fiber_g,   "g"],
                      ["Sodium",   nutrition.sodium_mg, "mg"],
                    ].filter(([, v]) => v !== undefined && v !== null).map(([label, val, unit]) => (
                      <div key={String(label)} className="bg-surface-container-low rounded-xl p-2.5">
                        <p className="text-[10px] text-outline uppercase tracking-wide">{String(label)}</p>
                        <p className="text-label-lg text-on-surface font-bold mt-0.5">{String(val)}{String(unit)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── RIGHT: Preparation ─────────────────────────── */}
            <div className="flex-1 p-6 space-y-5">
              <h3 className="text-headline-sm font-bold text-on-surface">Preparation</h3>

              <div className="space-y-6">
                {recipe.steps.map((step) => (
                  <div key={step.step} className="flex gap-4">
                    {/* Step number */}
                    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary-fixed-dim flex items-center justify-center font-black text-on-primary-fixed text-label-lg">
                      {step.step}
                    </div>

                    <div className="flex-1 pt-1.5 space-y-2">
                      {/* Extract title from step text (first sentence) */}
                      {(() => {
                        const parts = step.what_to_do.split(/(?<=[.!?])\s+/);
                        const title = parts[0];
                        const body  = parts.slice(1).join(" ");
                        return (
                          <>
                            <p className="text-label-lg font-bold text-on-surface">{title}</p>
                            {body && <p className="text-body-sm text-on-surface-variant leading-relaxed">{body}</p>}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer CTA ───────────────────────────────────────── */}
        <div className="border-t border-outline-variant/30 px-6 py-4 bg-white flex items-center justify-between gap-4 flex-shrink-0">
          <p className="text-body-sm text-outline">
            {recipe.ingredients.length} ingredients · {recipe.servings} servings
            {nutrition.calories ? ` · ${nutrition.calories} kcal` : ""}
          </p>
          <div className="flex items-center gap-3">
            {canEdit && onEdit && (
              <button
                onClick={() => onEdit(recipe)}
                className="px-5 py-2.5 rounded-full border border-outline-variant text-label-md font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
              >
                Edit Recipe
              </button>
            )}
            <button
              onClick={() => onAddToCart(recipe)}
              className="bg-primary text-on-primary px-8 py-2.5 rounded-full font-bold text-label-lg flex items-center gap-2 hover:bg-on-primary-container active:scale-[0.97] transition-all shadow-sm"
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
