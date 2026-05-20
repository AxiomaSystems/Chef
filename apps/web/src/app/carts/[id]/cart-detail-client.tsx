"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  AggregatedIngredient,
  Cart,
  DishIngredient,
  IngredientReview,
} from "@cart/shared";
import { normalizeIngredientKey } from "@cart/shared";
import {
  createShoppingCartAction,
  deletePlanningResourceAction,
  updateCartDetailsAction,
  updateIngredientReviewAction,
} from "@/app/home-actions";

type IngredientNeed = {
  key: string;
  ingredient: DishIngredient;
  coveredAmount: number;
  crossedOffAmount: number;
  amountToBuy: number;
  aggregate?: AggregatedIngredient;
  crossedOff: boolean;
};

function ingredientKey(
  ingredient: Pick<
    DishIngredient,
    "ingredient_id" | "canonical_ingredient" | "unit"
  >,
) {
  const unit = ingredient.unit.trim().toLowerCase();
  if (ingredient.ingredient_id)
    return `ingredient:${ingredient.ingredient_id}::${unit}`;
  return `name:${normalizeIngredientKey(ingredient.canonical_ingredient)}::${unit}`;
}

function aggregateKey(ingredient: AggregatedIngredient) {
  const unit = ingredient.unit.trim().toLowerCase();
  if (ingredient.ingredient_id)
    return `ingredient:${ingredient.ingredient_id}::${unit}`;
  return `name:${normalizeIngredientKey(ingredient.canonical_ingredient)}::${unit}`;
}

function rowKey(dishIndex: number, ingredientIndex: number) {
  return `${dishIndex}:${ingredientIndex}`;
}

function buildDishNeeds(
  cart: Cart,
  inventoryChecked: boolean,
  crossedOffRows: Set<string>,
) {
  const aggregateByKey = new Map(
    cart.overview.map((ingredient) => [aggregateKey(ingredient), ingredient]),
  );
  const coveredRemaining = new Map(
    cart.overview.map((ingredient) => [
      aggregateKey(ingredient),
      Math.max(
        0,
        ingredient.total_amount -
          (ingredient.remaining_to_buy ?? ingredient.total_amount),
      ),
    ]),
  );

  return cart.dishes.map((dish, dishIndex) => {
    const ingredients: IngredientNeed[] = dish.ingredients.map(
      (ingredient, ingredientIndex) => {
        const key = ingredientKey(ingredient);
        const rowId = rowKey(dishIndex, ingredientIndex);
        const aggregate = aggregateByKey.get(key);
        const coveredAvailable = coveredRemaining.get(key) ?? 0;
        const crossedOff = crossedOffRows.has(rowId);
        const coveredAmount = inventoryChecked
          ? Math.min(ingredient.amount, coveredAvailable)
          : 0;
        const crossedOffAmount = crossedOff
          ? Math.max(0, ingredient.amount - coveredAmount)
          : 0;
        const amountToBuy = inventoryChecked
          ? Math.max(0, ingredient.amount - coveredAmount - crossedOffAmount)
          : crossedOff
            ? 0
            : ingredient.amount;

        if (inventoryChecked) {
          coveredRemaining.set(
            key,
            Math.max(0, coveredAvailable - coveredAmount),
          );
        }

        return {
          key: rowId,
          ingredient,
          aggregate,
          coveredAmount,
          crossedOffAmount,
          amountToBuy,
          crossedOff,
        };
      },
    );

    return {
      dish,
      ingredients,
    };
  });
}

function buildManualCoveredByAggregate(
  dishNeeds: ReturnType<typeof buildDishNeeds>,
) {
  const covered = new Map<string, number>();

  dishNeeds.forEach(({ ingredients }) => {
    ingredients.forEach((item) => {
      if (!item.crossedOff || item.crossedOffAmount <= 0) return;
      const key = ingredientKey(item.ingredient);
      covered.set(key, (covered.get(key) ?? 0) + item.crossedOffAmount);
    });
  });

  return covered;
}

function formatAmount(amount: number) {
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
}

function fallbackCartName(cart: Cart) {
  return cart.name?.trim() || "Cart";
}

export function CartDetailClient({ cart }: { cart: Cart }) {
  const router = useRouter();
  const [currentCart, setCurrentCart] = useState(cart);
  const [inventoryChecked, setInventoryChecked] = useState(false);
  const [crossedOffRows, setCrossedOffRows] = useState<Set<string>>(
    () => new Set(),
  );
  const [cartError, setCartError] = useState<string | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<{
    dishIndex: number;
    dishName: string;
    dish: Dish;
  } | null>(null);
  const [isCreatingShoppingCart, startCreateShoppingCart] = useTransition();
  const [isCheckingInventory, startCheckInventory] = useTransition();
  const [pendingRecipeId, setPendingRecipeId] = useState<string | null>(null);
  const dishNeeds = useMemo(
    () => buildDishNeeds(currentCart, inventoryChecked, crossedOffRows),
    [currentCart, crossedOffRows, inventoryChecked],
  );
  const manualCoveredByAggregate = useMemo(
    () => buildManualCoveredByAggregate(dishNeeds),
    [dishNeeds],
  );
  const totalToBuy = currentCart.overview.reduce((total, ingredient) => {
    const key = aggregateKey(ingredient);
    const manualCovered = manualCoveredByAggregate.get(key) ?? 0;
    const remaining = ingredient.remaining_to_buy ?? ingredient.total_amount;
    return total + Math.max(0, remaining - manualCovered);
  }, 0);
  const coveredCount = currentCart.overview.filter(
    (ingredient) =>
      (ingredient.remaining_to_buy ?? ingredient.total_amount) <= 0,
  ).length;
  const partialCount = currentCart.overview.filter(
    (ingredient) =>
      (ingredient.remaining_to_buy ?? ingredient.total_amount) > 0 &&
      (ingredient.remaining_to_buy ?? ingredient.total_amount) <
        ingredient.total_amount,
  ).length;

  function handleCreateShoppingCart() {
    if (!currentCart.id) return;
    setCartError(null);
    startCreateShoppingCart(async () => {
      const reviewItems: IngredientReview["items"] = currentCart.overview.map(
        (ingredient) => {
          const manualCovered =
            manualCoveredByAggregate.get(aggregateKey(ingredient)) ?? 0;
          const adjustedAmount = Math.max(
            0,
            ingredient.total_amount - manualCovered,
          );

          return {
            ingredient_id: ingredient.ingredient_id,
            canonical_ingredient: ingredient.canonical_ingredient,
            total_amount: ingredient.total_amount,
            unit: ingredient.unit,
            source_dishes: ingredient.source_dishes,
            action:
              manualCovered <= 0
                ? "buy"
                : adjustedAmount === 0
                  ? "already_have"
                  : "adjust",
            adjusted_amount: manualCovered > 0 ? adjustedAmount : undefined,
            adjusted_unit: manualCovered > 0 ? ingredient.unit : undefined,
          };
        },
      );
      const reviewResult = await updateIngredientReviewAction(
        currentCart.id!,
        reviewItems,
      );
      if (reviewResult.error) {
        setCartError(reviewResult.error);
        return;
      }

      const result = await createShoppingCartAction(
        currentCart.id!,
        currentCart.retailer,
      );
      if (result.error) {
        setCartError(result.error);
        return;
      }

      router.push("/shopping");
    });
  }

  function handleCheckInventory() {
    if (!currentCart.id) return;
    setCartError(null);
    startCheckInventory(async () => {
      const result = await updateCartDetailsAction(currentCart.id!, {});
      if (result.error || !result.cart) {
        setCartError(result.error ?? "Unable to check inventory right now.");
        return;
      }
      setCurrentCart(result.cart);
      setInventoryChecked(true);
    });
  }

  function updateRecipeDish(dishIndex: number, nextDish: Dish) {
    if (!currentCart.id) return;

    setCartError(null);
    setPendingRecipeId(nextDish.id ?? `${dishIndex}`);

    void updateCartDetailsAction(currentCart.id, {
      dishes: currentCart.dishes.map((dish, index) =>
        index === dishIndex ? nextDish : dish,
      ),
    }).then((result) => {
      setPendingRecipeId(null);
      if (result.error || !result.cart) {
        setCartError(result.error ?? "Unable to update this recipe.");
        return;
      }
      setCurrentCart(result.cart);
      setCrossedOffRows(new Set());
      setInventoryChecked(false);
      setEditingRecipe(null);
    });
  }

  function deleteRecipeFromCart(
    dishName: string,
    dishIndex: number,
    recipeId?: string,
  ) {
    if (!currentCart.id) return;
    const confirmed = window.confirm(`Remove ${dishName} from this cart?`);
    if (!confirmed) return;

    const nextDishes = currentCart.dishes.filter(
      (_dish, index) => index !== dishIndex,
    );
    const target = recipeId
      ? currentCart.selections.find(
          (selection) => selection.recipe_id === recipeId,
        )
      : null;

    const nextSelections = target
      ? target.quantity > 1
        ? currentCart.selections.map((selection) =>
            selection.recipe_id === recipeId
              ? { ...selection, quantity: selection.quantity - 1 }
              : selection,
          )
        : currentCart.selections.filter(
            (selection) => selection.recipe_id !== recipeId,
          )
      : currentCart.selections;

    setCartError(null);
    setPendingRecipeId(recipeId ?? `${dishIndex}`);

    if (nextDishes.length === 0) {
      void deletePlanningResourceAction("cart", currentCart.id).then(
        (result) => {
          setPendingRecipeId(null);
          if (result.error) {
            setCartError(result.error);
            return;
          }
          router.push("/carts");
          router.refresh();
        },
      );
      return;
    }

    void updateCartDetailsAction(currentCart.id, {
      selections: nextSelections,
      dishes: nextDishes,
    }).then((result) => {
      setPendingRecipeId(null);
      if (result.error || !result.cart) {
        setCartError(result.error ?? "Unable to remove this recipe.");
        return;
      }
      setCurrentCart(result.cart);
      setCrossedOffRows(new Set());
      setInventoryChecked(false);
    });
  }

  function editRecipeInCart(dish: Dish, dishIndex: number) {
    setEditingRecipe({ dishIndex, dishName: dish.name, dish });
  }

  function toggleIngredient(key: string) {
    setCrossedOffRows((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-[1.75rem] border border-[#c0dedf] bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0">
            <h2 className="truncate text-headline-sm text-[#132326]">
              {fallbackCartName(currentCart)}
            </h2>
            <p className="mt-1 text-body-sm text-[#5f8689]">
              Review what each recipe needs before creating the shopping list.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCheckInventory}
            disabled={isCheckingInventory || !currentCart.id}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#2f7f83] px-4 py-2.5 text-label-md font-black text-white transition-colors hover:bg-[#25696d] disabled:opacity-60 lg:w-auto"
          >
            <span
              className={`material-symbols-outlined text-[18px] ${
                isCheckingInventory ? "animate-spin" : ""
              }`}
            >
              {isCheckingInventory ? "progress_activity" : "inventory_2"}
            </span>
            {isCheckingInventory
              ? "Checking..."
              : inventoryChecked
                ? "Check again"
                : "Check inventory"}
          </button>
        </div>

        {inventoryChecked ? (
          <div className="mt-4 grid grid-cols-3 gap-2">
            <SummaryPill label="Covered" value={coveredCount} tone="covered" />
            <SummaryPill label="Partial" value={partialCount} tone="partial" />
            <SummaryPill
              label="In cart"
              value={formatAmount(totalToBuy)}
              tone="buy"
            />
          </div>
        ) : null}
      </section>

      <section className="grid gap-4">
        {dishNeeds.map(({ dish, ingredients }, index) => (
          <article
            key={`${dish.name}-${index}`}
            className="rounded-[1.65rem] border border-[#c0dedf] bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f4790d]">
                  {dish.cuisine ?? "Recipe"}
                </p>
                <h3 className="mt-1 break-words text-[1.5rem] font-black leading-tight text-[#132326]">
                  {dish.name}
                </h3>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-full bg-[#fff2e3] px-3 py-1 text-label-sm font-semibold text-[#f4790d]">
                  {ingredients.length} item
                  {ingredients.length === 1 ? "" : "s"}
                </span>
                <button
                  type="button"
                  onClick={() => editRecipeInCart(dish, index)}
                  disabled={pendingRecipeId === (dish.id ?? `${index}`)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[#c0dedf] text-[#5f8689] transition-colors hover:bg-[#fff8ef] disabled:opacity-50"
                  aria-label={`Edit ${dish.name}`}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    edit
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    deleteRecipeFromCart(dish.name, index, dish.id)
                  }
                  disabled={pendingRecipeId === (dish.id ?? `${index}`)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-red-200 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                  aria-label={`Remove ${dish.name}`}
                >
                  <span
                    className={`material-symbols-outlined text-[20px] ${
                      pendingRecipeId === (dish.id ?? `${index}`)
                        ? "animate-spin"
                        : ""
                    }`}
                  >
                    {pendingRecipeId === (dish.id ?? `${index}`)
                      ? "progress_activity"
                      : "delete"}
                  </span>
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              {ingredients.length > 0 ? (
                ingredients.map((item, ingredientIndex) => (
                  <IngredientRow
                    key={`${item.ingredient.canonical_ingredient}-${ingredientIndex}`}
                    item={item}
                    inventoryChecked={inventoryChecked}
                    onToggle={() => toggleIngredient(item.key)}
                  />
                ))
              ) : (
                <div className="rounded-[1.15rem] border border-[#b9e3d2] bg-[#ecf8f4] px-4 py-3 text-body-sm font-semibold text-[#256f5c]">
                  Covered by your inventory.
                </div>
              )}
            </div>
          </article>
        ))}
      </section>

      <section className="sticky bottom-[4.5rem] z-30 bg-[#fffdfa]/95 px-4 py-3 shadow-[0_-12px_32px_rgba(19,35,38,0.06)] backdrop-blur-sm lg:bottom-0">
        {cartError ? (
          <p className="mb-2 text-center text-body-sm text-error">
            {cartError}
          </p>
        ) : null}
        <button
          type="button"
          onClick={handleCreateShoppingCart}
          disabled={isCreatingShoppingCart || !currentCart.id}
          className="flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-label-lg font-black text-on-primary shadow-[0_12px_28px_rgba(244,121,13,0.25)] transition-opacity disabled:opacity-60"
        >
          <span
            className={`material-symbols-outlined text-[20px] ${
              isCreatingShoppingCart ? "animate-spin" : ""
            }`}
          >
            {isCreatingShoppingCart ? "progress_activity" : "shopping_cart"}
          </span>
          {isCreatingShoppingCart
            ? "Creating shopping list..."
            : "Create shopping list"}
        </button>
      </section>

      {editingRecipe ? (
        <EditRecipeInCartDialog
          dishName={editingRecipe.dishName}
          dish={editingRecipe.dish}
          onClose={() => setEditingRecipe(null)}
          onSave={(dish) => updateRecipeDish(editingRecipe.dishIndex, dish)}
        />
      ) : null}
    </div>
  );
}

function EditRecipeInCartDialog({
  dishName,
  dish,
  onClose,
  onSave,
}: {
  dishName: string;
  dish: Dish;
  onClose: () => void;
  onSave: (dish: Dish) => void;
}) {
  const [name, setName] = useState(dish.name);
  const [servings, setServings] = useState(dish.servings ?? "");
  const [ingredients, setIngredients] = useState<DishIngredient[]>(
    dish.ingredients.map((ingredient) => ({ ...ingredient })),
  );

  function saveRecipe() {
    const normalizedServings =
      servings === "" ? undefined : Math.max(1, Number(servings));
    onSave({
      ...dish,
      name: name.trim() || dish.name,
      servings:
        Number.isFinite(normalizedServings) && normalizedServings
          ? normalizedServings
          : dish.servings,
      ingredients: ingredients
        .map((ingredient) => {
          const displayName =
            ingredient.display_ingredient?.trim() ||
            ingredient.canonical_ingredient.trim();
          return {
            ...ingredient,
            canonical_ingredient:
              ingredient.canonical_ingredient.trim() ||
              displayName.toLowerCase(),
            display_ingredient: displayName || undefined,
            unit: ingredient.unit.trim() || "unit",
            amount: Math.max(0, Number(ingredient.amount) || 0),
            preparation: ingredient.preparation?.trim() || undefined,
          };
        })
        .filter(
          (ingredient) =>
            ingredient.canonical_ingredient && ingredient.amount > 0,
        ),
    });
  }

  function updateIngredient(index: number, patch: Partial<DishIngredient>) {
    setIngredients((current) =>
      current.map((ingredient, currentIndex) =>
        currentIndex === index ? { ...ingredient, ...patch } : ingredient,
      ),
    );
  }

  function removeIngredient(index: number) {
    setIngredients((current) =>
      current.length <= 1
        ? current
        : current.filter((_ingredient, currentIndex) => currentIndex !== index),
    );
  }

  function addIngredient() {
    setIngredients((current) => [
      ...current,
      {
        canonical_ingredient: "",
        amount: 1,
        unit: "unit",
      },
    ]);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end bg-black/35 sm:items-center sm:justify-center sm:p-5">
      <div className="flex max-h-[calc(100dvh-1rem)] w-screen flex-col rounded-t-[1.75rem] bg-white p-5 shadow-2xl sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-[1.75rem]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#f4790d]">
              Recipe
            </p>
            <h2 className="mt-1 text-headline-sm text-[#132326]">
              Edit recipe
            </h2>
            <p className="mt-1 text-body-sm text-[#5f8689]">{dishName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#c0dedf] text-[#5f8689]"
            aria-label="Close edit cart"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pt-5">
          <label className="block text-label-sm font-bold uppercase tracking-wide text-[#5f8689]">
            Recipe name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 min-h-12 w-full rounded-full border border-[#c0dedf] bg-white px-4 text-body-md font-semibold normal-case tracking-normal text-[#132326] outline-none focus:border-[#f4790d]"
            />
          </label>

          <label className="mt-4 block text-label-sm font-bold uppercase tracking-wide text-[#5f8689]">
            Servings override
            <input
              type="number"
              min={1}
              placeholder="Use recipe default"
              value={servings}
              onChange={(event) =>
                setServings(
                  event.target.value === "" ? "" : Number(event.target.value),
                )
              }
              className="mt-2 min-h-12 w-full rounded-full border border-[#c0dedf] bg-white px-4 text-body-md font-semibold normal-case tracking-normal text-[#132326] outline-none focus:border-[#f4790d]"
            />
          </label>

          <div className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-label-sm font-bold uppercase tracking-wide text-[#5f8689]">
                Ingredients
              </p>
              <button
                type="button"
                onClick={addIngredient}
                className="inline-flex min-h-9 items-center gap-1 rounded-full bg-[#fff2e3] px-3 text-label-sm font-black text-[#f4790d]"
              >
                <span className="material-symbols-outlined text-[17px]">
                  add
                </span>
                Add
              </button>
            </div>

            <div className="mt-3 grid gap-3">
              {ingredients.map((ingredient, index) => (
                <div
                  key={`${ingredient.canonical_ingredient}-${index}`}
                  className="rounded-[1.25rem] border border-[#c0dedf] bg-[#fffdfa] p-3"
                >
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_6rem_6rem]">
                    <input
                      value={
                        ingredient.display_ingredient ??
                        ingredient.canonical_ingredient
                      }
                      onChange={(event) =>
                        updateIngredient(index, {
                          canonical_ingredient: event.target.value,
                          display_ingredient: event.target.value,
                        })
                      }
                      placeholder="Ingredient"
                      className="min-h-10 rounded-full border border-[#c0dedf] bg-white px-3 text-body-sm font-semibold text-[#132326] outline-none focus:border-[#f4790d]"
                    />
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={ingredient.amount}
                      onChange={(event) =>
                        updateIngredient(index, {
                          amount: Number(event.target.value),
                        })
                      }
                      className="min-h-10 rounded-full border border-[#c0dedf] bg-white px-3 text-body-sm font-semibold text-[#132326] outline-none focus:border-[#f4790d]"
                    />
                    <input
                      value={ingredient.unit}
                      onChange={(event) =>
                        updateIngredient(index, { unit: event.target.value })
                      }
                      className="min-h-10 rounded-full border border-[#c0dedf] bg-white px-3 text-body-sm font-semibold text-[#132326] outline-none focus:border-[#f4790d]"
                    />
                  </div>
                  <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                    <input
                      value={ingredient.preparation ?? ""}
                      onChange={(event) =>
                        updateIngredient(index, {
                          preparation: event.target.value,
                        })
                      }
                      placeholder="Preparation, optional"
                      className="min-h-10 rounded-full border border-[#c0dedf] bg-white px-3 text-body-sm text-[#132326] outline-none focus:border-[#f4790d]"
                    />
                    <button
                      type="button"
                      onClick={() => removeIngredient(index)}
                      disabled={ingredients.length <= 1}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-red-200 text-red-600 disabled:opacity-40"
                      aria-label="Remove ingredient"
                    >
                      <span className="material-symbols-outlined text-[19px]">
                        delete
                      </span>
                    </button>
                  </div>
                  <label className="mt-2 flex items-center gap-2 text-label-sm font-semibold text-[#5f8689]">
                    <input
                      type="checkbox"
                      checked={ingredient.optional ?? false}
                      onChange={(event) =>
                        updateIngredient(index, {
                          optional: event.target.checked,
                        })
                      }
                      className="h-4 w-4 rounded border-[#c0dedf] accent-[#f4790d]"
                    />
                    Optional ingredient
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-5">
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 rounded-full border border-[#c0dedf] px-4 text-label-lg font-black text-[#5f8689]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={saveRecipe}
            className="min-h-12 rounded-full bg-[#f4790d] px-4 text-label-lg font-black text-white disabled:opacity-60"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: "covered" | "partial" | "buy";
}) {
  const className =
    tone === "covered"
      ? "bg-[#ecf8f4] text-[#256f5c]"
      : tone === "partial"
        ? "bg-[#fff7dc] text-[#8a5d00]"
        : "bg-[#fff0ed] text-[#a33720]";

  return (
    <div className={`rounded-2xl px-3 py-2 text-center font-bold ${className}`}>
      <p className="text-[1rem] leading-tight">{value}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-wide">{label}</p>
    </div>
  );
}

function IngredientRow({
  item,
  inventoryChecked,
  onToggle,
}: {
  item: IngredientNeed;
  inventoryChecked: boolean;
  onToggle: () => void;
}) {
  const ingredient = item.ingredient;
  const displayName =
    ingredient.display_ingredient ?? ingredient.canonical_ingredient;
  const status = item.crossedOff
    ? {
        icon: "check",
        label: "Already have",
        className: "border-[#b9e3d2] text-[#256f5c]",
        detail: "Removed from shopping list",
      }
    : !inventoryChecked
      ? {
          icon: "shopping_cart",
          label: "",
          className: "border-[#c0dedf] text-[#5f8689]",
          detail: "",
        }
      : item.coveredAmount <= 0
        ? {
            icon: "shopping_cart",
            label: "In cart",
            className: "border-[#f0b4a8] text-[#b24028]",
            detail: `${formatAmount(item.amountToBuy)} ${ingredient.unit}`,
          }
        : item.amountToBuy > 0
          ? {
              icon: "contrast",
              label: "Partially covered",
              className: "border-[#f4d47c] text-[#9a6900]",
              detail: `${formatAmount(item.coveredAmount)} covered, ${formatAmount(item.amountToBuy)} ${ingredient.unit} to buy`,
            }
          : {
              icon: "check_circle",
              label: "Covered",
              className: "border-[#b9e3d2] text-[#256f5c]",
              detail: `${formatAmount(item.coveredAmount)} ${ingredient.unit} in inventory`,
            };

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex w-full items-start gap-3 rounded-[1.15rem] border bg-white px-4 py-3 text-left transition-colors hover:bg-[#fff8ef] ${status.className}`}
    >
      <span className="material-symbols-outlined mt-0.5 text-[18px]">
        {status.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={`text-body-sm font-semibold text-[#132326] ${
            item.crossedOff ? "line-through decoration-2" : ""
          }`}
        >
          {displayName}
          {ingredient.preparation ? `, ${ingredient.preparation}` : ""}
        </p>
        {status.label ? (
          <p className="mt-0.5 text-[11px] font-semibold">{status.label}</p>
        ) : null}
        {inventoryChecked ? (
          <p className="mt-0.5 text-[11px] text-[#5f8689]">{status.detail}</p>
        ) : null}
      </div>
      <span className="shrink-0 text-body-sm text-[#5f8689]">
        {formatAmount(ingredient.amount)} {ingredient.unit}
      </span>
    </button>
  );
}
