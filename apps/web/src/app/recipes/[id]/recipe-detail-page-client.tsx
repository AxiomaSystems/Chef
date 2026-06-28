"use client";

import { useMemo, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type {
  BaseRecipe,
  Cuisine,
  DishIngredient,
  KitchenInventoryItem,
  Tag,
} from "@cart/shared";
import { normalizeIngredientKey } from "@cart/shared";
import {
  getInventoryAlternativesAction,
  type InventoryAlternativeSuggestion,
} from "@/app/ai-actions";
import { deleteRecipeAction, submitDraftFlowAction } from "@/app/home-actions";
import { HandsFreeMode } from "@/components/hands-free-mode";
import type { HandsFreeSessionContext } from "@/components/hands-free-mode-types";
import { HandsFreeSetupModal } from "@/components/hands-free-setup-modal";
import { RecipeImage } from "@/components/ui/recipe-image";
import type { CookingContext } from "@/lib/cooking-context";
import { routeMemoryKey, usePageMemory } from "@/lib/page-memory";
import {
  getIngredientReadiness,
  getIngredientReadinessSummary,
  type IngredientReadiness,
} from "@/lib/inventory-readiness";

type RecipeTab = "ingredients" | "steps";

type RecipeDetailMemory = {
  activeTab: RecipeTab;
  handsFreeOpen: boolean;
  handsFreeSessionContext?: HandsFreeSessionContext;
};

const RecipeCreateModal = dynamic(
  () =>
    import("@/components/recipes/recipe-create-modal").then(
      (mod) => mod.RecipeCreateModal,
    ),
  {
    loading: () => null,
    ssr: false,
  },
);

function prepMinutes(recipe: BaseRecipe) {
  if (typeof recipe.planning?.total_time_minutes === "number") {
    return recipe.planning.total_time_minutes;
  }
  if (
    typeof recipe.planning?.prep_time_minutes === "number" &&
    typeof recipe.planning?.cook_time_minutes === "number"
  ) {
    return (
      recipe.planning.prep_time_minutes + recipe.planning.cook_time_minutes
    );
  }
  return Math.max(20, recipe.steps.length * 7);
}

function splitStepCopy(copy: string) {
  const parts = copy.split(/(?<=[.!?])\s+/);
  return {
    title: parts[0] ?? copy,
    body: parts.slice(1).join(" "),
  };
}

export function RecipeDetailPageClient({
  recipe,
  inventory,
  cuisines,
  tags,
  cookingContext,
}: {
  recipe: BaseRecipe;
  inventory: KitchenInventoryItem[];
  cuisines: Cuisine[];
  tags: Tag[];
  cookingContext?: CookingContext;
}) {
  const router = useRouter();
  const [currentRecipe, setCurrentRecipe] = useState(recipe);
  const [pageMemory, setPageMemory] = usePageMemory<RecipeDetailMemory>(
    routeMemoryKey(`/recipes/${recipe.id}`),
    {
      activeTab: "ingredients",
      handsFreeOpen: false,
      handsFreeSessionContext: undefined,
    },
    {
      routeHref: "/recipes",
      onReset: () => {
        setHandsFreeSetupOpen(false);
      },
    },
  );
  const [handsFreeSetupOpen, setHandsFreeSetupOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<BaseRecipe | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [aiAlternatives, setAiAlternatives] = useState<
    InventoryAlternativeSuggestion[]
  >([]);
  const [aiAlternativesPending, setAiAlternativesPending] = useState(false);
  const [inventoryChecked, setInventoryChecked] = useState(false);
  const [inventoryCheckError, setInventoryCheckError] = useState<string | null>(
    null,
  );
  const [cartError, setCartError] = useState<string | null>(null);
  const [isAddingToCart, startAddToCart] = useTransition();
  const [isDeleting, startDelete] = useTransition();
  const activeTab = pageMemory.activeTab;
  const handsFreeOpen = pageMemory.handsFreeOpen;
  const handsFreeSessionContext = pageMemory.handsFreeSessionContext;
  const nutrition = currentRecipe.nutrition_data ?? {};
  const badges = currentRecipe.tags
    .filter((tag) => tag.kind === "dietary_badge")
    .slice(0, 2);
  const canManageRecipe =
    !!currentRecipe.owner_user_id && !currentRecipe.is_system_recipe;
  const alternativeByIngredient = useMemo(
    () =>
      new Map(
        aiAlternatives.map((suggestion) => [
          normalizeIngredientKey(suggestion.ingredient_name),
          suggestion,
        ]),
      ),
    [aiAlternatives],
  );
  const inventorySummary = useMemo(
    () =>
      getIngredientReadinessSummary(
        currentRecipe.ingredients,
        inventory,
        (ingredient) =>
          alternativeByIngredient.get(
            normalizeIngredientKey(ingredient.canonical_ingredient),
          ),
      ),
    [alternativeByIngredient, currentRecipe.ingredients, inventory],
  );

  async function handleCheckInventory() {
    setInventoryCheckError(null);
    setInventoryChecked(true);
    const candidates = currentRecipe.ingredients.filter(
      (ingredient) =>
        getIngredientReadiness(ingredient, inventory).status !== "available",
    );

    if (candidates.length === 0 || inventory.length === 0) {
      setAiAlternatives([]);
      setAiAlternativesPending(false);
      return;
    }

    setAiAlternativesPending(true);
    const result = await getInventoryAlternativesAction({
      recipeName: currentRecipe.name,
      ingredients: candidates.map((ingredient) => ({
        canonical_ingredient: ingredient.canonical_ingredient,
        display_ingredient: ingredient.display_ingredient ?? null,
        amount: ingredient.amount,
        unit: ingredient.unit,
      })),
      inventory: inventory.map((item) => ({
        id: item.id,
        display_name: item.display_name,
        ingredient_id: item.ingredient_id ?? null,
        canonical_name: item.ingredient?.canonical_name ?? null,
        category: item.ingredient?.category ?? null,
        estimated_amount: item.estimated_amount ?? null,
        unit: item.unit ?? null,
        aliases: item.ingredient?.aliases ?? [],
      })),
    });

    if (result.error) {
      setInventoryCheckError(result.error);
    }
    if (result.suggestions) {
      setAiAlternatives(result.suggestions);
    }
    setAiAlternativesPending(false);
  }

  const nutritionCards = useMemo(
    () => [
      {
        label: "Calories",
        value: nutrition.calories ? String(nutrition.calories) : "-",
      },
      {
        label: "Protein",
        value: nutrition.protein_g ? `${nutrition.protein_g}g` : "-",
      },
      {
        label: "Carbs",
        value: nutrition.carbs_g ? `${nutrition.carbs_g}g` : "-",
      },
      { label: "Fats", value: nutrition.fat_g ? `${nutrition.fat_g}g` : "-" },
    ],
    [
      nutrition.calories,
      nutrition.carbs_g,
      nutrition.fat_g,
      nutrition.protein_g,
    ],
  );

  function handleAddToCart() {
    setCartError(null);
    startAddToCart(async () => {
      const formData = new FormData();
      formData.set("intent", "generate");
      formData.set(
        "selections_json",
        JSON.stringify([
          {
            recipe_id: currentRecipe.id,
            recipe_name: currentRecipe.name,
            quantity: 1,
          },
        ]),
      );
      formData.set("retailer", "kroger");

      const cartResult = await submitDraftFlowAction({}, formData);
      if (cartResult.error || !cartResult.resourceId) {
        setCartError(cartResult.error ?? "Unable to create this cart.");
        return;
      }

      router.push(`/carts/${cartResult.resourceId}`);
    });
  }

  function handleDeleteRecipe() {
    const confirmed = window.confirm(`Delete ${currentRecipe.name}?`);
    if (!confirmed) return;

    setDeleteError(null);
    startDelete(async () => {
      const result = await deleteRecipeAction(currentRecipe.id);
      if (result.error) {
        setDeleteError(result.error);
        return;
      }

      router.push("/recipes");
    });
  }

  return (
    <main className="mx-auto max-w-4xl px-4 pb-36 pt-4 sm:px-6 lg:pb-10 lg:pt-8">
      <article className="overflow-hidden rounded-[2rem] bg-[#fffdfa] shadow-[0_18px_60px_rgba(60,154,158,0.12)] lg:rounded-[2.25rem]">
        <section className="relative">
          <div className="relative h-[21rem] overflow-hidden bg-surface-container sm:h-[30rem]">
            <RecipeImage
              src={currentRecipe.cover_image_url}
              alt={currentRecipe.name}
              seed={currentRecipe.id}
              className="h-full w-full"
              imgClassName="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,14,9,0.04)_0%,rgba(20,14,9,0.18)_42%,rgba(20,14,9,0.62)_100%)]" />
            <button
              type="button"
              className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white text-primary shadow-sm"
              aria-label="Save recipe"
            >
              <span className="material-symbols-outlined icon-filled text-[21px]">
                favorite
              </span>
            </button>
            <div className="absolute inset-x-0 bottom-0 p-5 pb-12 text-white sm:p-7 sm:pb-16">
              <h1 className="max-w-2xl text-[2.35rem] font-black leading-[0.95] sm:text-[3.6rem]">
                {currentRecipe.name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] font-bold">
                <span>{prepMinutes(currentRecipe)} min</span>
                <span className="h-1 w-1 rounded-full bg-white/70" />
                <span>{currentRecipe.cuisine.label}</span>
                {badges.map((badge) => (
                  <span
                    key={badge.id}
                    className="rounded-full bg-white/18 px-2.5 py-1"
                  >
                    {badge.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="-mt-5 grid grid-cols-4 gap-0 px-4 sm:-mt-8 sm:px-7">
          {nutritionCards.map((item) => (
            <div
              key={item.label}
              className="relative bg-white px-2 py-4 text-center shadow-[0_10px_28px_rgba(60,154,158,0.08)] first:rounded-l-2xl last:rounded-r-2xl"
            >
              <p className="text-[1.05rem] font-black leading-tight text-on-surface sm:text-headline-sm">
                {item.value}
              </p>
              <p className="mt-1 text-[10px] font-semibold text-outline sm:text-label-md">
                {item.label}
              </p>
            </div>
          ))}
        </section>

        <section className="px-4 pt-6 sm:px-7">
          <div className="grid grid-cols-2 border-b border-outline-variant/30">
            {(["ingredients", "steps"] as RecipeTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() =>
                  setPageMemory((current) => ({
                    ...current,
                    activeTab: tab,
                  }))
                }
                className={`relative py-3 text-label-lg capitalize ${
                  activeTab === tab ? "text-primary" : "text-outline"
                }`}
              >
                {tab}
                {activeTab === tab ? (
                  <span className="absolute inset-x-8 bottom-0 h-0.5 rounded-full bg-primary-fixed-dim" />
                ) : null}
              </button>
            ))}
          </div>
        </section>

        <section className="min-h-[21rem] px-4 py-4 sm:px-7 sm:py-6">
          {activeTab === "ingredients" ? (
            <div className="space-y-3">
              <div className="rounded-[1.25rem] border border-[#c0dedf] bg-white p-3 shadow-[0_10px_28px_rgba(60,154,158,0.06)]">
                <button
                  type="button"
                  onClick={handleCheckInventory}
                  disabled={aiAlternativesPending}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#2f7f83] px-4 py-2.5 text-label-lg font-black text-white transition-colors hover:bg-[#25696d] disabled:opacity-60"
                >
                  <span
                    className={`material-symbols-outlined text-[18px] ${
                      aiAlternativesPending ? "animate-spin" : ""
                    }`}
                  >
                    {aiAlternativesPending
                      ? "progress_activity"
                      : "inventory_2"}
                  </span>
                  {aiAlternativesPending
                    ? "Checking inventory..."
                    : inventoryChecked
                      ? "Check again"
                      : "Check against inventory"}
                </button>
                {inventoryCheckError ? (
                  <p className="mt-2 text-center text-body-sm text-error">
                    {inventoryCheckError}
                  </p>
                ) : null}
              </div>

              {inventoryChecked ? (
                <div className="grid grid-cols-3 gap-2">
                  <InventorySummaryPill
                    icon="check_circle"
                    label="In kitchen"
                    value={inventorySummary.available}
                    className="bg-[#ecf8f4] text-[#256f5c]"
                  />
                  <InventorySummaryPill
                    icon="swap_horiz"
                    label="Alt"
                    value={inventorySummary.alternative}
                    className="bg-[#fff7dc] text-[#8a5d00]"
                  />
                  <InventorySummaryPill
                    icon="add_shopping_cart"
                    label="Buy"
                    value={inventorySummary.missing}
                    className="bg-[#fff0ed] text-[#a33720]"
                  />
                </div>
              ) : null}

              {currentRecipe.ingredients.map((ingredient, index) =>
                inventoryChecked ? (
                  <IngredientReadinessRow
                    key={`${ingredient.canonical_ingredient}-${index}`}
                    ingredient={ingredient}
                    checkingAlternative={
                      aiAlternativesPending &&
                      getIngredientReadiness(ingredient, inventory).status !==
                        "available"
                    }
                    readiness={getIngredientReadiness(
                      ingredient,
                      inventory,
                      alternativeByIngredient.get(
                        normalizeIngredientKey(ingredient.canonical_ingredient),
                      ),
                    )}
                  />
                ) : (
                  <IngredientPlainRow
                    key={`${ingredient.canonical_ingredient}-${index}`}
                    ingredient={ingredient}
                  />
                ),
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {currentRecipe.steps.map((step) => {
                const copy = splitStepCopy(step.what_to_do);
                return (
                  <div
                    key={step.step}
                    className="flex gap-3 rounded-[1.25rem] border border-outline-variant/25 bg-white p-4"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-fixed-dim text-label-lg text-on-primary-fixed">
                      {step.step}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-label-lg text-on-surface">
                        {copy.title}
                      </span>
                      {copy.body ? (
                        <span className="mt-1 block text-body-sm text-on-surface-variant">
                          {copy.body}
                        </span>
                      ) : null}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="sticky bottom-0 space-y-3 border-t border-outline-variant/25 bg-[#fffdfa]/95 px-4 py-4 backdrop-blur-sm sm:px-7">
          {cartError ? (
            <p className="text-center text-body-sm text-error">{cartError}</p>
          ) : null}
          {deleteError ? (
            <p className="text-center text-body-sm text-error">{deleteError}</p>
          ) : null}
          {canManageRecipe ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEditingRecipe(currentRecipe)}
                className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#c0dedf] px-4 py-2.5 text-label-md font-black text-[#5f8689] transition-colors hover:bg-[#fff8ef]"
              >
                <span className="material-symbols-outlined text-[18px]">
                  edit
                </span>
                Edit
              </button>
              <button
                type="button"
                onClick={handleDeleteRecipe}
                disabled={isDeleting}
                className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-error/35 px-4 py-2.5 text-label-md font-black text-error transition-colors hover:bg-error-container/30 disabled:opacity-60"
              >
                <span
                  className={`material-symbols-outlined text-[18px] ${
                    isDeleting ? "animate-spin" : ""
                  }`}
                >
                  {isDeleting ? "progress_activity" : "delete"}
                </span>
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          ) : null}
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isAddingToCart}
            className="flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-[#2f7f83] px-5 py-3 text-label-lg font-black text-white shadow-[0_12px_28px_rgba(47,127,131,0.22)] transition-colors hover:bg-[#25696d] disabled:opacity-60"
          >
            <span
              className={`material-symbols-outlined text-[20px] ${
                isAddingToCart ? "animate-spin" : ""
              }`}
            >
              {isAddingToCart ? "progress_activity" : "add_shopping_cart"}
            </span>
            {isAddingToCart ? "Adding to cart..." : "Add to cart"}
          </button>
          <button
            type="button"
            onClick={() => setHandsFreeSetupOpen(true)}
            className="flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-primary-fixed-dim px-5 py-3 text-label-lg font-black text-on-primary-fixed shadow-[0_12px_28px_rgba(244,121,13,0.25)]"
          >
            <span className="material-symbols-outlined text-[20px]">mic</span>
            Start hands-free mode
            <span className="material-symbols-outlined text-[18px]">
              arrow_forward
            </span>
          </button>
        </section>
      </article>

      {handsFreeSetupOpen ? (
        <HandsFreeSetupModal
          recipe={recipe}
          onCancel={() => setHandsFreeSetupOpen(false)}
          onStart={(context) => {
            setHandsFreeSetupOpen(false);
            setPageMemory((current) => ({
              ...current,
              handsFreeOpen: true,
              handsFreeSessionContext: context,
            }));
          }}
        />
      ) : null}

      {handsFreeOpen ? (
        <HandsFreeMode
          recipe={currentRecipe}
          cookingContext={cookingContext}
          sessionContext={handsFreeSessionContext}
          onClose={() =>
            setPageMemory((current) => ({
              ...current,
              handsFreeOpen: false,
            }))
          }
        />
      ) : null}
      {editingRecipe ? (
        <RecipeCreateModal
          cuisines={cuisines}
          tags={tags}
          initialRecipe={editingRecipe}
          onClose={() => setEditingRecipe(null)}
          onCreated={(updatedRecipe) => {
            setCurrentRecipe(updatedRecipe);
            setEditingRecipe(null);
          }}
        />
      ) : null}
    </main>
  );
}

function IngredientPlainRow({ ingredient }: { ingredient: DishIngredient }) {
  return (
    <div className="flex items-center gap-3 rounded-[1.15rem] border border-outline-variant/25 bg-white px-4 py-3">
      <span className="material-symbols-outlined text-primary-fixed-dim">
        grocery
      </span>
      <span className="min-w-0 flex-1 text-body-sm font-semibold text-on-surface">
        {ingredient.display_ingredient ?? ingredient.canonical_ingredient}
        {ingredient.preparation ? `, ${ingredient.preparation}` : ""}
      </span>
      <span className="shrink-0 text-body-sm text-outline">
        {ingredient.amount} {ingredient.unit}
      </span>
    </div>
  );
}

function InventorySummaryPill({
  icon,
  label,
  value,
  className,
}: {
  icon: string;
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div
      className={`flex min-w-0 items-center justify-center gap-1.5 rounded-2xl px-2.5 py-2 text-label-sm font-bold ${className}`}
    >
      <span className="material-symbols-outlined text-[16px]">{icon}</span>
      <span className="truncate">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function IngredientReadinessRow({
  ingredient,
  checkingAlternative,
  readiness,
}: {
  ingredient: DishIngredient;
  checkingAlternative: boolean;
  readiness: IngredientReadiness;
}) {
  const displayName =
    ingredient.display_ingredient ?? ingredient.canonical_ingredient;
  const status = checkingAlternative
    ? {
        icon: "progress_activity",
        label: "Checking swaps",
        border: "border-[#c0dedf]",
        iconClass: "animate-spin text-[#5f8689]",
        note: "Asking AI to compare your inventory",
      }
    : readiness.status === "available"
      ? {
          icon: "check_circle",
          label: "In kitchen",
          border: "border-[#b9e3d2]",
          iconClass: "text-[#2d806a]",
          note: readiness.item.display_name,
        }
      : readiness.status === "alternative"
        ? {
            icon: "swap_horiz",
            label: "Alternative",
            border: "border-[#f4d47c]",
            iconClass: "text-[#9a6900]",
            note: readiness.reason
              ? `${readiness.alternative.display_name} - ${readiness.reason}`
              : readiness.alternative.display_name,
          }
        : {
            icon: "add_shopping_cart",
            label: "Need to buy",
            border: "border-[#f0b4a8]",
            iconClass: "text-[#b24028]",
            note: "Will be added to cart",
          };

  return (
    <div
      className={`flex items-start gap-3 rounded-[1.15rem] border bg-white px-4 py-3 ${status.border}`}
    >
      <span
        className={`material-symbols-outlined mt-0.5 shrink-0 ${status.iconClass}`}
      >
        {status.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-body-sm font-semibold text-on-surface">
          {displayName}
          {ingredient.preparation ? `, ${ingredient.preparation}` : ""}
        </span>
        <span className="mt-0.5 block text-[11px] font-semibold text-outline">
          {status.label}
          {status.note ? ` - ${status.note}` : ""}
        </span>
      </span>
      <span className="shrink-0 text-body-sm text-outline">
        {ingredient.amount} {ingredient.unit}
      </span>
    </div>
  );
}
