"use client";

import type { BaseRecipe } from "@cart/shared";

function getDietaryBadges(recipe: BaseRecipe) {
  return recipe.tags.filter((tag) => tag.kind === "dietary_badge").slice(0, 4);
}

export function RecipeDetailOverlay(props: {
  recipe: BaseRecipe | null;
  onClose: () => void;
  onAddToCart: (recipe: BaseRecipe) => void;
}) {
  const { recipe, onAddToCart, onClose } = props;

  if (!recipe) return null;

  const badges = getDietaryBadges(recipe);
  const nutritionEntries = Object.entries(recipe.nutrition_data ?? {}).filter(
    ([, value]) => value !== undefined && value !== null,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#1a1c1a]/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative w-full sm:max-w-5xl max-h-[95vh] sm:max-h-[90vh] bg-[#faf9f6] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col shadow-2xl">

        {/* Hero */}
        <div className="relative h-56 sm:h-64 flex-shrink-0 bg-[#efeeeb]">
          {recipe.cover_image_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={recipe.cover_image_url} alt={recipe.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="material-symbols-outlined text-[#d7c2b9] text-8xl">restaurant</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a1c1a]/80 via-[#1a1c1a]/20 to-transparent" />

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[#1a1c1a] text-[20px]">close</span>
          </button>

          {/* Overlay text */}
          <div className="absolute bottom-0 left-0 p-6">
            <div className="flex flex-wrap gap-2 mb-2">
              <span className="bg-[#ffb38e] text-[#7a4326] px-3 py-1 rounded-full text-label-sm uppercase tracking-wide">
                {recipe.cuisine.label}
              </span>
              {badges.map((b) => (
                <span key={b.id} className="bg-[#efe3b3] text-[#6d643f] px-3 py-1 rounded-full text-label-sm uppercase tracking-wide">
                  {b.name}
                </span>
              ))}
            </div>
            <h2 className="text-headline-md text-white">{recipe.name}</h2>
            <div className="flex items-center gap-4 mt-2 text-white/80 text-label-md">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px]">restaurant</span>
                {recipe.servings} servings
              </span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col md:flex-row gap-6 p-6">

            {/* Left: steps + ingredients */}
            <div className="flex-1 space-y-6">
              {/* Ingredients */}
              <section>
                <h3 className="text-headline-sm text-[#1a1c1a] flex items-center gap-3 mb-4">
                  Ingredients
                  <span className="flex-1 h-px bg-[#d7c2b9]/40" />
                  <span className="text-label-md text-[#895032]">{recipe.ingredients.length} items</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {recipe.ingredients.map((ing, i) => (
                    <div key={`${ing.canonical_ingredient}-${i}`} className="flex items-center justify-between p-3 rounded-xl bg-[#f4f3f1]">
                      <span className="text-body-sm text-[#1a1c1a]">
                        {ing.display_ingredient ?? ing.canonical_ingredient}
                      </span>
                      <span className="text-label-sm text-[#85736c] ml-2 shrink-0">
                        {ing.amount} {ing.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Steps */}
              <section>
                <h3 className="text-headline-sm text-[#1a1c1a] flex items-center gap-3 mb-4">
                  Steps
                  <span className="flex-1 h-px bg-[#d7c2b9]/40" />
                </h3>
                <div className="space-y-5">
                  {recipe.steps.map((step) => (
                    <div key={step.step} className="flex gap-4">
                      <div className="flex-shrink-0 w-9 h-9 bg-[#ffb38e] rounded-full flex items-center justify-center text-[#7a4326] font-bold text-label-lg">
                        {step.step}
                      </div>
                      <p className="text-body-md text-[#52443d] pt-1.5">{step.what_to_do}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Right: nutrition + CTA */}
            <div className="md:w-64 space-y-4 flex-shrink-0">
              {nutritionEntries.length > 0 && (
                <div className="bg-white rounded-2xl border border-[#d7c2b9]/30 p-5 shadow-sm">
                  <h4 className="text-label-lg text-[#895032] mb-3">Nutrition</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {nutritionEntries.map(([key, val]) => (
                      <div key={key} className="bg-[#f4f3f1] rounded-xl p-3">
                        <p className="text-label-sm text-[#85736c] uppercase tracking-wide">
                          {key.replace(/_/g, " ")}
                        </p>
                        <p className="text-headline-sm text-[#1a1c1a] mt-0.5">{String(val)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => onAddToCart(recipe)}
                className="w-full bg-[#895032] text-white rounded-full py-4 text-label-lg font-semibold flex items-center justify-center gap-2 hover:bg-[#7a4326] active:scale-[0.98] transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-[20px]">shopping_cart</span>
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
