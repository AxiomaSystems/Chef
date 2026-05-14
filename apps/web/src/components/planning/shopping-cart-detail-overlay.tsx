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
    items.reduce((s, i) => s + (i.estimated_line_total ?? 0), 0).toFixed(2),
  );
}
function buildReplaced(
  cur: MatchedIngredientProduct,
  cand: ProductCandidate,
  query: string,
): MatchedIngredientProduct {
  return {
    ...cur,
    kind: cur.kind ?? "ingredient_match",
    walmart_search_query: query.trim() || cur.walmart_search_query,
    selected_product: cand,
    selected_quantity: 1,
    estimated_line_total: Number(cand.price.toFixed(2)),
    notes: cur.kind === "manual_item" ? cur.notes : "Replaced manually",
  };
}
function buildManual(
  cand: ProductCandidate,
  query: string,
): MatchedIngredientProduct {
  const label = query.trim() || cand.title;
  return {
    kind: "manual_item",
    canonical_ingredient: label,
    manual_label: label,
    needed_amount: 1,
    needed_unit: "unit",
    walmart_search_query: label,
    selected_product: cand,
    selected_quantity: 1,
    estimated_line_total: Number(cand.price.toFixed(2)),
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
  const [editing, setEditing] = useState(false);
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
    (cart as unknown as { updated_at?: string }).updated_at ??
    cart.created_at ??
    new Date().toISOString();

  function replaceItem(i: number) {
    const item = cart!.matched_items[i];
    setCtx({
      mode: "replace",
      index: i,
      query:
        item.walmart_search_query ||
        item.manual_label ||
        item.canonical_ingredient,
    });
    setResults([]);
    setSearchErr(undefined);
  }
  function deleteLine(i: number) {
    const next = cart!.matched_items.filter((_, idx) => idx !== i);
    setCart({
      ...cart!,
      matched_items: next,
      estimated_subtotal: subtotal(next),
    });
    return next;
  }
  function deleteAndSave(i: number) {
    if (!cart?.id) return;
    setDeletingIndex(i);
    setSaveErr(undefined);
    const next = deleteLine(i);
    startSave(async () => {
      const res = await updateShoppingCartAction(cart.id ?? "", next);
      setDeletingIndex(null);
      if (res.error) setSaveErr(res.error);
    });
  }
  function adjustQty(i: number, delta: number) {
    const next = cart!.matched_items.map((item, idx) => {
      if (idx !== i || !item.selected_product) return item;
      const qty = Math.max(1, (item.selected_quantity ?? 1) + delta);
      return {
        ...item,
        selected_quantity: qty,
        estimated_line_total: Number(
          (item.selected_product.price * qty).toFixed(2),
        ),
      };
    });
    setCart({
      ...cart!,
      matched_items: next,
      estimated_subtotal: subtotal(next),
    });
  }
  function selectCandidate(cand: ProductCandidate) {
    if (!ctx || !cart) return;
    const next =
      ctx.mode === "replace"
        ? cart.matched_items.map((item, i) =>
            i === ctx.index ? buildReplaced(item, cand, ctx.query) : item,
          )
        : [...cart.matched_items, buildManual(cand, ctx.query)];
    setCart({
      ...cart,
      matched_items: next,
      estimated_subtotal: subtotal(next),
    });
    setCtx(null);
    setResults([]);
    setSearchErr(undefined);
  }
  function search() {
    if (!ctx || !cart) return;
    setSearchErr(undefined);
    startSearch(async () => {
      const res = await searchRetailerProductsAction(cart.retailer, ctx.query);
      if (res.error) {
        setSearchErr(res.error);
        return;
      }
      setResults(res.results ?? []);
    });
  }
  function saveChanges() {
    if (!cart?.id) {
      setSaveErr("Cart not found.");
      return;
    }
    setSaveErr(undefined);
    startSave(async () => {
      const res = await updateShoppingCartAction(
        cart.id ?? "",
        cart.matched_items,
      );
      if (res.error) {
        setSaveErr(res.error);
        return;
      }
      setEditing(false);
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-stretch justify-center p-0 sm:items-center sm:p-6">
      <div
        className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-background shadow-2xl sm:h-auto sm:max-h-[90vh] sm:max-w-5xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-outline-variant/30 px-4 py-4 sm:items-center sm:px-6">
          <div className="min-w-0">
            <p className="text-label-sm text-primary uppercase tracking-wide">
              {cart.retailer}
            </p>
            <h2 className="mt-1 truncate text-title-lg text-on-surface sm:text-headline-sm">
              Shopping Cart
            </h2>
            <p className="text-body-sm text-outline mt-0.5">
              {lineCount} items · updated {fmtDate(updatedAt)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {editing ? (
              <>
                <button
                  onClick={() => {
                    setEditing(false);
                    setCart(shoppingCart);
                    setCtx(null);
                    setResults([]);
                  }}
                  className="hidden rounded-full border border-outline-variant px-4 py-2 text-label-md text-on-surface-variant transition-colors hover:bg-surface-container-low sm:inline-flex"
                >
                  Cancel
                </button>
                <button
                  onClick={saveChanges}
                  disabled={isSaving}
                  className="hidden rounded-full bg-primary px-4 py-2 text-label-md text-on-primary transition-colors hover:bg-on-primary-container disabled:opacity-50 sm:inline-flex"
                >
                  {isSaving ? "Saving…" : "Save Changes"}
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="rounded-full border border-outline-variant px-3 py-2 text-label-sm leading-tight text-on-surface-variant transition-colors hover:bg-surface-container-low sm:px-4 sm:text-label-md"
              >
                Edit Cart
              </button>
            )}
            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant transition-colors hover:bg-surface-container-low"
              aria-label="Close shopping cart"
            >
              <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
                close
              </span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-4 px-4 pb-28 pt-4 sm:gap-6 sm:p-6 lg:flex-row">
            {editing && (
              <div className="grid grid-cols-2 gap-2 sm:hidden">
                <button
                  onClick={() => {
                    setEditing(false);
                    setCart(shoppingCart);
                    setCtx(null);
                    setResults([]);
                  }}
                  className="min-h-11 rounded-full border border-outline-variant px-4 py-2 text-label-md text-on-surface-variant"
                >
                  Cancel
                </button>
                <button
                  onClick={saveChanges}
                  disabled={isSaving}
                  className="min-h-11 rounded-full bg-primary px-4 py-2 text-label-md text-on-primary disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            )}

            {/* Items list */}
            <div className="flex-1 space-y-3">
              {saveErr && (
                <div className="p-3 rounded-xl bg-error-container text-on-error-container text-body-sm">
                  {saveErr}
                </div>
              )}

              {cart.matched_items.map((item, i) => {
                const prod = item.selected_product;
                const label =
                  item.kind === "manual_item"
                    ? (item.manual_label ?? item.canonical_ingredient)
                    : item.canonical_ingredient;
                const isDeleting = deletingIndex === i;

                return (
                  <div
                    key={`${item.canonical_ingredient}-${i}`}
                    className={`rounded-2xl border bg-white p-3 shadow-sm transition-opacity sm:p-4 ${isDeleting ? "opacity-40" : ""} ${item.kind === "manual_item" ? "border-tertiary-container/50" : "border-outline-variant/30"}`}
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      {/* Product image */}
                      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-surface-container">
                        {prod?.image_url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={prod.image_url}
                            alt={prod.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-outline-variant">
                              grocery
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Name + price row */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="line-clamp-2 text-label-lg leading-snug text-on-surface">
                              {prod?.title ?? label}
                            </p>
                            {prod?.brand && (
                              <p className="text-label-sm text-outline mt-0.5">
                                {prod.brand}
                              </p>
                            )}
                            {!prod && (
                              <p className="text-label-sm text-tertiary mt-1 flex items-center gap-1">
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

                        {/* Controls row */}
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div className="flex min-w-0 flex-wrap items-center gap-3">
                            {/* Quantity stepper — always visible when product matched */}
                            {prod && (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => adjustQty(i, -1)}
                                  disabled={!editing}
                                  className="w-7 h-7 rounded-full border border-outline-variant flex items-center justify-center text-on-surface-variant font-bold transition-colors enabled:hover:bg-surface-container-low disabled:opacity-40"
                                >
                                  −
                                </button>
                                <span className="text-label-md text-on-surface w-5 text-center">
                                  {item.selected_quantity ?? 1}
                                </span>
                                <button
                                  onClick={() => adjustQty(i, 1)}
                                  disabled={!editing}
                                  className="w-7 h-7 rounded-full border border-outline-variant flex items-center justify-center text-on-surface-variant font-bold transition-colors enabled:hover:bg-surface-container-low disabled:opacity-40"
                                >
                                  +
                                </button>
                              </div>
                            )}
                            {editing && (
                              <button
                                onClick={() => replaceItem(i)}
                                className="text-label-sm text-primary hover:underline"
                              >
                                Replace
                              </button>
                            )}
                            {item.kind === "manual_item" && (
                              <span className="text-label-sm text-tertiary bg-tertiary-container/30 px-2 py-0.5 rounded-full">
                                Manual
                              </span>
                            )}
                          </div>

                          {/* Delete icon — always visible */}
                          <button
                            onClick={() => deleteAndSave(i)}
                            disabled={isDeleting}
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

              {editing && (
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
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4 lg:w-72 lg:flex-shrink-0">
              {/* Order summary */}
              <div className="bg-white rounded-2xl border border-outline-variant/30 p-5 shadow-sm">
                <h3 className="text-label-lg text-primary mb-4">
                  Order Summary
                </h3>
                <div className="space-y-2 pb-4 border-b border-outline-variant/20">
                  <div className="flex justify-between text-body-sm text-on-surface-variant">
                    <span>Subtotal ({lineCount} items)</span>
                    <span>{fmt$(total)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-3">
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
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#f4be6b] px-5 py-3 text-label-lg font-semibold text-[#351800] transition-colors hover:bg-[#f4be6b]"
                  >
                    Checkout
                    <span className="material-symbols-outlined text-[18px]">
                      arrow_forward
                    </span>
                  </Link>
                )}
              </div>

              {/* Product search panel */}
              {ctx && (
                <div className="bg-white rounded-2xl border border-outline-variant/30 p-5 shadow-sm space-y-4">
                  <div>
                    <h4 className="text-label-lg text-on-surface">
                      {ctx.mode === "replace" ? "Replace item" : "Add item"}
                    </h4>
                    <p className="text-body-sm text-outline mt-0.5">
                      Search {cart.retailer} products
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={ctx.query}
                      onChange={(e) =>
                        setCtx({ ...ctx, query: e.target.value })
                      }
                      onKeyDown={(e) => e.key === "Enter" && search()}
                      placeholder="e.g. basmati rice"
                      className="flex-1 bg-surface-container-low border border-outline-variant/50 rounded-xl px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <button
                      onClick={search}
                      disabled={isSearching}
                      className="px-3 py-2 bg-primary text-on-primary rounded-xl text-label-sm hover:bg-on-primary-container disabled:opacity-50 transition-colors"
                    >
                      {isSearching ? "…" : "Search"}
                    </button>
                  </div>
                  {searchErr && (
                    <p className="text-body-sm text-error">{searchErr}</p>
                  )}
                  {results.length > 0 && (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {results.map((c) => (
                        <div
                          key={c.product_id}
                          className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low hover:bg-secondary-container/40 transition-colors"
                        >
                          <div className="w-10 h-10 rounded-lg bg-surface-container overflow-hidden flex-shrink-0">
                            {c.image_url ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={c.image_url}
                                alt={c.title}
                                className="w-full h-full object-cover"
                              />
                            ) : null}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-label-md text-on-surface truncate">
                              {c.title}
                            </p>
                            <p className="text-label-sm text-primary">
                              {fmt$(c.price)}
                            </p>
                          </div>
                          <button
                            onClick={() => selectCandidate(c)}
                            className="text-label-sm text-primary border border-primary px-2 py-1 rounded-full hover:bg-primary-fixed-dim/20 transition-colors"
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

              {/* Ingredient overview */}
              <details className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden">
                <summary className="p-5 cursor-pointer text-label-lg text-on-surface-variant flex items-center justify-between select-none">
                  <span>Ingredient Overview</span>
                  <span className="text-label-md text-primary">
                    {cart.overview.length} items
                  </span>
                </summary>
                <div className="px-5 pb-5 space-y-2 border-t border-outline-variant/20 pt-3">
                  {cart.overview.map((ing) => (
                    <div
                      key={`${ing.canonical_ingredient}-${ing.unit}`}
                      className="flex justify-between text-body-sm"
                    >
                      <span className="text-on-surface">
                        {ing.canonical_ingredient}
                      </span>
                      <span className="text-outline">
                        {ing.total_amount} {ing.unit}
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
