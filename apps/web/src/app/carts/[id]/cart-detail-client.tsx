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
  cart: Cart,
  crossedOffRows: Set<string>,
) {
  const covered = new Map<string, number>();

  cart.dishes.forEach((dish, dishIndex) => {
    dish.ingredients.forEach((ingredient, ingredientIndex) => {
      if (!crossedOffRows.has(rowKey(dishIndex, ingredientIndex))) return;
      const key = ingredientKey(ingredient);
      covered.set(key, (covered.get(key) ?? 0) + ingredient.amount);
    });
  });

  return covered;
}

function formatAmount(amount: number) {
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
}

export function CartDetailClient({ cart }: { cart: Cart }) {
  const router = useRouter();
  const [inventoryChecked, setInventoryChecked] = useState(false);
  const [crossedOffRows, setCrossedOffRows] = useState<Set<string>>(
    () => new Set(),
  );
  const [cartError, setCartError] = useState<string | null>(null);
  const [isCreatingShoppingCart, startCreateShoppingCart] = useTransition();
  const dishNeeds = useMemo(
    () => buildDishNeeds(cart, inventoryChecked, crossedOffRows),
    [cart, crossedOffRows, inventoryChecked],
  );
  const manualCoveredByAggregate = useMemo(
    () => buildManualCoveredByAggregate(cart, crossedOffRows),
    [cart, crossedOffRows],
  );
  const totalToBuy = cart.overview.reduce((total, ingredient) => {
    const key = aggregateKey(ingredient);
    const manualCovered = manualCoveredByAggregate.get(key) ?? 0;
    const remaining = ingredient.remaining_to_buy ?? ingredient.total_amount;
    return total + Math.max(0, remaining - manualCovered);
  }, 0);
  const coveredCount = cart.overview.filter(
    (ingredient) =>
      (ingredient.remaining_to_buy ?? ingredient.total_amount) <= 0,
  ).length;
  const partialCount = cart.overview.filter(
    (ingredient) =>
      (ingredient.remaining_to_buy ?? ingredient.total_amount) > 0 &&
      (ingredient.remaining_to_buy ?? ingredient.total_amount) <
        ingredient.total_amount,
  ).length;

  function handleCreateShoppingCart() {
    if (!cart.id) return;
    setCartError(null);
    startCreateShoppingCart(async () => {
      const reviewItems: IngredientReview["items"] = cart.overview.map(
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
        cart.id!,
        reviewItems,
      );
      if (reviewResult.error) {
        setCartError(reviewResult.error);
        return;
      }

      const result = await createShoppingCartAction(cart.id!, cart.retailer);
      if (result.error) {
        setCartError(result.error);
        return;
      }

      router.push("/shopping");
    });
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-headline-sm text-[#132326]">Cart</h2>
            <p className="mt-1 text-body-sm text-[#5f8689]">
              Review what each recipe needs before creating the shopping list.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setInventoryChecked(true)}
            className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#2f7f83] px-5 py-2.5 text-label-lg font-black text-white transition-colors hover:bg-[#25696d]"
          >
            <span className="material-symbols-outlined text-[18px]">
              inventory_2
            </span>
            {inventoryChecked ? "Inventory checked" : "Check against inventory"}
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
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f4790d]">
                  {dish.cuisine ?? "Recipe"}
                </p>
                <h3 className="mt-1 text-[1.5rem] font-black leading-tight text-[#132326]">
                  {dish.name}
                </h3>
              </div>
              <span className="rounded-full bg-[#fff2e3] px-3 py-1 text-label-sm font-semibold text-[#f4790d]">
                {ingredients.length} item{ingredients.length === 1 ? "" : "s"}
              </span>
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
          disabled={isCreatingShoppingCart || !cart.id}
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
