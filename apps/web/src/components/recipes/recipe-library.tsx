"use client";

import { useCallback, useDeferredValue, useMemo, useState } from "react";
import type {
  BaseRecipe,
  Cart,
  Retailer,
  ShoppingCart,
} from "@cart/shared";
import { NewDraftOverlay } from "@/components/dashboard/new-draft-overlay";
import type { DashboardCartDraft } from "@/components/dashboard/drafts-and-carts-section";
import { PlanningDetailOverlay } from "@/components/planning/planning-detail-overlay";
import { ShoppingCartDetailOverlay } from "@/components/planning/shopping-cart-detail-overlay";
import { RecipeImage } from "@/components/ui/recipe-image";
import { RecipeDetailOverlay } from "./recipe-detail-overlay";

function getDietaryBadges(recipe: BaseRecipe) {
  return recipe.tags.filter((tag) => tag.kind === "dietary_badge").slice(0, 3);
}

export function RecipeLibrary(props: {
  recipes: BaseRecipe[];
  drafts: DashboardCartDraft[];
  carts: Cart[];
}) {
  const [query, setQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showAllTags, setShowAllTags] = useState(false);
  const [activeRecipeId, setActiveRecipeId] = useState<string | null>(null);
  const [builderSeed, setBuilderSeed] = useState(0);
  const [builderConfig, setBuilderConfig] = useState<{
    selections: Array<{ recipeId: string; quantity: number }>;
    name?: string;
    retailer?: Retailer;
    mode: "create" | "edit-draft" | "edit-cart";
    resourceId?: string;
  }>({ selections: [], mode: "create" });
  const [isBuilderOpen, setBuilderOpen] = useState(false);
  const [activeDetail, setActiveDetail] = useState<
    | { type: "draft"; id: string }
    | { type: "cart"; id: string }
    | null
  >(null);
  const [activeShoppingCart, setActiveShoppingCart] =
    useState<ShoppingCart | null>(null);
  const deferredQuery = useDeferredValue(query);

  const recipeMap = useMemo(
    () => new Map(props.recipes.map((recipe) => [recipe.id, recipe])),
    [props.recipes],
  );

  const availableTags = useMemo(() => {
    const tagMap = new Map<string, string>();
    for (const recipe of props.recipes) {
      for (const tag of recipe.tags) {
        tagMap.set(tag.id, tag.name);
      }
    }

    return Array.from(tagMap.entries())
      .map(([id, name]) => ({ id, name }))
      .toSorted((left, right) => left.name.localeCompare(right.name));
  }, [props.recipes]);

  const visibleTags = showAllTags ? availableTags : availableTags.slice(0, 12);
  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const filteredRecipes = useMemo(
    () =>
      props.recipes.filter((recipe) => {
        const matchesQuery =
          normalizedQuery.length === 0 ||
          recipe.name.toLowerCase().includes(normalizedQuery) ||
          recipe.description?.toLowerCase().includes(normalizedQuery) ||
          recipe.cuisine.label.toLowerCase().includes(normalizedQuery) ||
          recipe.tags.some((tag) =>
            tag.name.toLowerCase().includes(normalizedQuery),
          );

        const matchesTag =
          selectedTag === null ||
          recipe.tags.some((tag) => tag.id === selectedTag);

        return matchesQuery && matchesTag;
      }),
    [normalizedQuery, props.recipes, selectedTag],
  );

  const openBuilder = useCallback(
    (
      selections: Array<{ recipeId: string; quantity: number }> = [],
      name = "",
      retailer?: Retailer,
      mode: "create" | "edit-draft" | "edit-cart" = "create",
      resourceId?: string,
    ) => {
    setBuilderSeed((current) => current + 1);
    setBuilderConfig({ selections, name, retailer, mode, resourceId });
    setBuilderOpen(true);
    },
    [],
  );

  const closeBuilder = useCallback(() => {
    setBuilderOpen(false);
  }, []);

  const handleAddToCart = useCallback(
    (recipe: BaseRecipe) => {
      setActiveRecipeId(null);
      openBuilder([{ recipeId: recipe.id, quantity: 1 }]);
    },
    [openBuilder],
  );

  const openEditorFromDetail = useCallback(
    (detail: {
      type: "draft" | "cart";
      id: string;
      name?: string;
      retailer: string;
      recipeSelections: Array<{ recipeId: string; quantity: number }>;
    }) => {
      setActiveDetail(null);
      openBuilder(
        detail.recipeSelections,
        detail.name ?? "",
        detail.retailer as Retailer,
        detail.type === "draft" ? "edit-draft" : "edit-cart",
        detail.id,
      );
    },
    [openBuilder],
  );

  const activeDetailData =
    activeDetail?.type === "draft"
      ? {
          type: "draft" as const,
          draft: props.drafts.find((draft) => draft.id === activeDetail.id) ?? null,
          recipes: props.recipes,
        }
      : activeDetail?.type === "cart"
        ? {
            type: "cart" as const,
            cart: props.carts.find((cart) => cart.id === activeDetail.id) ?? null,
            recipes: props.recipes,
          }
        : null;

  const openShoppingCart = useCallback((shoppingCart: ShoppingCart) => {
    setActiveDetail(null);
    setActiveShoppingCart(shoppingCart);
  }, []);

  return (
    <>
      <section className="rounded-[2rem] border border-[#d7c2b9] bg-white/60 p-6 shadow-sm backdrop-blur-sm">
        <div className="grid gap-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="font-sans font-bold text-4xl leading-none text-[#1a1c1a]">
                Recipe library
              </h1>
              <p className="mt-2 text-sm text-[#85736c]">
                Browse the visible shelf, scan dietary badges, and pull dishes
                into a cart when you are ready to plan.
              </p>
            </div>

            <label className="block w-full lg:max-w-sm">
              <span className="sr-only">Search recipes</span>
              <input
                suppressHydrationWarning
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search dishes"
                className="min-h-11 w-full rounded-full border border-[#d7c2b9] bg-[#faf9f6]/78 px-4 text-sm text-[#1a1c1a] outline-none transition placeholder:text-[#85736c]/72 focus:border-[#895032]"
              />
            </label>
          </div>

          {availableTags.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedTag(null)}
                className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] transition ${
                  selectedTag === null
                    ? "border-[#895032] bg-[#895032] text-[#faf9f6]"
                    : "border-[#d7c2b9] bg-[#faf9f6]/72 text-[#85736c] hover:bg-white"
                }`}
              >
                All tags
              </button>
              {visibleTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() =>
                    setSelectedTag((current) =>
                      current === tag.id ? null : tag.id,
                    )
                  }
                  className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] transition ${
                    selectedTag === tag.id
                      ? "border-[#895032] bg-[#895032]/14 text-[#1a1c1a]"
                      : "border-[#d7c2b9] bg-[#faf9f6]/72 text-[#85736c] hover:bg-white"
                  }`}
                >
                  {tag.name}
                </button>
              ))}
              {availableTags.length > 12 ? (
                <button
                  type="button"
                  onClick={() => setShowAllTags((current) => !current)}
                  className="rounded-full border border-[#d7c2b9] bg-transparent px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#895032] transition hover:bg-white"
                >
                  {showAllTags ? "Show less" : "Show all"}
                </button>
              ) : null}
            </div>
          ) : null}

          {filteredRecipes.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {filteredRecipes.map((recipe) => {
                const badges = getDietaryBadges(recipe);

                return (
                  <button
                    key={recipe.id}
                    type="button"
                    onClick={() => setActiveRecipeId(recipe.id)}
                    className="overflow-hidden rounded-[1.35rem] border border-[#d7c2b9] bg-[#faf9f6]/72 text-left transition hover:border-[#895032]/28 hover:bg-white/82"
                  >
                    <div className="relative h-28 overflow-hidden border-b border-[#d7c2b9]">
                      <RecipeImage
                        src={recipe.cover_image_url}
                        alt={recipe.name}
                        seed={recipe.id}
                        className="h-full w-full"
                        imgClassName="h-full w-full object-cover"
                      />
                      {badges.length > 0 && (
                        <div className="absolute bottom-2 left-2 flex flex-wrap gap-1.5">
                          {badges.map((badge) => (
                            <span
                              key={badge.id}
                              className="rounded-full border border-[#d7c2b9] bg-[rgba(250,246,236,0.92)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#895032]"
                            >
                              {badge.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid gap-2 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#895032]">
                            {recipe.cuisine.label}
                          </p>
                          <h2 className="mt-2 font-sans font-bold text-[1.9rem] leading-[0.94] text-[#1a1c1a]">
                            {recipe.name}
                          </h2>
                        </div>
                        <span className="text-xs text-[#85736c]">
                          {recipe.servings} servings
                        </span>
                      </div>

                      <p className="line-clamp-2 text-sm leading-6 text-[#85736c]">
                        {recipe.description?.trim() || "No description yet."}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[1.55rem] border border-dashed border-[#d7c2b9] bg-[#faf9f6]/52 px-5 py-6">
              <div className="text-lg font-semibold text-[#1a1c1a]">
                No recipes match this view
              </div>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[#85736c]">
                Try another search term or remove the current tag filter.
              </p>
            </div>
          )}
        </div>
      </section>

      <RecipeDetailOverlay
        recipe={activeRecipeId ? recipeMap.get(activeRecipeId) ?? null : null}
        onClose={() => setActiveRecipeId(null)}
        onAddToCart={handleAddToCart}
      />

      <NewDraftOverlay
        key={builderSeed}
        open={isBuilderOpen}
        recipes={props.recipes}
        onClose={closeBuilder}
        onCreated={setActiveDetail}
        initialSelections={builderConfig.selections}
        initialName={builderConfig.name}
        initialRetailer={builderConfig.retailer}
        mode={builderConfig.mode}
        resourceId={builderConfig.resourceId}
      />

      <PlanningDetailOverlay
        detail={
          activeDetailData?.type === "draft" && activeDetailData.draft
            ? {
                type: "draft",
                draft: activeDetailData.draft,
                recipes: activeDetailData.recipes,
              }
            : activeDetailData?.type === "cart" && activeDetailData.cart
              ? {
                  type: "cart",
                  cart: activeDetailData.cart,
                  recipes: activeDetailData.recipes,
                }
              : null
        }
        onClose={() => setActiveDetail(null)}
        onEdit={openEditorFromDetail}
        onDeleted={() => setActiveDetail(null)}
        onOpenShoppingCart={openShoppingCart}
      />

      <ShoppingCartDetailOverlay
        key={
          activeShoppingCart
            ? `${activeShoppingCart.id ?? "shopping-cart"}:${activeShoppingCart.updated_at ?? activeShoppingCart.created_at ?? "open"}`
            : "shopping-cart-none"
        }
        shoppingCart={activeShoppingCart}
        onClose={() => setActiveShoppingCart(null)}
      />
    </>
  );
}
