"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { BaseRecipe, Capture, Cuisine, Tag } from "@cart/shared";
import { AppShell } from "@/components/layout/app-shell";
import { RecipeCreateModal } from "@/components/recipes/recipe-create-modal";
import { RecipeCaptureModal } from "@/components/recipes/recipe-capture-modal";
import { IMPORTED_RECIPE_DRAFT_STORAGE_KEY } from "@/lib/imported-recipe-draft";
import {
  submitDraftFlowAction,
  createShoppingCartAction,
  forkRecipeAction,
} from "@/app/home-actions";
import { RecipeImage } from "@/components/ui/recipe-image";

/* ── helpers ────────────────────────────────────────────────────── */

const FAV_STYLES = [
  { bg: "bg-green-100", text: "text-green-700", icon: "eco" },
  { bg: "bg-orange-100", text: "text-orange-600", icon: "bolt" },
  { bg: "bg-teal-100", text: "text-teal-700", icon: "spa" },
  { bg: "bg-purple-100", text: "text-purple-700", icon: "fitness_center" },
  { bg: "bg-blue-100", text: "text-blue-700", icon: "water_drop" },
  { bg: "bg-rose-100", text: "text-rose-600", icon: "favorite" },
];

type Tab = "mine" | "public" | "saved";

/* ── component ──────────────────────────────────────────────────── */

export function RecipesClient({
  cuisines,
  tags,
  recipes: initialRecipes,
  openImportOnLoad = false,
}: {
  cuisines: Cuisine[];
  tags: Tag[];
  recipes: BaseRecipe[];
  openImportOnLoad?: boolean;
}) {
  const router = useRouter();

  const [recipes, setRecipes] = useState(initialRecipes);
  const [tab, setTab] = useState<Tab>("public");
  const [search, setSearch] = useState("");
  const [activeCuisine, setActiveCuisine] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<BaseRecipe | null>(null);
  const [showImport, setShowImport] = useState(openImportOnLoad);
  const [selections, setSelections] = useState<Map<string, BaseRecipe>>(
    new Map(),
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [buildError, setBuildError] = useState<string | undefined>();
  const [isBuilding, startBuilding] = useTransition();
  const [, startFork] = useTransition();

  useEffect(() => {
    if (openImportOnLoad) {
      router.replace("/recipes", { scroll: false });
    }
  }, [router, openImportOnLoad]);

  const dietaryTags = tags
    .filter((t) => t.kind === "dietary_badge")
    .slice(0, 6);

  // IDs of system recipes that the user has already forked/saved
  const savedRecipesBySourceId = new Map(
    recipes
      .filter((r) => r.forked_from_recipe_id)
      .map((r) => [r.forked_from_recipe_id!, r]),
  );
  const savedSourceIds = new Set(savedRecipesBySourceId.keys());
  // User-created recipes (not a system fork, not a system recipe)
  const isUserOwned = (r: BaseRecipe) =>
    !!r.owner_user_id && !r.is_system_recipe;
  const isUserSaved = (r: BaseRecipe) => !!r.forked_from_recipe_id;

  const tabFiltered =
    tab === "saved"
      ? recipes.filter(isUserSaved)
      : tab === "public"
        ? recipes.filter((r) => !isUserOwned(r) && !isUserSaved(r))
        : recipes.filter((r) => isUserOwned(r) && !isUserSaved(r));
  const tabCounts: Record<Tab, number> = {
    mine: recipes.filter((r) => isUserOwned(r) && !isUserSaved(r)).length,
    public: recipes.filter((r) => !isUserOwned(r) && !isUserSaved(r)).length,
    saved: recipes.filter(isUserSaved).length,
  };
  const tabOptions: { id: Tab; label: string; icon: string }[] = [
    { id: "public", label: "Public", icon: "public" },
    { id: "mine", label: "Mine", icon: "restaurant_menu" },
    { id: "saved", label: "Saved", icon: "bookmark" },
  ];

  const filtered = tabFiltered.filter((r) => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()))
      return false;
    if (activeCuisine && r.cuisine.label !== activeCuisine) return false;
    if (activeTag && !r.tags.some((t) => t.name === activeTag)) return false;
    return true;
  });

  /* ── actions ────────────────────────────────────── */

  function handleSaveRecipe(recipe: BaseRecipe) {
    if (savingId) return;
    setSavingId(recipe.id);
    startFork(async () => {
      const res = await forkRecipeAction(recipe.id);
      setSavingId(null);
      if (res.recipe) {
        setRecipes((prev) => [...prev, res.recipe!]);
      }
    });
  }

  function handleAddToCart(recipe: BaseRecipe) {
    setSelections((prev) => {
      const next = new Map(prev);
      next.set(recipe.id, recipe);
      return next;
    });
  }

  function removeSelection(id: string) {
    setSelections((prev) => {
      const n = new Map(prev);
      n.delete(id);
      return n;
    });
  }

  function handleBuildCart() {
    if (selections.size === 0) return;
    setBuildError(undefined);
    startBuilding(async () => {
      const fd = new FormData();
      fd.set("intent", "generate");
      fd.set(
        "selections_json",
        JSON.stringify(
          Array.from(selections.values()).map((r) => ({
            recipe_id: r.id,
            quantity: 1,
          })),
        ),
      );
      fd.set("retailer", "kroger");
      const cartResult = await submitDraftFlowAction({}, fd);
      if (cartResult.error || !cartResult.resourceId) {
        setBuildError(cartResult.error ?? "Failed.");
        return;
      }
      const scResult = await createShoppingCartAction(
        cartResult.resourceId,
        "kroger",
      );
      if (scResult.error) {
        setBuildError(scResult.error);
        return;
      }
      router.push("/shopping");
    });
  }

  function handleCaptureReview(capture: Capture) {
    if (!capture.recipe_preview) return;
    window.sessionStorage.setItem(
      IMPORTED_RECIPE_DRAFT_STORAGE_KEY,
      JSON.stringify(capture.recipe_preview),
    );
    setShowImport(false);
    router.push("/recipes/new?draft=import");
  }

  /* ── render ─────────────────────────────────────── */

  return (
    <AppShell topBarTitle="Recipes">
      <div className="px-6 pt-6 pb-40 max-w-6xl mx-auto space-y-7">
        {/* ── Page header ─────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-headline-lg text-on-surface font-bold">
            Recipes
          </h1>
          <div className="relative w-full sm:flex-1 sm:max-w-xs">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search recipes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-full bg-surface-container-low border border-outline-variant/40 text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Quick actions + filters */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-4 rounded-2xl border border-primary-fixed-dim/20 bg-primary-surface p-5 text-left transition-all hover:brightness-95"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-fixed-dim/20">
              <span className="material-symbols-outlined text-[28px] text-primary">
                auto_fix_high
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-label-lg font-bold text-on-surface">
                Import recipe
              </p>
              <p className="mt-0.5 text-body-sm leading-snug text-outline">
                Paste a link or recipe text and Chef will draft it for review.
              </p>
            </div>
            <span className="material-symbols-outlined text-[20px] text-outline">
              arrow_forward
            </span>
          </button>

          {dietaryTags.length > 0 && (
            <div className="bg-white rounded-2xl p-5 border border-outline-variant/30 shadow-sm">
              <p className="text-label-sm text-outline uppercase tracking-widest mb-3">
                Your Favs
              </p>
              <div className="grid grid-cols-2 gap-2">
                {dietaryTags.slice(0, 4).map((tag, i) => {
                  const style = FAV_STYLES[i % FAV_STYLES.length];
                  const isActive = activeTag === tag.name;
                  return (
                    <button
                      key={tag.id}
                      onClick={() => setActiveTag(isActive ? null : tag.name)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-label-sm font-semibold transition-all ${
                        isActive
                          ? "bg-primary text-on-primary"
                          : `${style.bg} ${style.text} hover:brightness-95`
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {style.icon}
                      </span>
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Tabs ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="grid w-full grid-cols-3 gap-1.5 rounded-[1.25rem] border border-outline-variant/25 bg-white/90 p-1.5 shadow-sm sm:w-auto">
            {tabOptions.map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex min-w-0 items-center justify-center gap-1.5 rounded-2xl px-2 py-2.5 text-[12px] font-black leading-tight transition-all sm:min-w-[128px] sm:px-4 sm:text-label-sm ${
                  tab === id
                    ? "bg-primary text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-[17px]">
                  {icon}
                </span>
                <span>{label}</span>
                {tabCounts[id] > 0 && (
                  <span
                    className={`flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-black ${
                      tab === id
                        ? "bg-white/22 text-on-primary"
                        : "bg-primary text-on-primary"
                    }`}
                  >
                    {tabCounts[id]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Cuisine filter + active chips + sort */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={activeCuisine ?? ""}
              onChange={(e) => setActiveCuisine(e.target.value || null)}
              className="h-8 pl-3 pr-7 rounded-full border border-outline-variant text-label-sm text-on-surface-variant bg-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24'%3E%3Cpath fill='%2385736c' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E\")",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 8px center",
              }}
            >
              <option value="">Cuisine</option>
              {cuisines.map((c) => (
                <option key={c.id} value={c.label}>
                  {c.label}
                </option>
              ))}
            </select>

            {activeCuisine && (
              <button
                onClick={() => setActiveCuisine(null)}
                className="flex items-center gap-1 px-3 h-8 rounded-full bg-primary text-on-primary text-label-sm"
              >
                {activeCuisine}{" "}
                <span className="material-symbols-outlined text-[14px]">
                  close
                </span>
              </button>
            )}
            {activeTag && (
              <button
                onClick={() => setActiveTag(null)}
                className="flex items-center gap-1 px-3 h-8 rounded-full bg-primary text-on-primary text-label-sm"
              >
                {activeTag}{" "}
                <span className="material-symbols-outlined text-[14px]">
                  close
                </span>
              </button>
            )}

            <div className="flex items-center gap-1 text-label-sm text-outline">
              <span>Sort by</span>
              <span className="font-semibold text-primary">Most Recent</span>
              <span className="material-symbols-outlined text-[16px]">
                keyboard_arrow_down
              </span>
            </div>
          </div>
        </div>

        {/* ── Recipe grid ─────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <span className="material-symbols-outlined text-[48px] text-outline-variant">
              {tab === "saved"
                ? "bookmark"
                : tab === "public"
                  ? "restaurant"
                  : "draw"}
            </span>
            <div>
              <p className="text-label-lg font-semibold text-on-surface">
                {tab === "saved"
                  ? "No saved recipes yet"
                  : tab === "public"
                    ? "No public recipes found"
                    : "No created recipes yet"}
              </p>
              <p className="text-body-sm text-outline mt-1">
                {tab === "saved"
                  ? "Tap the bookmark on any recipe to save it here."
                  : tab === "public"
                    ? "Try a different filter or search term."
                    : "Tap the floating plus button to build your first recipe."}
              </p>
            </div>
            {tab === "mine" && (
              <button
                onClick={() => router.push("/recipes/new")}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-full font-semibold text-label-md"
              >
                <span className="material-symbols-outlined text-[16px]">
                  add
                </span>
                Create Recipe
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
            {filtered.map((recipe) => {
              const dietBadge = recipe.tags.find(
                (t) => t.kind === "dietary_badge",
              );
              const isSelected = selections.has(recipe.id);
              const savedRecipe = savedRecipesBySourceId.get(recipe.id);
              const isSaved =
                savedSourceIds.has(recipe.id) || isUserSaved(recipe);
              const isSaving = savingId === recipe.id;
              const canSave = recipe.is_system_recipe && !isSaved;
              const recipeToOpen = savedRecipe ?? recipe;

              return (
                <div
                  key={recipe.id}
                  className="group cursor-pointer space-y-2"
                  onClick={() => router.push(`/recipes/${recipeToOpen.id}`)}
                >
                  {/* Image */}
                  <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-surface-container">
                    <RecipeImage
                      src={recipe.cover_image_url}
                      alt={recipe.name}
                      seed={recipe.id}
                      className="w-full h-full"
                      imgClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Bookmark (save) button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (canSave) handleSaveRecipe(recipe);
                      }}
                      disabled={isSaving || (!canSave && !isSaved)}
                      className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm ${
                        isSaved
                          ? "bg-primary text-on-primary"
                          : canSave
                            ? "bg-white/90 text-outline-variant hover:text-primary hover:bg-white"
                            : "bg-white/90 text-outline-variant"
                      }`}
                      aria-label={isSaved ? "Saved" : "Save recipe"}
                    >
                      {isSaving ? (
                        <span className="material-symbols-outlined text-[16px] animate-spin">
                          refresh
                        </span>
                      ) : (
                        <span className="material-symbols-outlined text-[16px]">
                          {isSaved ? "bookmark" : "bookmark"}
                        </span>
                      )}
                    </button>

                    {/* Add-to-cart button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isSelected) removeSelection(recipe.id);
                        else handleAddToCart(recipe);
                      }}
                      className={`absolute bottom-2.5 right-2.5 flex h-9 w-9 items-center justify-center rounded-full shadow-sm transition-all ${
                        isSelected
                          ? "bg-primary text-on-primary"
                          : "bg-white/90 text-outline hover:text-primary"
                      }`}
                      aria-label="Add to cart"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {isSelected ? "check" : "add_shopping_cart"}
                      </span>
                    </button>

                    {/* Dietary badge */}
                    {dietBadge && (
                      <span className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[10px] font-bold uppercase tracking-wide shadow-sm">
                        {dietBadge.name}
                      </span>
                    )}

                    {/* Mine / Saved label */}
                    {isUserOwned(recipe) && !isUserSaved(recipe) && (
                      <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-primary text-on-primary text-[10px] font-bold uppercase tracking-wide">
                        Mine
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div>
                    <h3 className="text-label-lg font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                      {recipe.name}
                    </h3>
                    <p className="text-body-sm text-outline mt-1 flex items-center gap-2">
                      <span className="flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[13px]">
                          group
                        </span>
                        {recipe.servings} servings
                      </span>
                      {recipe.nutrition_data?.calories && (
                        <span className="flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[13px]">
                            local_fire_department
                          </span>
                          {recipe.nutrition_data.calories} kcal
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modals & overlays ────────────────────────────────── */}
      {showImport && (
        <RecipeCaptureModal
          onClose={() => setShowImport(false)}
          onReviewDraft={handleCaptureReview}
        />
      )}

      {editingRecipe && (
        <RecipeCreateModal
          cuisines={cuisines}
          tags={tags}
          initialRecipe={editingRecipe}
          onClose={() => setEditingRecipe(null)}
          onCreated={(updatedRecipe) => {
            setRecipes((prev) => {
              const existingRecipe = prev.some(
                (recipe) => recipe.id === updatedRecipe.id,
              );

              return existingRecipe
                ? prev.map((recipe) =>
                    recipe.id === updatedRecipe.id ? updatedRecipe : recipe,
                  )
                : [updatedRecipe, ...prev];
            });
            setEditingRecipe(null);
          }}
        />
      )}

      {/* ── Cart Builder Bar ─────────────────────────────────── */}
      {selections.size > 0 && (
        <div className="fixed bottom-20 lg:bottom-0 left-0 right-0 z-40 flex justify-center px-4 pb-4 lg:pb-6 pointer-events-none">
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
                      ? recipe.name.slice(0, 20) + "…"
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
                  Building…
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
