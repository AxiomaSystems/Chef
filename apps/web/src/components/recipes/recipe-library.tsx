"use client";

import { useCallback, useDeferredValue, useMemo, useState } from "react";
import type { BaseRecipe, Cart } from "@cart/shared";
import { NewDraftOverlay } from "@/components/dashboard/new-draft-overlay";
import type { DashboardCartDraft } from "@/components/dashboard/drafts-and-carts-section";
import { PlanningDetailOverlay } from "@/components/planning/planning-detail-overlay";
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
    recipeIds: string[];
    name?: string;
  }>({ recipeIds: [] });
  const [isBuilderOpen, setBuilderOpen] = useState(false);
  const [activeDetail, setActiveDetail] = useState<
    | { type: "draft"; id: string }
    | { type: "cart"; id: string }
    | null
  >(null);
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

  const openBuilder = useCallback((recipeIds: string[] = [], name = "") => {
    setBuilderSeed((current) => current + 1);
    setBuilderConfig({ recipeIds, name });
    setBuilderOpen(true);
  }, []);

  const closeBuilder = useCallback(() => {
    setBuilderOpen(false);
  }, []);

  const handleAddToCart = useCallback(
    (recipe: BaseRecipe) => {
      setActiveRecipeId(null);
      openBuilder([recipe.id]);
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

  return (
    <>
      <section className="rounded-[2rem] border border-[color:var(--line)] bg-white/60 p-6 shadow-[var(--shadow)] backdrop-blur-sm">
        <div className="grid gap-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="font-display text-4xl leading-none text-[color:var(--forest-strong)]">
                Recipe library
              </h1>
              <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
                Browse the visible shelf, scan dietary badges, and pull dishes
                into a cart when you are ready to plan.
              </p>
            </div>

            <label className="block w-full lg:max-w-sm">
              <span className="sr-only">Search recipes</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search dishes"
                className="min-h-11 w-full rounded-full border border-[color:var(--line)] bg-[color:var(--paper)]/78 px-4 text-sm text-[color:var(--forest-strong)] outline-none transition placeholder:text-[color:var(--ink-soft)]/72 focus:border-[color:var(--olive)]"
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
                    ? "border-[color:var(--forest)] bg-[color:var(--forest)] text-[color:var(--paper)]"
                    : "border-[color:var(--line)] bg-[color:var(--paper)]/72 text-[color:var(--ink-soft)] hover:bg-white"
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
                      ? "border-[color:var(--olive)] bg-[color:var(--olive)]/14 text-[color:var(--forest-strong)]"
                      : "border-[color:var(--line)] bg-[color:var(--paper)]/72 text-[color:var(--ink-soft)] hover:bg-white"
                  }`}
                >
                  {tag.name}
                </button>
              ))}
              {availableTags.length > 12 ? (
                <button
                  type="button"
                  onClick={() => setShowAllTags((current) => !current)}
                  className="rounded-full border border-[color:var(--line)] bg-transparent px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--olive)] transition hover:bg-white"
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
                    className="overflow-hidden rounded-[1.35rem] border border-[color:var(--line)] bg-[color:var(--paper)]/72 text-left transition hover:border-[color:var(--olive)]/28 hover:bg-white/82"
                  >
                    {recipe.cover_image_url ? (
                      <div className="h-28 overflow-hidden border-b border-[color:var(--line)]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={recipe.cover_image_url}
                          alt={recipe.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-28 border-b border-[color:var(--line)] bg-[linear-gradient(135deg,rgba(115,135,101,0.12),rgba(245,240,228,0.44)),radial-gradient(circle_at_top_left,rgba(161,77,49,0.1),transparent_34%)]" />
                    )}

                    <div className="grid gap-2 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--olive)]">
                            {recipe.cuisine.label}
                          </p>
                          <h2 className="mt-2 font-display text-[1.9rem] leading-[0.94] text-[color:var(--forest-strong)]">
                            {recipe.name}
                          </h2>
                        </div>
                        <span className="text-xs text-[color:var(--ink-soft)]">
                          {recipe.servings} servings
                        </span>
                      </div>

                      <p className="line-clamp-2 text-sm leading-6 text-[color:var(--ink-soft)]">
                        {recipe.description?.trim() || "No description yet."}
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
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[1.55rem] border border-dashed border-[color:var(--line)] bg-[color:var(--paper)]/52 px-5 py-6">
              <div className="text-lg font-semibold text-[color:var(--forest-strong)]">
                No recipes match this view
              </div>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[color:var(--ink-soft)]">
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
        initialRecipeIds={builderConfig.recipeIds}
        initialName={builderConfig.name}
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
      />
    </>
  );
}
