"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BaseRecipe, Cuisine, Tag } from "@cart/shared";
import { AppShell } from "@/components/layout/app-shell";
import { RecipeDetailOverlay } from "@/components/recipes/recipe-detail-overlay";
import { RecipeCreateModal } from "@/components/recipes/recipe-create-modal";
import { submitDraftFlowAction, createShoppingCartAction, forkRecipeAction } from "@/app/home-actions";
import { RecipeImage } from "@/components/ui/recipe-image";

/* ── helpers ────────────────────────────────────────────────────── */

const FAV_STYLES = [
  { bg: "bg-green-100",  text: "text-green-700",  icon: "eco" },
  { bg: "bg-orange-100", text: "text-orange-600",  icon: "bolt" },
  { bg: "bg-teal-100",   text: "text-teal-700",    icon: "spa" },
  { bg: "bg-purple-100", text: "text-purple-700",  icon: "fitness_center" },
  { bg: "bg-blue-100",   text: "text-blue-700",    icon: "water_drop" },
  { bg: "bg-rose-100",   text: "text-rose-600",    icon: "favorite" },
];

type Tab = "all" | "saved" | "mine";

/* ── component ──────────────────────────────────────────────────── */

export function RecipesClient({
  cuisines,
  tags,
  recipes: initialRecipes,
}: {
  cuisines: Cuisine[];
  tags: Tag[];
  recipes: BaseRecipe[];
}) {
  const router = useRouter();

  const [recipes, setRecipes]             = useState(initialRecipes);
  const [tab, setTab]                     = useState<Tab>("all");
  const [search, setSearch]               = useState("");
  const [activeCuisine, setActiveCuisine] = useState<string | null>(null);
  const [activeTag, setActiveTag]         = useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<BaseRecipe | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<BaseRecipe | null>(null);
  const [showCreate, setShowCreate]       = useState(false);
  const [selections, setSelections]       = useState<Map<string, BaseRecipe>>(new Map());
  const [savingId, setSavingId]           = useState<string | null>(null);
  const [buildError, setBuildError]       = useState<string | undefined>();
  const [isBuilding, startBuilding]       = useTransition();
  const [, startFork]                     = useTransition();

  const dietaryTags = tags.filter((t) => t.kind === "dietary_badge").slice(0, 6);

  // IDs of system recipes that the user has already forked/saved
  const savedSourceIds = new Set(
    recipes.filter((r) => r.forked_from_recipe_id).map((r) => r.forked_from_recipe_id!),
  );
  // User-created recipes (not a system fork, not a system recipe)
  const isUserOwned   = (r: BaseRecipe) => !!r.owner_user_id && !r.is_system_recipe;
  const isUserSaved   = (r: BaseRecipe) => !!r.forked_from_recipe_id;

  const tabFiltered =
    tab === "saved" ? recipes.filter(isUserSaved) :
    tab === "mine"  ? recipes.filter((r) => isUserOwned(r) && !isUserSaved(r)) :
    // "All" — hide forks so saved recipes don't duplicate the originals
    recipes.filter((r) => !isUserSaved(r));

  const filtered = tabFiltered.filter((r) => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
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
    setSelectedRecipe(null);
    setSelections((prev) => {
      const next = new Map(prev);
      next.set(recipe.id, recipe);
      return next;
    });
  }

  function removeSelection(id: string) {
    setSelections((prev) => { const n = new Map(prev); n.delete(id); return n; });
  }

  function handleBuildCart() {
    if (selections.size === 0) return;
    setBuildError(undefined);
    startBuilding(async () => {
      const fd = new FormData();
      fd.set("intent", "generate");
      fd.set("selections_json", JSON.stringify(
        Array.from(selections.values()).map((r) => ({ recipe_id: r.id, quantity: 1 })),
      ));
      fd.set("retailer", "kroger");
      const cartResult = await submitDraftFlowAction({}, fd);
      if (cartResult.error || !cartResult.resourceId) { setBuildError(cartResult.error ?? "Failed."); return; }
      const scResult = await createShoppingCartAction(cartResult.resourceId, "kroger");
      if (scResult.error) { setBuildError(scResult.error); return; }
      router.push("/shopping");
    });
  }

  /* ── render ─────────────────────────────────────── */

  return (
    <AppShell topBarTitle="Recipes">
      <div className="px-6 pt-6 pb-40 max-w-6xl mx-auto space-y-7">

        {/* ── Page header ─────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-headline-lg text-on-surface font-bold">Saved Recipes</h1>
          <div className="relative flex-1 max-w-xs">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
            <input
              type="text"
              placeholder="Search your kitchen…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-full bg-surface-container-low border border-outline-variant/40 text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* ── Action cards + YOUR FAVS ─────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 grid grid-cols-2 gap-4">
            {/* Create own */}
            <button
              onClick={() => setShowCreate(true)}
              className="bg-secondary-container rounded-2xl p-5 flex flex-col gap-3 cursor-pointer hover:brightness-95 transition-all text-left"
            >
              <div className="w-12 h-12 bg-white/60 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-[28px] text-on-secondary-container">draw</span>
              </div>
              <div>
                <p className="text-label-lg font-bold text-on-secondary-container">Create own</p>
                <p className="text-body-sm text-on-secondary-container/70 mt-0.5 leading-snug">Handcraft your unique culinary masterpiece.</p>
              </div>
              <span className="material-symbols-outlined text-on-secondary-container/60 text-[20px]">arrow_forward</span>
            </button>

            {/* Explore templates */}
            <button
              onClick={() => setTab("all")}
              className="bg-primary-surface rounded-2xl p-5 flex flex-col gap-3 cursor-pointer hover:brightness-95 transition-all text-left border border-primary-fixed-dim/20"
            >
              <div className="w-12 h-12 bg-primary-fixed-dim/20 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-[28px] text-primary">auto_fix_high</span>
              </div>
              <div>
                <p className="text-label-lg font-bold text-on-surface">Explore templates</p>
                <p className="text-body-sm text-outline mt-0.5 leading-snug">Start from professional nutritional frameworks.</p>
              </div>
              <span className="material-symbols-outlined text-outline text-[20px]">arrow_forward</span>
            </button>
          </div>

          {/* YOUR FAVS */}
          {dietaryTags.length > 0 && (
            <div className="bg-white rounded-2xl p-5 border border-outline-variant/30 shadow-sm">
              <p className="text-label-sm text-outline uppercase tracking-widest mb-3">Your Favs</p>
              <div className="grid grid-cols-2 gap-2">
                {dietaryTags.slice(0, 4).map((tag, i) => {
                  const style   = FAV_STYLES[i % FAV_STYLES.length];
                  const isActive = activeTag === tag.name;
                  return (
                    <button
                      key={tag.id}
                      onClick={() => setActiveTag(isActive ? null : tag.name)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-label-sm font-semibold transition-all ${
                        isActive ? "bg-primary text-on-primary" : `${style.bg} ${style.text} hover:brightness-95`
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">{style.icon}</span>
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
          <div className="flex gap-1 bg-surface-container-low rounded-full p-1">
            {([ ["all", "All Recipes"], ["saved", "Saved"], ["mine", "My Recipes"] ] as [Tab, string][]).map(([t, label]) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-full text-label-sm font-semibold transition-all ${
                  tab === t ? "bg-white text-on-surface shadow-sm" : "text-outline hover:text-on-surface"
                }`}
              >
                {label}
                {t === "saved" && recipes.filter(isUserSaved).length > 0 && (
                  <span className="ml-1.5 bg-primary text-on-primary text-[10px] px-1.5 py-0.5 rounded-full">
                    {recipes.filter(isUserSaved).length}
                  </span>
                )}
                {t === "mine" && recipes.filter((r) => isUserOwned(r) && !isUserSaved(r)).length > 0 && (
                  <span className="ml-1.5 bg-primary text-on-primary text-[10px] px-1.5 py-0.5 rounded-full">
                    {recipes.filter((r) => isUserOwned(r) && !isUserSaved(r)).length}
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
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24'%3E%3Cpath fill='%2385736c' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center" }}
            >
              <option value="">Cuisine</option>
              {cuisines.map((c) => <option key={c.id} value={c.label}>{c.label}</option>)}
            </select>

            {activeCuisine && (
              <button onClick={() => setActiveCuisine(null)} className="flex items-center gap-1 px-3 h-8 rounded-full bg-primary text-on-primary text-label-sm">
                {activeCuisine} <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            )}
            {activeTag && (
              <button onClick={() => setActiveTag(null)} className="flex items-center gap-1 px-3 h-8 rounded-full bg-primary text-on-primary text-label-sm">
                {activeTag} <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            )}

            <div className="flex items-center gap-1 text-label-sm text-outline">
              <span>Sort by</span>
              <span className="font-semibold text-primary">Most Recent</span>
              <span className="material-symbols-outlined text-[16px]">keyboard_arrow_down</span>
            </div>
          </div>
        </div>

        {/* ── Recipe grid ─────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <span className="material-symbols-outlined text-[48px] text-outline-variant">
              {tab === "saved" ? "bookmark" : tab === "mine" ? "draw" : "restaurant"}
            </span>
            <div>
              <p className="text-label-lg font-semibold text-on-surface">
                {tab === "saved" ? "No saved recipes yet" : tab === "mine" ? "No created recipes yet" : "No recipes match"}
              </p>
              <p className="text-body-sm text-outline mt-1">
                {tab === "saved" ? "Tap the bookmark on any recipe to save it here." :
                 tab === "mine"  ? "Use \u201cCreate own\u201d to build your first recipe." :
                 "Try a different filter or search term."}
              </p>
            </div>
            {tab === "mine" && (
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-full font-semibold text-label-md"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                Create Recipe
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {filtered.map((recipe) => {
              const dietBadge  = recipe.tags.find((t) => t.kind === "dietary_badge");
              const isSelected = selections.has(recipe.id);
              const isSaved    = savedSourceIds.has(recipe.id) || isUserSaved(recipe);
              const isSaving   = savingId === recipe.id;
              const canSave    = recipe.is_system_recipe && !isSaved;

              return (
                <div key={recipe.id} className="group cursor-pointer space-y-2" onClick={() => setSelectedRecipe(recipe)}>
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
                        <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                      ) : (
                        <span className="material-symbols-outlined text-[16px]">
                          {isSaved ? "bookmark" : "bookmark"}
                        </span>
                      )}
                    </button>

                    {/* Add-to-cart button (shows on hover) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isSelected) removeSelection(recipe.id); else handleAddToCart(recipe);
                      }}
                      className={`absolute bottom-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm opacity-0 group-hover:opacity-100 ${
                        isSelected ? "bg-primary text-on-primary" : "bg-white/90 text-outline hover:text-primary"
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
                        <span className="material-symbols-outlined text-[13px]">group</span>
                        {recipe.servings} servings
                      </span>
                      {recipe.nutrition_data?.calories && (
                        <span className="flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[13px]">local_fire_department</span>
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
      {selectedRecipe && (
        <RecipeDetailOverlay
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
          onAddToCart={handleAddToCart}
          onEdit={(recipe) => {
            setSelectedRecipe(null);
            setEditingRecipe(recipe);
          }}
        />
      )}

      {showCreate && (
        <RecipeCreateModal
          cuisines={cuisines}
          tags={tags}
          onClose={() => setShowCreate(false)}
          onCreated={(recipe) => {
            setRecipes((prev) => [recipe, ...prev]);
            setShowCreate(false);
            setTab("mine");
          }}
        />
      )}

      {editingRecipe && (
        <RecipeCreateModal
          cuisines={cuisines}
          tags={tags}
          initialRecipe={editingRecipe}
          onClose={() => setEditingRecipe(null)}
          onCreated={(updatedRecipe) => {
            setRecipes((prev) =>
              prev.map((recipe) =>
                recipe.id === updatedRecipe.id ? updatedRecipe : recipe,
              ),
            );
            setSelectedRecipe(updatedRecipe);
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
                {selections.size} recipe{selections.size !== 1 ? "s" : ""} selected
              </p>
              <div className="flex gap-1.5 mt-1 flex-wrap">
                {Array.from(selections.values()).map((recipe) => (
                  <button
                    key={recipe.id}
                    onClick={() => removeSelection(recipe.id)}
                    className="flex items-center gap-1 bg-white/10 text-white text-[11px] font-medium px-2 py-0.5 rounded-full hover:bg-white/20 transition-colors"
                  >
                    {recipe.name.length > 20 ? recipe.name.slice(0, 20) + "…" : recipe.name}
                    <span className="material-symbols-outlined text-[12px]">close</span>
                  </button>
                ))}
              </div>
              {buildError && <p className="text-primary-fixed-dim text-body-sm mt-1">{buildError}</p>}
            </div>
            <button
              onClick={handleBuildCart}
              disabled={isBuilding}
              className="shrink-0 bg-primary-fixed-dim text-on-primary-fixed font-semibold text-label-md px-4 py-2.5 rounded-xl hover:bg-primary-fixed active:scale-[0.97] transition-all disabled:opacity-60 flex items-center gap-2"
            >
              {isBuilding ? (
                <><span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>Building…</>
              ) : (
                <><span className="material-symbols-outlined text-[18px]">shopping_cart</span>Generate Cart</>
              )}
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
