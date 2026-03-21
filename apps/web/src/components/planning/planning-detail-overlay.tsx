"use client";

import type { BaseRecipe, Cart } from "@cart/shared";
import type { DashboardCartDraft } from "@/components/dashboard/drafts-and-carts-section";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
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

  return (
    <div className="fixed inset-0 z-50 bg-[rgba(24,35,29,0.6)] p-4 backdrop-blur-sm sm:p-6">
      <div className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-[color:var(--line)] bg-[color:var(--paper)] shadow-[0_28px_90px_rgba(10,18,13,0.28)]">
        <div className="flex items-center justify-between gap-4 border-b border-[color:var(--line)] px-5 py-4 sm:px-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--olive)]">
              Cart
            </p>
            <h2 className="mt-2 font-display text-4xl leading-[0.94] text-[color:var(--forest-strong)]">
              {props.detail.cart.name ?? "Unnamed cart"}
            </h2>
            <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
              {props.detail.cart.selections.length} selections · {props.detail.cart.dishes.length} dishes · updated{" "}
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
          <div className="grid gap-4 md:grid-cols-2">
            {props.detail.cart.dishes.map((dish, index) => (
              <article
                key={`${dish.name}-${index}`}
                className="rounded-[1.45rem] border border-[color:var(--line)] bg-white/52 p-5"
              >
                <div className="grid gap-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--olive)]">
                      {dish.cuisine ?? "Dish"}
                    </p>
                    <h3 className="mt-2 font-display text-[1.9rem] leading-[0.96] text-[color:var(--forest-strong)]">
                      {dish.name}
                    </h3>
                  </div>

                  <div className="grid gap-1 text-sm text-[color:var(--ink-soft)]">
                    <div>Servings: {dish.servings ?? "Default"}</div>
                    <div>Ingredients: {dish.ingredients.length}</div>
                    <div>Steps: {dish.steps.length}</div>
                  </div>

                  <div className="grid gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--olive)]">
                      Ingredients
                    </p>
                    <ul className="grid gap-1 text-sm leading-6 text-[color:var(--ink-soft)]">
                      {dish.ingredients.slice(0, 5).map((ingredient, ingredientIndex) => (
                        <li
                          key={`${ingredient.canonical_ingredient}-${ingredientIndex}`}
                        >
                          {ingredient.amount} {ingredient.unit}{" "}
                          {ingredient.display_ingredient ??
                            ingredient.canonical_ingredient}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
