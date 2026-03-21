"use client";

import type { AggregatedIngredient, BaseRecipe, Cart, Tag } from "@cart/shared";
import type { DashboardCartDraft } from "@/components/dashboard/drafts-and-carts-section";

const DIETARY_BADGE_SLUGS = [
  "halal",
  "vegan",
  "vegetarian",
  "gluten-free",
  "dairy-free",
  "nut-free",
  "high-protein",
] as const;

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatIngredientAmount(ingredient: AggregatedIngredient) {
  return `${ingredient.total_amount} ${ingredient.unit} ${ingredient.canonical_ingredient}`;
}

function getDietaryBadges(tags?: Tag[]) {
  if (!tags?.length) {
    return [];
  }

  const bySlug = new Set(DIETARY_BADGE_SLUGS);
  return tags.filter((tag) => bySlug.has(tag.slug as (typeof DIETARY_BADGE_SLUGS)[number]));
}

function RecipeReferenceCard(props: {
  recipe?: BaseRecipe;
  fallbackTitle: string;
  servings?: number;
}) {
  const badges = getDietaryBadges(props.recipe?.tags).slice(0, 3);

  return (
    <article className="overflow-hidden rounded-[1.1rem] border border-[color:var(--line)] bg-white/60">
      {props.recipe?.cover_image_url ? (
        <div className="h-24 overflow-hidden border-b border-[color:var(--line)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={props.recipe.cover_image_url}
            alt={props.recipe.name}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="h-24 border-b border-[color:var(--line)] bg-[linear-gradient(135deg,rgba(115,135,101,0.12),rgba(245,240,228,0.44)),radial-gradient(circle_at_top_left,rgba(161,77,49,0.1),transparent_34%)]" />
      )}

      <div className="grid gap-2 p-3">
        <h3 className="font-display text-[1.35rem] leading-[0.94] text-[color:var(--forest-strong)]">
          {props.recipe?.name ?? props.fallbackTitle}
        </h3>
        <p className="text-xs text-[color:var(--ink-soft)]">
          Servings: {props.servings ?? props.recipe?.servings ?? "Default"}
        </p>

        <div className="flex min-h-6 flex-wrap gap-1.5">
          {badges.map((badge) => (
            <span
              key={badge.id}
              className="rounded-full border border-[color:var(--line)] bg-[rgba(250,246,236,0.92)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--olive)]"
            >
              {badge.name}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}

export function PlanningDetailOverlay(props: {
  detail:
    | {
        type: "draft";
        draft: DashboardCartDraft;
        recipes: BaseRecipe[];
      }
    | {
        type: "cart";
        cart: Cart;
        recipes: BaseRecipe[];
      }
    | null;
  onClose: () => void;
}) {
  if (!props.detail) {
    return null;
  }

  if (props.detail.type === "draft") {
    const recipeMap = new Map(
      props.detail.recipes.map((recipe) => [recipe.id, recipe]),
    );
    const selections = props.detail.draft.selections.map((selection) => ({
      ...selection,
      recipe: recipeMap.get(selection.recipe_id),
    }));

    return (
      <div className="fixed inset-0 z-50 bg-[rgba(24,35,29,0.6)] p-4 backdrop-blur-sm sm:p-6">
        <div className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-[color:var(--line)] bg-[color:var(--paper)] shadow-[0_28px_90px_rgba(10,18,13,0.28)]">
          <div className="flex items-center justify-between gap-4 border-b border-[color:var(--line)] px-5 py-4 sm:px-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--olive)]">
                Draft
              </p>
              <h2 className="mt-2 font-display text-4xl leading-[0.94] text-[color:var(--forest-strong)]">
                {props.detail.draft.name ?? "Untitled draft"}
              </h2>
              <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
                Retailer {props.detail.draft.retailer} · {props.detail.draft.selections.length} selections · updated{" "}
                {formatDate(props.detail.draft.updated_at)}
              </p>
            </div>
            <button
              type="button"
              onClick={props.onClose}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--line)] bg-white/74 text-xl text-[color:var(--forest-strong)] transition hover:bg-white"
              aria-label="Close draft detail"
            >
              ×
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {selections.map((selection, index) => (
                <article
                  key={`${selection.recipe_id}-${index}`}
                  className="overflow-hidden rounded-[1.45rem] border border-[color:var(--line)] bg-white/52"
                >
                  {selection.recipe?.cover_image_url ? (
                    <div className="h-28 overflow-hidden border-b border-[color:var(--line)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selection.recipe.cover_image_url}
                        alt={selection.recipe.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-28 border-b border-[color:var(--line)] bg-[linear-gradient(135deg,rgba(115,135,101,0.12),rgba(245,240,228,0.38)),radial-gradient(circle_at_top_left,rgba(161,77,49,0.12),transparent_34%)]" />
                  )}

                  <div className="grid gap-3 p-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--olive)]">
                        {selection.recipe?.cuisine.label ?? "Recipe"}
                      </p>
                      <h3 className="mt-2 font-display text-[1.8rem] leading-[0.96] text-[color:var(--forest-strong)]">
                        {selection.recipe?.name ?? selection.recipe_id}
                      </h3>
                    </div>

                    <div className="grid gap-1 text-sm text-[color:var(--ink-soft)]">
                      <div>Quantity: {selection.quantity}</div>
                      <div>
                        Servings:{" "}
                        {selection.servings_override ??
                          selection.recipe?.servings ??
                          "Default"}
                      </div>
                    </div>

                    <p className="line-clamp-3 text-sm leading-6 text-[color:var(--ink-soft)]">
                      {selection.recipe?.description?.trim() ||
                        "No description yet for this recipe."}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const recipeMap = new Map(props.detail.recipes.map((recipe) => [recipe.id, recipe]));
  const cartRecipes = props.detail.cart.dishes.map((dish, index) => ({
    dish,
    recipe: dish.id ? recipeMap.get(dish.id) : undefined,
    key: `${dish.id ?? dish.name}-${index}`,
  }));

  return (
    <div className="fixed inset-0 z-50 bg-[rgba(24,35,29,0.6)] p-4 backdrop-blur-sm sm:p-6">
      <div className="mx-auto flex h-full w-full max-w-7xl flex-col overflow-hidden rounded-[2rem] border border-[color:var(--line)] bg-[color:var(--paper)] shadow-[0_28px_90px_rgba(10,18,13,0.28)]">
        <div className="flex items-center justify-between gap-4 border-b border-[color:var(--line)] px-5 py-4 sm:px-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--olive)]">
              Cart
            </p>
            <h2 className="mt-2 font-display text-4xl leading-[0.94] text-[color:var(--forest-strong)]">
              {props.detail.cart.name ?? "Unnamed cart"}
            </h2>
            <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
              Retailer {props.detail.cart.retailer} · {props.detail.cart.dishes.length} dishes · {props.detail.cart.overview.length} aggregated ingredients · updated{" "}
              {formatDate(
                props.detail.cart.updated_at ??
                  props.detail.cart.created_at ??
                  new Date().toISOString(),
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={props.onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--line)] bg-white/74 text-xl text-[color:var(--forest-strong)] transition hover:bg-white"
            aria-label="Close cart detail"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="grid gap-6 xl:grid-cols-[1.5fr_0.95fr]">
            <section className="rounded-[1.6rem] border border-[color:var(--line)] bg-white/52 p-5 sm:p-6">
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[color:var(--line)] pb-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--olive)]">
                    Ingredient menu
                  </p>
                  <h3 className="mt-2 font-display text-[2.1rem] leading-[0.94] text-[color:var(--forest-strong)]">
                    Aggregated ingredients
                  </h3>
                </div>
                <p className="text-sm text-[color:var(--ink-soft)]">
                  {props.detail.cart.overview.length} lines
                </p>
              </div>

              <ul className="grid gap-3 pt-5">
                {props.detail.cart.overview.map((ingredient) => (
                  <li
                    key={`${ingredient.canonical_ingredient}-${ingredient.unit}`}
                    className="rounded-[1.1rem] border border-[color:var(--line)] bg-[rgba(255,255,255,0.72)] px-4 py-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-[color:var(--forest-strong)]">
                          {ingredient.canonical_ingredient}
                        </p>
                        <p className="mt-1 text-sm text-[color:var(--ink-soft)]">
                          {formatIngredientAmount(ingredient)}
                        </p>
                      </div>
                      {ingredient.purchase_unit_hint ? (
                        <span className="rounded-full border border-[color:var(--line)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--olive)]">
                          Buy by {ingredient.purchase_unit_hint}
                        </span>
                      ) : null}
                    </div>

                    {ingredient.source_dishes.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {ingredient.source_dishes.map((source, sourceIndex) => (
                          <span
                            key={`${source.dish_name}-${sourceIndex}`}
                            className="rounded-full border border-[color:var(--line)] bg-[rgba(250,246,236,0.88)] px-3 py-1 text-[11px] font-medium text-[color:var(--ink-soft)]"
                          >
                            {source.dish_name}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>

            <aside className="flex min-h-0 flex-col overflow-hidden rounded-[1.6rem] border border-[color:var(--line)] bg-white/52">
              <div className="border-b border-[color:var(--line)] p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--olive)]">
                  Reference dishes
                </p>
                <h3 className="mt-2 font-display text-[2rem] leading-[0.94] text-[color:var(--forest-strong)]">
                  Recipes in this cart
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-3 overflow-y-auto p-4">
                {cartRecipes.map(({ dish, recipe, key }) => (
                  <RecipeReferenceCard
                    key={key}
                    recipe={recipe}
                    fallbackTitle={dish.name}
                    servings={dish.servings}
                  />
                ))}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
