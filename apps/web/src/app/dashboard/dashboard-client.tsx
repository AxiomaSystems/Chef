"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  BaseRecipe,
  Cart,
  ShoppingCart,
  User,
  UserPreferences,
} from "@cart/shared";
import { AppShell } from "@/components/layout/app-shell";
import { RecipeImage } from "@/components/ui/recipe-image";
import { submitDraftFlowAction } from "@/app/home-actions";

function primaryBadge(recipe: BaseRecipe) {
  return (
    recipe.tags.find((tag) => tag.kind === "dietary_badge")?.name ??
    recipe.cuisine.label
  );
}

function minutesFor(recipe: BaseRecipe) {
  return Math.max(20, recipe.steps.length * 7);
}

function humanize(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function recipePreferenceScore(
  recipe: BaseRecipe,
  preferences: UserPreferences | null,
) {
  if (!preferences) return 0;

  let score = 0;
  const recipeText = [
    recipe.name,
    recipe.description,
    recipe.cuisine.label,
    ...recipe.tags.map((tag) => tag.name),
    ...recipe.ingredients.map((ingredient) => ingredient.canonical_ingredient),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const tagIds = new Set(recipe.tag_ids);

  if (preferences.preferred_cuisine_ids.includes(recipe.cuisine_id)) score += 5;

  for (const tagId of preferences.preferred_tag_ids) {
    if (tagIds.has(tagId)) score += 3;
  }

  for (const protein of preferences.favorite_proteins ?? []) {
    if (recipeText.includes(protein.replaceAll("_", " "))) score += 2;
  }

  for (const flavor of preferences.favorite_flavors ?? []) {
    const normalized = flavor.replaceAll("_", " ");
    if (
      recipeText.includes(normalized) ||
      recipeText.includes(normalized.split(" ")[0] ?? "")
    ) {
      score += 1;
    }
  }

  for (const disliked of preferences.disliked_ingredients ?? []) {
    if (recipeText.includes(disliked.replaceAll("_", " "))) score -= 6;
  }

  if (
    preferences.preferred_cooking_time === "under_15_min" &&
    minutesFor(recipe) <= 20
  ) {
    score += 2;
  }
  if (
    preferences.preferred_cooking_time === "15_to_30_min" &&
    minutesFor(recipe) <= 30
  ) {
    score += 2;
  }
  if (
    preferences.goal_priorities?.includes("build_muscle") &&
    (recipe.nutrition_data?.protein_g ?? 0) >= 25
  ) {
    score += 2;
  }

  return score;
}

function preferenceReason(
  recipe: BaseRecipe,
  preferences: UserPreferences | null,
) {
  if (!preferences) return recipe.cuisine.label;
  if (preferences.preferred_cuisine_ids.includes(recipe.cuisine_id)) {
    return `${recipe.cuisine.label} preference`;
  }

  const preferredTag = recipe.tags.find((tag) =>
    preferences.preferred_tag_ids.includes(tag.id),
  );
  if (preferredTag) return preferredTag.name;

  const recipeText = recipe.ingredients
    .map((ingredient) => ingredient.canonical_ingredient)
    .join(" ")
    .toLowerCase();
  const protein = (preferences.favorite_proteins ?? []).find((item) =>
    recipeText.includes(item.replaceAll("_", " ")),
  );

  return protein ? `Likes ${humanize(protein)}` : recipe.cuisine.label;
}

export function DashboardClient({
  user,
  preferences,
  recipes,
  carts,
  shoppingCarts,
}: {
  user: User | null;
  preferences: UserPreferences | null;
  recipes: BaseRecipe[];
  carts: Cart[];
  shoppingCarts: ShoppingCart[];
}) {
  const router = useRouter();
  const [selections, setSelections] = useState<Map<string, BaseRecipe>>(
    new Map(),
  );
  const [buildError, setBuildError] = useState<string | undefined>();
  const [isBuilding, startBuilding] = useTransition();

  const firstName = user?.name?.split(" ")[0] ?? "there";
  const featuredRecipe = recipes[0] ?? null;
  const preferenceRecipes = recipes
    .map((recipe) => ({
      recipe,
      score: recipePreferenceScore(recipe, preferences),
    }))
    .filter(
      ({ recipe, score }) => score > 0 && recipe.id !== featuredRecipe?.id,
    )
    .sort((left, right) => right.score - left.score)
    .slice(0, 4)
    .map(({ recipe }) => recipe);
  const forYouRecipes = recipes
    .filter(
      (recipe) =>
        recipe.id !== featuredRecipe?.id &&
        !preferenceRecipes.some((matched) => matched.id === recipe.id),
    )
    .slice(0, 6);
  const trendingRecipes =
    recipes.slice(7, 13).length > 0
      ? recipes.slice(7, 13)
      : recipes.slice(0, 6);
  const quickFilters = ["Quick & Easy", "High Protein", "Veggie"];

  function handleAddToCart(recipe: BaseRecipe) {
    setSelections((prev) => {
      const next = new Map(prev);
      next.set(recipe.id, recipe);
      return next;
    });
  }

  function removeSelection(id: string) {
    setSelections((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }

  function handleBuildCart() {
    if (selections.size === 0) return;
    setBuildError(undefined);

    startBuilding(async () => {
      const items = Array.from(selections.values());
      const fd = new FormData();
      fd.set("intent", "generate");
      fd.set(
        "selections_json",
        JSON.stringify(
          items.map((r) => ({
            recipe_id: r.id,
            recipe_name: r.name,
            quantity: 1,
          })),
        ),
      );
      fd.set("retailer", "kroger");

      const cartResult = await submitDraftFlowAction({}, fd);
      if (cartResult.error || !cartResult.resourceId) {
        setBuildError(cartResult.error ?? "Failed to build cart.");
        return;
      }

      router.push(`/carts/${cartResult.resourceId}`);
    });
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-8 px-5 pb-36 pt-6 sm:px-6 lg:pb-10 lg:pt-8">
        <section className="space-y-5">
          <div>
            <p className="text-body-md font-semibold text-outline">
              Hi, {firstName}
            </p>
            <h1 className="mt-1 max-w-sm text-[2.7rem] font-black leading-[0.96] text-on-surface sm:max-w-xl sm:text-headline-lg">
              What are we cooking{" "}
              <span className="text-primary-fixed-dim">today?</span>
            </h1>
          </div>

          <Link
            href="/recipes"
            className="flex min-h-12 items-center gap-3 rounded-full border border-outline-variant/35 bg-white px-4 text-body-sm text-outline shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">
              search
            </span>
            Search recipes, ingredients...
          </Link>

          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:px-0">
            {quickFilters.map((filter, index) => (
              <Link
                key={filter}
                href="/recipes"
                className={`shrink-0 rounded-full px-4 py-2 text-label-md font-bold ${
                  index === 0
                    ? "bg-primary-fixed-dim text-on-primary-fixed"
                    : index === 1
                      ? "bg-secondary-container text-on-secondary-container"
                      : "bg-[#c0dedf] text-[#073b3e]"
                }`}
              >
                {filter}
              </Link>
            ))}
          </div>
        </section>

        {featuredRecipe ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-headline-sm text-on-surface">For You</h2>
              <Link
                href="/recipes"
                className="text-label-md font-bold text-outline"
              >
                See all
              </Link>
            </div>

            <Link
              href={`/recipes/${featuredRecipe.id}`}
              className="group relative block min-h-[18rem] overflow-hidden rounded-[2rem] bg-primary-fixed-dim shadow-[0_16px_34px_rgba(244,121,13,0.22)] sm:min-h-[24rem]"
            >
              <div className="absolute inset-x-0 top-0 h-[58%] overflow-hidden bg-white/20 sm:inset-y-0 sm:left-auto sm:right-0 sm:h-auto sm:w-[72%] sm:rounded-l-[7rem]">
                <RecipeImage
                  src={featuredRecipe.cover_image_url}
                  alt={featuredRecipe.name}
                  seed={featuredRecipe.id}
                  className="h-full w-full"
                  imgClassName="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(244,121,13,0.98)_0%,rgba(244,121,13,0.8)_38%,rgba(244,121,13,0.12)_100%)] sm:bg-[linear-gradient(90deg,rgba(244,121,13,0.96)_0%,rgba(244,121,13,0.74)_42%,rgba(244,121,13,0.1)_100%)]" />
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  handleAddToCart(featuredRecipe);
                }}
                className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary shadow-sm"
                aria-label="Add featured recipe to cart"
              >
                <span className="material-symbols-outlined text-[20px]">
                  favorite
                </span>
              </button>
              <div className="absolute bottom-0 left-0 max-w-full p-5 text-white sm:max-w-[68%] sm:p-7">
                <p className="mb-3 inline-flex rounded-full bg-white/18 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em]">
                  {primaryBadge(featuredRecipe)}
                </p>
                <h2 className="text-[2rem] font-black leading-[0.96] sm:text-[2.8rem]">
                  {featuredRecipe.name}
                </h2>
                <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold">
                  <span className="rounded-full bg-white/18 px-2.5 py-1">
                    {minutesFor(featuredRecipe)} min
                  </span>
                  {featuredRecipe.nutrition_data?.calories ? (
                    <span className="rounded-full bg-white/18 px-2.5 py-1">
                      {featuredRecipe.nutrition_data.calories} kcal
                    </span>
                  ) : null}
                </div>
              </div>
            </Link>
          </section>
        ) : null}

        {preferenceRecipes.length > 0 ? (
          <section className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                  Based on your preferences
                </p>
                <h2 className="mt-1 text-headline-sm text-on-surface">
                  Picked for you
                </h2>
              </div>
              <Link
                href="/account/settings/preferences"
                className="shrink-0 text-label-md font-bold text-outline"
              >
                Edit
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {preferenceRecipes.map((recipe) => (
                <Link
                  key={recipe.id}
                  href={`/recipes/${recipe.id}`}
                  className="overflow-hidden rounded-[1.35rem] border border-outline-variant/35 bg-white shadow-sm"
                >
                  <RecipeImage
                    src={recipe.cover_image_url}
                    alt={recipe.name}
                    seed={recipe.id}
                    className="aspect-[4/3] w-full bg-surface-container"
                    imgClassName="h-full w-full object-cover"
                  />
                  <div className="p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                      {preferenceReason(recipe, preferences)}
                    </p>
                    <h3 className="mt-1 line-clamp-2 text-label-lg leading-tight text-on-surface">
                      {recipe.name}
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-outline">
                      <span>{minutesFor(recipe)} min</span>
                      <span>{recipe.servings} servings</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-headline-sm text-on-surface">Trending Now</h2>
            <Link
              href="/recipes"
              className="text-label-md font-bold text-outline"
            >
              See all
            </Link>
          </div>
          <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 lg:grid-cols-6">
            {trendingRecipes.map((recipe) => (
              <Link
                key={recipe.id}
                href={`/recipes/${recipe.id}`}
                className="w-[8.5rem] shrink-0 rounded-[1.35rem] border border-outline-variant/35 bg-white p-2 shadow-sm sm:w-auto"
              >
                <div className="aspect-square overflow-hidden rounded-[1.05rem] bg-surface-container">
                  <RecipeImage
                    src={recipe.cover_image_url}
                    alt={recipe.name}
                    seed={recipe.id}
                    className="h-full w-full"
                    imgClassName="h-full w-full object-cover"
                  />
                </div>
                <h3 className="mt-2 line-clamp-2 min-h-[2.1rem] text-center text-[12px] font-bold leading-tight text-on-surface">
                  {recipe.name}
                </h3>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <Link
            href="/meal-plan"
            className="rounded-[1.35rem] bg-white p-4 shadow-sm"
          >
            <span className="material-symbols-outlined text-primary">
              calendar_month
            </span>
            <p className="mt-3 text-label-lg text-on-surface">Plan the week</p>
            <p className="mt-1 text-body-sm text-outline">
              {carts.length} drafts ready
            </p>
          </Link>
          <Link
            href="/shopping"
            className="rounded-[1.35rem] bg-white p-4 shadow-sm"
          >
            <span className="material-symbols-outlined text-primary">
              shopping_cart
            </span>
            <p className="mt-3 text-label-lg text-on-surface">Shopping lists</p>
            <p className="mt-1 text-body-sm text-outline">
              {shoppingCarts.length} active carts
            </p>
          </Link>
          <Link
            href="/inventory"
            className="rounded-[1.35rem] bg-white p-4 shadow-sm"
          >
            <span className="material-symbols-outlined text-primary">
              inventory_2
            </span>
            <p className="mt-3 text-label-lg text-on-surface">
              Kitchen inventory
            </p>
            <p className="mt-1 text-body-sm text-outline">
              Check what you have
            </p>
          </Link>
        </section>

        {forYouRecipes.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-headline-sm text-on-surface">More to Cook</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {forYouRecipes.map((recipe) => (
                <Link
                  key={recipe.id}
                  href={`/recipes/${recipe.id}`}
                  className="flex gap-3 rounded-[1.35rem] bg-white p-3 shadow-sm"
                >
                  <RecipeImage
                    src={recipe.cover_image_url}
                    alt={recipe.name}
                    seed={recipe.id}
                    className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-surface-container"
                    imgClassName="h-full w-full object-cover"
                  />
                  <span className="min-w-0 py-1">
                    <span className="line-clamp-2 text-label-lg text-on-surface">
                      {recipe.name}
                    </span>
                    <span className="mt-2 flex items-center gap-2 text-body-sm text-outline">
                      <span>{minutesFor(recipe)} min</span>
                      <span>{recipe.servings} servings</span>
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      {selections.size > 0 && (
        <div className="fixed bottom-20 left-0 right-0 z-40 flex justify-center px-4 pb-4 lg:bottom-0 lg:pb-6 pointer-events-none">
          <div className="bg-on-surface rounded-2xl shadow-2xl p-4 flex items-center gap-4 w-full max-w-lg pointer-events-auto">
            <div className="flex-1 min-w-0">
              <p className="text-label-lg text-white font-semibold">
                {selections.size} recipe{selections.size !== 1 ? "s" : ""}{" "}
                selected
              </p>
              <div className="flex gap-1.5 mt-1 flex-wrap">
                {Array.from(selections.values()).map((recipe) => (
                  <button
                    key={recipe.id}
                    onClick={() => removeSelection(recipe.id)}
                    className="flex items-center gap-1 bg-white/10 text-white text-[11px] font-medium px-2 py-0.5 rounded-full hover:bg-white/20 transition-colors"
                  >
                    {recipe.name.length > 20
                      ? recipe.name.slice(0, 20) + "..."
                      : recipe.name}
                    <span className="material-symbols-outlined text-[12px]">
                      close
                    </span>
                  </button>
                ))}
              </div>
              {buildError && (
                <p className="text-primary-fixed-dim text-body-sm mt-1">
                  {buildError}
                </p>
              )}
            </div>
            <button
              onClick={handleBuildCart}
              disabled={isBuilding}
              className="shrink-0 bg-primary-fixed-dim text-on-primary-fixed font-semibold text-label-md px-4 py-2.5 rounded-xl hover:bg-primary-fixed active:scale-[0.97] transition-all disabled:opacity-60 flex items-center gap-2"
            >
              {isBuilding ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">
                    refresh
                  </span>
                  Building...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">
                    shopping_cart
                  </span>
                  Generate Cart
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
