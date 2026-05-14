"use client";

import type {
  MatchedIngredientProduct,
  ProductCandidate,
  ShoppingCart,
} from "@cart/shared";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  searchRetailerProductsAction,
  updateShoppingCartAction,
} from "@/app/home-actions";

function fmt$(v: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(v);
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function subtotal(items: MatchedIngredientProduct[]) {
  return Number(
    items
      .reduce((sum, item) => sum + (item.estimated_line_total ?? 0), 0)
      .toFixed(2),
  );
}

function buildReplaced(
  current: MatchedIngredientProduct,
  candidate: ProductCandidate,
  query: string,
): MatchedIngredientProduct {
  return {
    ...current,
    kind: current.kind ?? "ingredient_match",
    walmart_search_query: query.trim() || current.walmart_search_query,
    selected_product: candidate,
    selected_quantity: 1,
    estimated_line_total: Number(candidate.price.toFixed(2)),
    notes: current.kind === "manual_item" ? current.notes : "Replaced manually",
  };
}

function buildManual(
  candidate: ProductCandidate,
  query: string,
): MatchedIngredientProduct {
  const label = query.trim() || candidate.title;

  return {
    kind: "manual_item",
    canonical_ingredient: label,
    manual_label: label,
    needed_amount: 1,
    needed_unit: "unit",
    walmart_search_query: label,
    selected_product: candidate,
    selected_quantity: 1,
    estimated_line_total: Number(candidate.price.toFixed(2)),
    notes: "Added manually",
  };
}

type SearchCtx =
  | { mode: "replace"; index: number; query: string }
  | { mode: "add"; query: string };

export function ShoppingCartDetailOverlay({
  shoppingCart,
  onClose,
}: {
  shoppingCart: ShoppingCart | null;
  onClose: () => void;
}) {
  const [cart, setCart] = useState<ShoppingCart | null>(shoppingCart);
  const [ctx, setCtx] = useState<SearchCtx | null>(null);
  const [results, setResults] = useState<ProductCandidate[]>([]);
  const [searchErr, setSearchErr] = useState<string | undefined>();
  const [saveErr, setSaveErr] = useState<string | undefined>();
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [isSearching, startSearch] = useTransition();
  const [isSaving, startSave] = useTransition();

  const total = useMemo(
    () => (cart ? subtotal(cart.matched_items) : 0),
    [cart],
  );

  if (!cart) return null;

  const lineCount = cart.matched_items.length;
  const updatedAt =
    cart.updated_at ?? cart.created_at ?? new Date().toISOString();

  function saveItems(
    nextItems: MatchedIngredientProduct[],
    onDone?: () => void,
  ) {
    if (!cart?.id) {
      setSaveErr("Cart not found.");
      return;
    }

    setSaveErr(undefined);
    setCart({
      ...cart,
      matched_items: nextItems,
      estimated_subtotal: subtotal(nextItems),
    });

    startSave(async () => {
      const result = await updateShoppingCartAction(cart.id ?? "", nextItems);
      if (result.error) {
        setSaveErr(result.error);
        return;
      }

      if (result.shoppingCart) {
        setCart(result.shoppingCart);
      }

      onDone?.();
    });
  }

  function replaceItem(index: number) {
    const item = cart!.matched_items[index];
    setCtx({
      mode: "replace",
      index,
      query:
        item.walmart_search_query ||
        item.manual_label ||
        item.canonical_ingredient,
    });
    setResults([]);
    setSearchErr(undefined);
  }

  function deleteAndSave(index: number) {
    setDeletingIndex(index);
    saveItems(
      cart!.matched_items.filter((_, currentIndex) => currentIndex !== index),
      () => setDeletingIndex(null),
    );
  }

  function adjustQty(index: number, delta: number) {
    const next = cart!.matched_items.map((item, currentIndex) => {
      if (currentIndex !== index || !item.selected_product) return item;

      const quantity = Math.max(1, (item.selected_quantity ?? 1) + delta);
      return {
        ...item,
        selected_quantity: quantity,
        estimated_line_total: Number(
          (item.selected_product.price * quantity).toFixed(2),
        ),
      };
    });

    saveItems(next);
  }

  function selectCandidate(candidate: ProductCandidate) {
    if (!ctx) return;

    const next =
      ctx.mode === "replace"
        ? cart!.matched_items.map((item, index) =>
            index === ctx.index
              ? buildReplaced(item, candidate, ctx.query)
              : item,
          )
        : [...cart!.matched_items, buildManual(candidate, ctx.query)];

    saveItems(next, () => {
      setCtx(null);
      setResults([]);
      setSearchErr(undefined);
    });
  }

  function search() {
    if (!ctx) return;

    setSearchErr(undefined);
    startSearch(async () => {
      const result = await searchRetailerProductsAction(
        cart!.retailer,
        ctx.query,
      );
      if (result.error) {
        setSearchErr(result.error);
        return;
      }

      setResults(result.results ?? []);
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-stretch justify-center p-0 sm:items-center sm:p-6">
      <div
        className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-background shadow-2xl sm:h-auto sm:max-h-[90vh] sm:max-w-5xl sm:rounded-2xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-outline-variant/30 px-4 py-4 sm:items-center sm:px-6">
          <div className="min-w-0">
            <p className="text-label-sm uppercase tracking-wide text-primary">
              {cart.retailer}
            </p>
            <h2 className="mt-1 truncate text-title-lg text-on-surface sm:text-headline-sm">
              Shopping Cart
            </h2>
            <p className="mt-0.5 text-body-sm text-outline">
              {lineCount} items - updated {fmtDate(updatedAt)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {isSaving && (
              <span className="rounded-full bg-surface-container-low px-3 py-2 text-label-sm text-outline">
                Saving...
              </span>
            )}
            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant transition-colors hover:bg-surface-container-low"
              aria-label="Close shopping cart"
            >
              <span className="material-symbols-outlined text-[20px] text-on-surface-variant">
                close
              </span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-4 px-4 pb-28 pt-4 sm:gap-6 sm:p-6 lg:flex-row">
            <div className="flex-1 space-y-3">
              {saveErr && (
                <div className="rounded-xl bg-error-container p-3 text-body-sm text-on-error-container">
                  {saveErr}
                </div>
              )}

              {cart.matched_items.map((item, index) => {
                const product = item.selected_product;
                const label =
                  item.kind === "manual_item"
                    ? (item.manual_label ?? item.canonical_ingredient)
                    : item.canonical_ingredient;
                const isDeleting = deletingIndex === index;

                return (
                  <div
                    key={`${item.canonical_ingredient}-${index}`}
                    className={`rounded-2xl border bg-white p-3 shadow-sm transition-opacity sm:p-4 ${
                      isDeleting ? "opacity-40" : ""
                    } ${
                      item.kind === "manual_item"
                        ? "border-tertiary-container/50"
                        : "border-outline-variant/30"
                    }`}
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-surface-container">
                        {product?.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.image_url}
                            alt={product.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <span className="material-symbols-outlined text-outline-variant">
                              grocery
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="line-clamp-2 text-label-lg leading-snug text-on-surface">
                              {product?.title ?? label}
                            </p>
                            {product?.brand && (
                              <p className="mt-0.5 text-label-sm text-outline">
                                {product.brand}
                              </p>
                            )}
                            {!product && (
                              <p className="mt-1 flex items-center gap-1 text-label-sm text-tertiary">
                                <span className="material-symbols-outlined text-[14px]">
                                  info
                                </span>
                                No match yet
                              </p>
                            )}
                          </div>
                          {item.estimated_line_total !== undefined && (
                            <p className="shrink-0 text-label-lg text-primary">
                              {fmt$(item.estimated_line_total)}
                            </p>
                          )}
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div className="flex min-w-0 flex-wrap items-center gap-3">
                            {product && (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => adjustQty(index, -1)}
                                  disabled={isSaving}
                                  className="flex h-7 w-7 items-center justify-center rounded-full border border-outline-variant font-bold text-on-surface-variant transition-colors enabled:hover:bg-surface-container-low disabled:opacity-40"
                                  aria-label={`Decrease ${label} quantity`}
                                >
                                  -
                                </button>
                                <span className="w-5 text-center text-label-md text-on-surface">
                                  {item.selected_quantity ?? 1}
                                </span>
                                <button
                                  onClick={() => adjustQty(index, 1)}
                                  disabled={isSaving}
                                  className="flex h-7 w-7 items-center justify-center rounded-full border border-outline-variant font-bold text-on-surface-variant transition-colors enabled:hover:bg-surface-container-low disabled:opacity-40"
                                  aria-label={`Increase ${label} quantity`}
                                >
                                  +
                                </button>
                              </div>
                            )}
                            <button
                              onClick={() => replaceItem(index)}
                              className="text-label-sm text-primary hover:underline"
                            >
                              Replace
                            </button>
                            {item.kind === "manual_item" && (
                              <span className="rounded-full bg-tertiary-container/30 px-2 py-0.5 text-label-sm text-tertiary">
                                Manual
                              </span>
                            )}
                          </div>

                          <button
                            onClick={() => deleteAndSave(index)}
                            disabled={isDeleting || isSaving}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-outline transition-colors hover:bg-error-container/30 hover:text-error disabled:opacity-30"
                            aria-label="Remove item"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              delete
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              <button
                onClick={() => {
                  setCtx({ mode: "add", query: "" });
                  setResults([]);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-outline-variant py-3 text-label-lg text-outline transition-colors hover:border-primary hover:text-primary"
              >
                <span className="material-symbols-outlined">add</span>
                Add item manually
              </button>
            </div>

            <div className="space-y-4 lg:w-72 lg:flex-shrink-0">
              <div className="rounded-2xl border border-outline-variant/30 bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-label-lg text-primary">
                  Order Summary
                </h3>
                <div className="space-y-2 border-b border-outline-variant/20 pb-4">
                  <div className="flex justify-between text-body-sm text-on-surface-variant">
                    <span>Subtotal ({lineCount} items)</span>
                    <span>{fmt$(total)}</span>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-headline-sm text-on-surface">
                    Total
                  </span>
                  <span className="text-headline-sm text-primary">
                    {fmt$(total)}
                  </span>
                </div>
                {cart.id && (
                  <Link
                    href={`/shopping/checkout/${cart.id}`}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#ffb38e] px-5 py-3 text-label-lg font-semibold text-[#6d391d] transition-colors hover:bg-[#ffcfb6]"
                  >
                    Checkout
                    <span className="material-symbols-outlined text-[18px]">
                      arrow_forward
                    </span>
                  </Link>
                )}
              </div>

              {ctx && (
                <div className="space-y-4 rounded-2xl border border-outline-variant/30 bg-white p-5 shadow-sm">
                  <div>
                    <h4 className="text-label-lg text-on-surface">
                      {ctx.mode === "replace" ? "Replace item" : "Add item"}
                    </h4>
                    <p className="mt-0.5 text-body-sm text-outline">
                      Search {cart.retailer} products
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={ctx.query}
                      onChange={(event) =>
                        setCtx({ ...ctx, query: event.target.value })
                      }
                      onKeyDown={(event) => event.key === "Enter" && search()}
                      placeholder="e.g. basmati rice"
                      className="flex-1 rounded-xl border border-outline-variant/50 bg-surface-container-low px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <button
                      onClick={search}
                      disabled={isSearching}
                      className="rounded-xl bg-primary px-3 py-2 text-label-sm text-on-primary transition-colors hover:bg-on-primary-container disabled:opacity-50"
                    >
                      {isSearching ? "..." : "Search"}
                    </button>
                  </div>
                  {searchErr && (
                    <p className="text-body-sm text-error">{searchErr}</p>
                  )}
                  {results.length > 0 && (
                    <div className="max-h-64 space-y-2 overflow-y-auto">
                      {results.map((candidate) => (
                        <div
                          key={candidate.product_id}
                          className="flex items-center gap-3 rounded-xl bg-surface-container-low p-3 transition-colors hover:bg-secondary-container/40"
                        >
                          <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-surface-container">
                            {candidate.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={candidate.image_url}
                                alt={candidate.title}
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-label-md text-on-surface">
                              {candidate.title}
                            </p>
                            <p className="text-label-sm text-primary">
                              {fmt$(candidate.price)}
                            </p>
                          </div>
                          <button
                            onClick={() => selectCandidate(candidate)}
                            className="rounded-full border border-primary px-2 py-1 text-label-sm text-primary transition-colors hover:bg-primary-fixed-dim/20"
                          >
                            Pick
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setCtx(null);
                      setResults([]);
                    }}
                    className="text-body-sm text-outline hover:text-on-surface-variant"
                  >
                    Cancel
                  </button>
                </div>
              )}

              <details className="overflow-hidden rounded-2xl border border-outline-variant/30 bg-white shadow-sm">
                <summary className="flex cursor-pointer select-none items-center justify-between p-5 text-label-lg text-on-surface-variant">
                  <span>Ingredient Overview</span>
                  <span className="text-label-md text-primary">
                    {cart.overview.length} items
                  </span>
                </summary>
                <div className="space-y-2 border-t border-outline-variant/20 px-5 pb-5 pt-3">
                  {cart.overview.map((ingredient) => (
                    <div
                      key={`${ingredient.canonical_ingredient}-${ingredient.unit}`}
                      className="flex justify-between text-body-sm"
                    >
                      <span className="text-on-surface">
                        {ingredient.canonical_ingredient}
                      </span>
                      <span className="text-outline">
                        {ingredient.total_amount} {ingredient.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
