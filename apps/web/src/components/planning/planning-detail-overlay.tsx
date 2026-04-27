"use client";

import type {
  AggregatedIngredient,
  BaseRecipe,
  Cart,
  ShoppingCart,
  Tag,
} from "@cart/shared";
import { startTransition, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createShoppingCartAction,
  deletePlanningResourceAction,
} from "@/app/home-actions";
import type { DashboardCartDraft } from "@/components/dashboard/drafts-and-carts-section";
import { RecipeImage } from "@/components/ui/recipe-image";

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
  if (!tags?.length) return [];
  return tags.filter((tag) => tag.kind === "dietary_badge");
}

function RecipeReferenceCard(props: {
  recipe?: BaseRecipe;
  fallbackTitle: string;
  servings?: number;
}) {
  const badges = getDietaryBadges(props.recipe?.tags).slice(0, 3);

  return (
    <article className="overflow-hidden rounded-2xl border border-[#d7c2b9]/30 bg-white">
      <RecipeImage
        src={props.recipe?.cover_image_url}
        alt={props.recipe?.name ?? props.fallbackTitle}
        seed={props.recipe?.id ?? props.fallbackTitle}
        className="h-20 overflow-hidden"
        imgClassName="h-full w-full object-cover"
      />

      <div className="p-3 space-y-1.5">
        <h3 className="text-label-lg text-[#1a1c1a] leading-tight">
          {props.recipe?.name ?? props.fallbackTitle}
        </h3>
        <p className="text-body-sm text-[#85736c]">
          {props.servings ?? props.recipe?.servings ?? "Default"} servings
        </p>
        {badges.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {badges.map((badge) => (
              <span
                key={badge.id}
                className="bg-[#efe3b3] text-[#6d643f] px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide"
              >
                {badge.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

type EditableDetail =
  | {
      type: "draft";
      id: string;
      name?: string;
      retailer: string;
      recipeSelections: Array<{ recipeId: string; quantity: number }>;
    }
  | {
      type: "cart";
      id: string;
      name?: string;
      retailer: string;
      recipeSelections: Array<{ recipeId: string; quantity: number }>;
    };

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
  onEdit: (detail: EditableDetail) => void;
  onDeleted: () => void;
  onOpenShoppingCart: (shoppingCart: ShoppingCart) => void;
}) {
  const { detail, onClose, onDeleted, onEdit, onOpenShoppingCart } = props;
  const router = useRouter();
  const [deleteError, setDeleteError] = useState<string | undefined>();
  const [shoppingError, setShoppingError] = useState<string | undefined>();
  const [isDeleting, startDeleting] = useTransition();
  const [isGeneratingShoppingCart, startGeneratingShoppingCart] = useTransition();

  if (!detail) return null;

  function handleDelete(resourceType: "draft" | "cart", resourceId: string) {
    const confirmed = window.confirm(
      resourceType === "draft" ? "Delete this draft?" : "Delete this cart?",
    );
    if (!confirmed) return;

    setDeleteError(undefined);
    startDeleting(async () => {
      const result = await deletePlanningResourceAction(resourceType, resourceId);
      if (result.error) {
        setDeleteError(result.error);
        return;
      }
      onDeleted();
      startTransition(() => { router.refresh(); });
    });
  }

  function handleGenerateShoppingCart(cart: Cart) {
    if (!cart.id) {
      setShoppingError("Cart not found for shopping-cart generation.");
      return;
    }
    setShoppingError(undefined);
    startGeneratingShoppingCart(async () => {
      const result = await createShoppingCartAction(cart.id ?? "", cart.retailer);
      if (result.error || !result.shoppingCart) {
        setShoppingError(result.error ?? "Unable to generate this shopping cart right now.");
        return;
      }
      onOpenShoppingCart(result.shoppingCart);
      startTransition(() => { router.refresh(); });
    });
  }

  if (detail.type === "draft") {
    const draftDetail = detail.draft;
    const recipeMap = new Map(detail.recipes.map((recipe) => [recipe.id, recipe]));
    const selections = draftDetail.selections.map((selection) => ({
      ...selection,
      recipe: recipeMap.get(selection.recipe_id),
    }));

    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
        <div className="absolute inset-0 bg-[#1a1c1a]/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full sm:max-w-5xl max-h-[95vh] sm:max-h-[90vh] bg-[#faf9f6] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col shadow-2xl">

          {/* Header */}
          <div className="flex items-center justify-between gap-4 border-b border-[#d7c2b9]/30 px-5 py-4 sm:px-6 flex-shrink-0">
            <div>
              <p className="text-label-sm text-[#895032] uppercase tracking-wide">Draft</p>
              <h2 className="text-headline-md text-[#1a1c1a] mt-1">
                {draftDetail.name ?? "Untitled draft"}
              </h2>
              <p className="text-body-sm text-[#85736c] mt-1">
                {draftDetail.retailer} · {draftDetail.selections.length} selections · updated {formatDate(draftDetail.updated_at)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleDelete("draft", draftDetail.id)}
                disabled={isDeleting}
                className="inline-flex items-center justify-center rounded-full border border-[#ba1a1a]/30 bg-[#ffdad6]/40 px-4 py-2.5 text-label-md text-[#ba1a1a] transition hover:bg-[#ffdad6]/70 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() =>
                  onEdit({
                    type: "draft",
                    id: draftDetail.id,
                    name: draftDetail.name,
                    retailer: draftDetail.retailer,
                    recipeSelections: draftDetail.selections.map((s) => ({
                      recipeId: s.recipe_id,
                      quantity: s.quantity,
                    })),
                  })
                }
                className="inline-flex items-center justify-center rounded-full border border-[#d7c2b9] bg-white px-4 py-2.5 text-label-md text-[#1a1c1a] transition hover:bg-[#f4f3f1]"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-full border border-[#d7c2b9] bg-white hover:bg-[#f4f3f1] transition"
                aria-label="Close"
              >
                <span className="material-symbols-outlined text-[#1a1c1a] text-[20px]">close</span>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6">
            {deleteError && (
              <p className="mb-4 rounded-xl border border-[#ba1a1a]/20 bg-[#ffdad6]/30 px-4 py-3 text-body-sm text-[#ba1a1a]">
                {deleteError}
              </p>
            )}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {selections.map((selection, index) => (
                <article
                  key={`${selection.recipe_id}-${index}`}
                  className="overflow-hidden rounded-2xl border border-[#d7c2b9]/30 bg-white"
                >
                  <RecipeImage
                    src={selection.recipe?.cover_image_url}
                    alt={selection.recipe?.name ?? selection.recipe_id}
                    seed={selection.recipe?.id ?? selection.recipe_id}
                    className="h-28 overflow-hidden"
                    imgClassName="h-full w-full object-cover"
                  />

                  <div className="p-4 space-y-2">
                    <div>
                      <p className="text-label-sm text-[#895032] uppercase tracking-wide">
                        {selection.recipe?.cuisine.label ?? "Recipe"}
                      </p>
                      <h3 className="text-headline-sm text-[#1a1c1a] mt-1">
                        {selection.recipe?.name ?? selection.recipe_id}
                      </h3>
                    </div>
                    <div className="flex gap-4 text-body-sm text-[#85736c]">
                      <span>Qty: {selection.quantity}</span>
                      <span>Servings: {selection.servings_override ?? selection.recipe?.servings ?? "Default"}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {getDietaryBadges(selection.recipe?.tags).map((badge) => (
                        <span
                          key={badge.id}
                          className="bg-[#efe3b3] text-[#6d643f] px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide"
                        >
                          {badge.name}
                        </span>
                      ))}
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

  const cartDetail = detail.cart;
  const recipeMap = new Map(detail.recipes.map((recipe) => [recipe.id, recipe]));
  const cartRecipes = cartDetail.dishes.map((dish, index) => ({
    dish,
    recipe: dish.id ? recipeMap.get(dish.id) : undefined,
    key: `${dish.id ?? dish.name}-${index}`,
  }));
  const inKitchenCount = cartDetail.overview.filter(
    (ingredient) => ingredient.in_kitchen,
  ).length;
  const toBuyCount = cartDetail.overview.length - inKitchenCount;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="absolute inset-0 bg-[#1a1c1a]/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-6xl max-h-[95vh] sm:max-h-[90vh] bg-[#faf9f6] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-[#d7c2b9]/30 px-5 py-4 sm:px-6 flex-shrink-0">
          <div>
            <p className="text-label-sm text-[#895032] uppercase tracking-wide">Cart</p>
            <h2 className="text-headline-md text-[#1a1c1a] mt-1">
              {cartDetail.name ?? "Unnamed cart"}
            </h2>
            <p className="text-body-sm text-[#85736c] mt-1">
              {cartDetail.retailer} · {cartDetail.dishes.length} dishes · {cartDetail.overview.length} ingredients · updated{" "}
              {formatDate(cartDetail.updated_at ?? cartDetail.created_at ?? new Date().toISOString())}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleDelete("cart", cartDetail.id ?? "")}
              disabled={isDeleting}
              className="inline-flex items-center justify-center rounded-full border border-[#ba1a1a]/30 bg-[#ffdad6]/40 px-4 py-2.5 text-label-md text-[#ba1a1a] transition hover:bg-[#ffdad6]/70 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() =>
                onEdit({
                  type: "cart",
                  id: cartDetail.id ?? "",
                  name: cartDetail.name,
                  retailer: cartDetail.retailer,
                  recipeSelections: cartDetail.selections.map((s) => ({
                    recipeId: s.recipe_id,
                    quantity: s.quantity,
                  })),
                })
              }
              className="inline-flex items-center justify-center rounded-full border border-[#d7c2b9] bg-white px-4 py-2.5 text-label-md text-[#1a1c1a] transition hover:bg-[#f4f3f1]"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full border border-[#d7c2b9] bg-white hover:bg-[#f4f3f1] transition"
              aria-label="Close"
            >
              <span className="material-symbols-outlined text-[#1a1c1a] text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {deleteError && (
            <p className="mb-4 rounded-xl border border-[#ba1a1a]/20 bg-[#ffdad6]/30 px-4 py-3 text-body-sm text-[#ba1a1a]">
              {deleteError}
            </p>
          )}
          {shoppingError && (
            <p className="mb-4 rounded-xl border border-[#ba1a1a]/20 bg-[#ffdad6]/30 px-4 py-3 text-body-sm text-[#ba1a1a]">
              {shoppingError}
            </p>
          )}

          <div className="flex flex-col xl:flex-row gap-6">
            {/* Aggregated ingredients */}
            <section className="flex-1 bg-white rounded-2xl border border-[#d7c2b9]/30 p-5">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#d7c2b9]/30">
                <div>
                  <p className="text-label-sm text-[#895032] uppercase tracking-wide">Ingredient menu</p>
                  <h3 className="text-headline-sm text-[#1a1c1a] mt-1">Aggregated ingredients</h3>
                </div>
                <span className="text-body-sm text-[#85736c]">{cartDetail.overview.length} lines</span>
              </div>
              <ul className="space-y-2">
                {cartDetail.overview.map((ingredient) => (
                  <li
                    key={`${ingredient.canonical_ingredient}-${ingredient.unit}`}
                    className="rounded-xl border border-[#d7c2b9]/30 bg-[#f4f3f1] px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-label-lg text-[#1a1c1a]">
                          {ingredient.canonical_ingredient}
                        </p>
                        <p className="text-body-sm text-[#85736c] mt-0.5">
                          {formatIngredientAmount(ingredient)}
                        </p>
                      </div>
                      {ingredient.purchase_unit_hint && (
                        <span className="bg-[#ffb38e]/30 text-[#7a4326] px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide shrink-0">
                          Buy by {ingredient.purchase_unit_hint}
                        </span>
                      )}
                    </div>
                    {ingredient.source_dishes.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {ingredient.source_dishes.map((source, sourceIndex) => (
                          <span
                            key={`${source.dish_name}-${sourceIndex}`}
                            className="bg-white border border-[#d7c2b9]/50 text-[#85736c] px-2.5 py-0.5 rounded-full text-[11px]"
                          >
                            {source.dish_name}
                          </span>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            {/* Recipes sidebar */}
            <aside className="xl:w-72 flex flex-col bg-white rounded-2xl border border-[#d7c2b9]/30 overflow-hidden">
              <div className="p-5 border-b border-[#d7c2b9]/30 flex-shrink-0">
                <p className="text-label-sm text-[#895032] uppercase tracking-wide">Reference dishes</p>
                <h3 className="text-headline-sm text-[#1a1c1a] mt-1">Recipes in this cart</h3>
                <button
                  type="button"
                  onClick={() => handleGenerateShoppingCart(cartDetail)}
                  disabled={isGeneratingShoppingCart}
                  className="mt-4 w-full bg-[#895032] text-white rounded-full py-3 text-label-lg font-semibold flex items-center justify-center gap-2 hover:bg-[#7a4326] active:scale-[0.98] transition-all disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
                  {isGeneratingShoppingCart ? "Generating..." : "Generate shopping cart"}
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-2 xl:grid-cols-1 gap-3">
                  {cartRecipes.map(({ dish, recipe, key }) => (
                    <RecipeReferenceCard
                      key={key}
                      recipe={recipe}
                      fallbackTitle={dish.name}
                      servings={dish.servings}
                    />
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
