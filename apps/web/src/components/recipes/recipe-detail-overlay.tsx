"use client";

import type { BaseRecipe } from "@cart/shared";

function getDietaryBadges(recipe: BaseRecipe) {
  return recipe.tags.filter((tag) => tag.kind === "dietary_badge").slice(0, 4);
}

function formatNutritionLabel(label: string) {
  return label
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function RecipeDetailOverlay(props: {
  recipe: BaseRecipe | null;
  onClose: () => void;
  onAddToCart: (recipe: BaseRecipe) => void;
}) {
  const { recipe, onAddToCart, onClose } = props;

  if (!recipe) {
    return null;
  }

  const badges = getDietaryBadges(recipe);
  const nutritionEntries = Object.entries(recipe.nutrition_data ?? {}).filter(
    ([, value]) => value !== undefined && value !== null,
  );

  return (
    <div className="fixed inset-0 z-50 bg-[rgba(24,35,29,0.6)] p-4 backdrop-blur-sm sm:p-6">
      <div className="mx-auto flex h-full w-full max-w-7xl flex-col overflow-hidden rounded-[2rem] border border-[color:var(--line)] bg-[color:var(--paper)] shadow-[0_28px_90px_rgba(10,18,13,0.28)]">
        <div className="flex items-center justify-between gap-4 border-b border-[color:var(--line)] px-5 py-4 sm:px-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--olive)]">
              Recipe
            </p>
            <h2 className="mt-2 font-display text-4xl leading-[0.94] text-[color:var(--forest-strong)]">
              {recipe.name}
            </h2>
            <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
              {recipe.cuisine.label} / {recipe.servings} servings
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--line)] bg-white/74 text-xl text-[color:var(--forest-strong)] transition hover:bg-white"
            aria-label="Close recipe detail"
          >
            x
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <section className="overflow-hidden rounded-[1.6rem] border border-[color:var(--line)] bg-white/52">
              {recipe.cover_image_url ? (
                <div className="h-72 overflow-hidden border-b border-[color:var(--line)] sm:h-80">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={recipe.cover_image_url}
                    alt={recipe.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-72 border-b border-[color:var(--line)] bg-[linear-gradient(135deg,rgba(115,135,101,0.12),rgba(245,240,228,0.44)),radial-gradient(circle_at_top_left,rgba(161,77,49,0.1),transparent_34%)] sm:h-80" />
              )}

              <div className="grid gap-5 p-5 sm:p-6">
                <div className="flex flex-wrap gap-2">
                  {badges.map((badge) => (
                    <span
                      key={badge.id}
                      className="rounded-full border border-[color:var(--line)] bg-[rgba(250,246,236,0.92)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--olive)]"
                    >
                      {badge.name}
                    </span>
                  ))}
                </div>

                <p className="max-w-3xl text-sm leading-7 text-[color:var(--ink-soft)] sm:text-base">
                  {recipe.description?.trim() || "No description yet."}
                </p>

                <div className="grid gap-4 lg:grid-cols-2">
                  <section className="rounded-[1.25rem] border border-[color:var(--line)] bg-[rgba(255,255,255,0.72)] p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--olive)]">
                      Ingredients
                    </p>
                    <ul className="mt-4 grid gap-3">
                      {recipe.ingredients.map((ingredient, index) => (
                        <li key={`${ingredient.canonical_ingredient}-${index}`}>
                          <p className="text-sm font-semibold text-[color:var(--forest-strong)]">
                            {ingredient.display_ingredient ??
                              `${ingredient.amount} ${ingredient.unit} ${ingredient.canonical_ingredient}`}
                          </p>
                          {ingredient.preparation || ingredient.optional ? (
                            <p className="mt-1 text-xs text-[color:var(--ink-soft)]">
                              {[
                                ingredient.preparation,
                                ingredient.optional ? "Optional" : null,
                              ]
                                .filter(Boolean)
                                .join(" / ")}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section className="rounded-[1.25rem] border border-[color:var(--line)] bg-[rgba(255,255,255,0.72)] p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--olive)]">
                      Steps
                    </p>
                    <ol className="mt-4 grid gap-3">
                      {recipe.steps.map((step) => (
                        <li key={step.step} className="grid gap-1">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--olive)]">
                            Step {step.step}
                          </p>
                          <p className="text-sm leading-6 text-[color:var(--ink-soft)]">
                            {step.what_to_do}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </section>
                </div>
              </div>
            </section>

            <aside className="grid gap-4">
              <section className="rounded-[1.6rem] border border-[color:var(--line)] bg-white/52 p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--olive)]">
                  Snapshot
                </p>
                <div className="mt-4 grid gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--ink-soft)]">
                      Cuisine
                    </p>
                    <p className="mt-1 text-base font-semibold text-[color:var(--forest-strong)]">
                      {recipe.cuisine.label}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--ink-soft)]">
                      Servings
                    </p>
                    <p className="mt-1 text-base font-semibold text-[color:var(--forest-strong)]">
                      {recipe.servings}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--ink-soft)]">
                      Tags
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {recipe.tags.slice(0, 8).map((tag) => (
                        <span
                          key={tag.id}
                          className="rounded-full border border-[color:var(--line)] bg-[color:var(--paper)]/72 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--ink-soft)]"
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-[1.6rem] border border-[color:var(--line)] bg-white/52 p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--olive)]">
                  Nutrition
                </p>
                {nutritionEntries.length > 0 ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {nutritionEntries.map(([key, value]) => (
                      <div
                        key={key}
                        className="rounded-[1rem] border border-[color:var(--line)] bg-[rgba(255,255,255,0.72)] px-4 py-3"
                      >
                        <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--ink-soft)]">
                          {formatNutritionLabel(key)}
                        </p>
                        <p className="mt-1 text-lg font-semibold text-[color:var(--forest-strong)]">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm leading-6 text-[color:var(--ink-soft)]">
                    No nutrition snapshot yet for this recipe.
                  </p>
                )}
              </section>

              <section className="rounded-[1.6rem] border border-[color:var(--line)] bg-white/52 p-5">
                <button
                  type="button"
                  onClick={() => onAddToCart(recipe)}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[color:var(--forest)] px-4 text-sm font-semibold text-[color:var(--paper)] transition hover:bg-[color:var(--forest-strong)]"
                >
                  Add to cart
                </button>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
