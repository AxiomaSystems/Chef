"use client";

import type {
  MatchedIngredientProduct,
  ProductCandidate,
  ShoppingCart,
} from "@cart/shared";
import { useMemo, useState, useTransition } from "react";
import {
  searchRetailerProductsAction,
  updateShoppingCartAction,
} from "@/app/home-actions";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatAmountLabel(amount?: number, unit?: string) {
  if (amount === undefined || amount === null) {
    return null;
  }

  return [amount, unit].filter(Boolean).join(" ");
}

function calculateSubtotal(items: MatchedIngredientProduct[]) {
  return Number(
    items.reduce((sum, item) => sum + (item.estimated_line_total ?? 0), 0).toFixed(2),
  );
}

function formatRetailerName(retailer: string) {
  if (!retailer) {
    return "Retailer";
  }

  return retailer.charAt(0).toUpperCase() + retailer.slice(1);
}

function buildReplacedItem(
  currentItem: MatchedIngredientProduct,
  candidate: ProductCandidate,
  query: string,
): MatchedIngredientProduct {
  const normalizedQuery = query.trim() || currentItem.walmart_search_query;

  return {
    ...currentItem,
    kind: currentItem.kind ?? "ingredient_match",
    walmart_search_query: normalizedQuery,
    selected_product: candidate,
    selected_quantity: 1,
    estimated_line_total: Number(candidate.price.toFixed(2)),
    notes:
      currentItem.kind === "manual_item"
        ? currentItem.notes
        : "Replaced manually",
  };
}

function buildManualItem(
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

type SearchContext =
  | {
      mode: "replace";
      index: number;
      query: string;
    }
  | {
      mode: "add";
      query: string;
    };

export function ShoppingCartDetailOverlay(props: {
  shoppingCart: ShoppingCart | null;
  onClose: () => void;
}) {
  const { onClose, shoppingCart } = props;
  const [currentShoppingCart, setCurrentShoppingCart] =
    useState<ShoppingCart | null>(shoppingCart);
  const [isEditing, setEditing] = useState(false);
  const [searchContext, setSearchContext] = useState<SearchContext | null>(null);
  const [results, setResults] = useState<ProductCandidate[]>([]);
  const [searchError, setSearchError] = useState<string | undefined>();
  const [saveError, setSaveError] = useState<string | undefined>();
  const [isSearching, startSearching] = useTransition();
  const [isSaving, startSaving] = useTransition();
  const [showOverview, setShowOverview] = useState(false);

  const subtotal = useMemo(
    () =>
      currentShoppingCart
        ? calculateSubtotal(currentShoppingCart.matched_items)
        : 0,
    [currentShoppingCart],
  );

  if (!currentShoppingCart) {
    return null;
  }

  const updatedAt =
    currentShoppingCart.updated_at ??
    currentShoppingCart.created_at ??
    new Date().toISOString();
  const lineCount = currentShoppingCart.matched_items.length;
  const externalHandoffUrl = currentShoppingCart.external_url;
  const hasExternalHandoff = Boolean(externalHandoffUrl);
  const isProductSearchSupported = currentShoppingCart.retailer !== "instacart";

  function handleReplace(index: number) {
    if (!currentShoppingCart) {
      return;
    }

    const item = currentShoppingCart.matched_items[index];
    setSearchContext({
      mode: "replace",
      index,
      query: item.walmart_search_query || item.manual_label || item.canonical_ingredient,
    });
    setResults([]);
    setSearchError(undefined);
  }

  function handleAddItem() {
    setSearchContext({
      mode: "add",
      query: "",
    });
    setResults([]);
    setSearchError(undefined);
  }

  function handleDeleteLine(index: number) {
    if (!currentShoppingCart) {
      return;
    }

    const nextItems = currentShoppingCart.matched_items.filter(
      (_item, itemIndex) => itemIndex !== index,
    );

    setCurrentShoppingCart({
      ...currentShoppingCart,
      matched_items: nextItems,
      estimated_subtotal: calculateSubtotal(nextItems),
    });
  }

  function handleAdjustLineQuantity(index: number, delta: number) {
    if (!currentShoppingCart) {
      return;
    }

    const nextItems = currentShoppingCart.matched_items.map((item, itemIndex) => {
      if (itemIndex !== index || !item.selected_product) {
        return item;
      }

      const nextQuantity = Math.max(1, (item.selected_quantity ?? 1) + delta);
      return {
        ...item,
        selected_quantity: nextQuantity,
        estimated_line_total: Number(
          (item.selected_product.price * nextQuantity).toFixed(2),
        ),
      };
    });

    setCurrentShoppingCart({
      ...currentShoppingCart,
      matched_items: nextItems,
      estimated_subtotal: calculateSubtotal(nextItems),
    });
  }

  function handleSelectCandidate(candidate: ProductCandidate) {
    if (!searchContext || !currentShoppingCart) {
      return;
    }

    const nextItems =
      searchContext.mode === "replace"
        ? currentShoppingCart.matched_items.map((item, index) =>
            index === searchContext.index
              ? buildReplacedItem(item, candidate, searchContext.query)
              : item,
          )
        : [
            ...currentShoppingCart.matched_items,
            buildManualItem(candidate, searchContext.query),
          ];

    setCurrentShoppingCart({
      ...currentShoppingCart,
      matched_items: nextItems,
      estimated_subtotal: calculateSubtotal(nextItems),
    });
    setSearchContext(null);
    setResults([]);
    setSearchError(undefined);
  }

  function handleSearch() {
    if (!searchContext || !currentShoppingCart) {
      return;
    }

    const retailer = currentShoppingCart.retailer;
    const query = searchContext.query;
    setSearchError(undefined);
    startSearching(async () => {
      const response = await searchRetailerProductsAction(retailer, query);

      if (response.error) {
        setSearchError(response.error);
        return;
      }

      setResults(response.results ?? []);
    });
  }

  function handleSaveChanges() {
    if (!currentShoppingCart?.id) {
      setSaveError("Shopping cart not found for update.");
      return;
    }

    setSaveError(undefined);
    startSaving(async () => {
      const response = await updateShoppingCartAction(
        currentShoppingCart.id ?? "",
        currentShoppingCart.matched_items,
      );

      if (response.error || !response.shoppingCart) {
        setSaveError(
          response.error ?? "Unable to update this shopping cart right now.",
        );
        return;
      }

      setCurrentShoppingCart(response.shoppingCart);
      setEditing(false);
      setSearchContext(null);
      setResults([]);
    });
  }

  return (
    <div className="fixed inset-0 z-[60] bg-[rgba(24,35,29,0.66)] p-4 backdrop-blur-sm sm:p-6">
      <div className="mx-auto flex h-full w-full max-w-7xl flex-col overflow-hidden rounded-[2rem] border border-[color:var(--line)] bg-[color:var(--paper)] shadow-[0_28px_90px_rgba(10,18,13,0.28)]">
        <div className="flex items-center justify-between gap-4 border-b border-[color:var(--line)] px-5 py-4 sm:px-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--olive)]">
              Shopping cart
            </p>
            <h2 className="mt-2 font-display text-4xl leading-[0.94] text-[color:var(--forest-strong)]">
              Retailer output
            </h2>
            <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
              {currentShoppingCart.retailer} / {lineCount} lines / updated{" "}
              {formatDate(updatedAt)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setCurrentShoppingCart(shoppingCart);
                    setSearchContext(null);
                    setResults([]);
                    setSearchError(undefined);
                    setSaveError(undefined);
                  }}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-[color:var(--line)] bg-white/74 px-4 text-sm font-semibold text-[color:var(--forest-strong)] transition hover:bg-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-[color:var(--forest)] px-4 text-sm font-semibold text-[color:var(--paper)] transition hover:bg-[color:var(--forest-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : "Save changes"}
                </button>
              </>
            ) : (
              <>
                {hasExternalHandoff ? (
                  <a
                    href={externalHandoffUrl ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-[color:var(--forest)] px-4 text-sm font-semibold text-[color:var(--paper)] transition hover:bg-[color:var(--forest-strong)]"
                  >
                    Open in {formatRetailerName(currentShoppingCart.retailer)}
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-[color:var(--line)] bg-white/74 px-4 text-sm font-semibold text-[color:var(--forest-strong)] transition hover:bg-white"
                >
                  Edit shopping cart
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--line)] bg-white/74 text-xl text-[color:var(--forest-strong)] transition hover:bg-white"
              aria-label="Close shopping cart detail"
            >
              x
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {saveError ? (
            <p className="mb-4 rounded-2xl border border-[color:var(--clay)]/20 bg-[color:var(--clay)]/10 px-4 py-3 text-sm text-[color:var(--clay)]">
              {saveError}
            </p>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-[1.45fr_0.92fr]">
            <section className="rounded-[1.6rem] border border-[color:var(--line)] bg-white/52 p-5 sm:p-6">
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[color:var(--line)] pb-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--olive)]">
                    Matched lines
                  </p>
                  <h3 className="mt-2 font-display text-[2.1rem] leading-[0.94] text-[color:var(--forest-strong)]">
                    What to buy
                  </h3>
                </div>
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--ink-soft)]">
                    Estimated subtotal
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-[color:var(--forest-strong)]">
                    {formatMoney(subtotal)}
                  </p>
                </div>
              </div>

              <ul className="grid gap-3 pt-5">
                {currentShoppingCart.matched_items.map((item, index) => {
                  const selectedProduct = item.selected_product;
                  const selectedQuantity =
                    item.selected_quantity && item.selected_quantity > 1
                      ? `x${item.selected_quantity}`
                      : null;
                  const lineTitle =
                    item.kind === "manual_item"
                      ? item.manual_label ?? item.canonical_ingredient
                      : item.canonical_ingredient;

                  return (
                    <li
                      key={`${item.kind ?? "ingredient_match"}-${item.canonical_ingredient}-${index}`}
                      className={`rounded-[1.2rem] border p-4 ${
                        item.kind === "manual_item"
                          ? "border-[color:var(--clay)]/20 bg-[color:var(--clay)]/6"
                          : "border-[color:var(--line)] bg-[rgba(255,255,255,0.74)]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-base font-semibold text-[color:var(--forest-strong)]">
                              {lineTitle}
                            </p>
                            {item.kind === "manual_item" ? (
                              <span className="rounded-full border border-[color:var(--clay)]/20 bg-[color:var(--clay)]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--clay)]">
                                Manual item
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm text-[color:var(--ink-soft)]">
                            {item.kind === "manual_item"
                              ? "Added manually"
                              : `Need ${item.needed_amount} ${item.needed_unit}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.estimated_line_total !== undefined ? (
                            <p className="text-sm font-semibold text-[color:var(--forest-strong)]">
                              {formatMoney(item.estimated_line_total)}
                            </p>
                          ) : null}
                          {isEditing ? (
                            <>
                              {isProductSearchSupported ? (
                                <button
                                  type="button"
                                  onClick={() => handleReplace(index)}
                                  className="rounded-full border border-[color:var(--line)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--olive)] transition hover:bg-white"
                                >
                                  Replace
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => handleDeleteLine(index)}
                                className="rounded-full border border-[color:var(--clay)]/20 bg-[color:var(--clay)]/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--clay)] transition hover:bg-[color:var(--clay)]/12"
                              >
                                Delete
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>

                      {selectedProduct ? (
                        <div className="mt-4 grid gap-3 sm:grid-cols-[auto_1fr]">
                          <div className="h-20 w-20 overflow-hidden rounded-[1rem] border border-[color:var(--line)] bg-[color:var(--paper)]/72">
                            {selectedProduct.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={selectedProduct.image_url}
                                alt={selectedProduct.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full bg-[linear-gradient(135deg,rgba(115,135,101,0.12),rgba(245,240,228,0.44)),radial-gradient(circle_at_top_left,rgba(161,77,49,0.1),transparent_34%)]" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-[color:var(--forest-strong)]">
                                  {selectedProduct.title}
                                </p>
                                {selectedProduct.brand ? (
                                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[color:var(--ink-soft)]">
                                    {selectedProduct.brand}
                                  </p>
                                ) : null}
                              </div>
                              <span className="rounded-full border border-[color:var(--line)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--olive)]">
                                {formatMoney(selectedProduct.price)}
                                {selectedQuantity ? ` ${selectedQuantity}` : ""}
                              </span>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                              {selectedProduct.quantity_text ? (
                                <span className="rounded-full border border-[color:var(--line)] bg-[color:var(--paper)]/72 px-3 py-1 text-[11px] font-medium text-[color:var(--ink-soft)]">
                                  {selectedProduct.quantity_text}
                                </span>
                              ) : null}
                              {formatAmountLabel(
                                item.matched_amount,
                                item.matched_unit,
                              ) ? (
                                <span className="rounded-full border border-[color:var(--line)] bg-[color:var(--paper)]/72 px-3 py-1 text-[11px] font-medium text-[color:var(--ink-soft)]">
                                  Covers{" "}
                                  {formatAmountLabel(
                                    item.matched_amount,
                                    item.matched_unit,
                                  )}
                                </span>
                              ) : null}
                              {item.purchase_unit_hint ? (
                                <span className="rounded-full border border-[color:var(--line)] bg-[color:var(--paper)]/72 px-3 py-1 text-[11px] font-medium text-[color:var(--ink-soft)]">
                                  Buy by {item.purchase_unit_hint}
                                </span>
                              ) : null}
                              {item.fallback_used ? (
                                <span className="rounded-full border border-[color:var(--clay)]/20 bg-[color:var(--clay)]/10 px-3 py-1 text-[11px] font-medium text-[color:var(--clay)]">
                                  Fallback
                                </span>
                              ) : null}
                            </div>

                            {isEditing ? (
                              <div className="mt-3 flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleAdjustLineQuantity(index, -1)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--line)] bg-white/80 text-sm font-semibold text-[color:var(--forest-strong)] transition hover:bg-white"
                                  aria-label={`Decrease ${lineTitle} quantity`}
                                >
                                  -
                                </button>
                                <span className="min-w-6 text-center text-sm font-semibold text-[color:var(--forest-strong)]">
                                  {item.selected_quantity ?? 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleAdjustLineQuantity(index, 1)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--line)] bg-white/80 text-sm font-semibold text-[color:var(--forest-strong)] transition hover:bg-white"
                                  aria-label={`Increase ${lineTitle} quantity`}
                                >
                                  +
                                </button>
                              </div>
                            ) : null}

                            {item.notes ? (
                              <p className="mt-3 text-sm leading-6 text-[color:var(--ink-soft)]">
                                {item.notes}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 rounded-[1rem] border border-dashed border-[color:var(--line)] bg-[color:var(--paper)]/52 px-4 py-3 text-sm text-[color:var(--ink-soft)]">
                          No product match yet. Query used: {item.walmart_search_query}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>

            <aside className="grid auto-rows-min content-start gap-4 self-start">
              <section className="rounded-[1.6rem] border border-[color:var(--line)] bg-white/52 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--olive)]">
                      Snapshot
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">
                        {isEditing
                        ? isProductSearchSupported
                          ? "Replace ingredient matches or add manual lines, then save the shopping cart."
                          : "Remove lines you do not want, then save the hosted handoff snapshot."
                        : hasExternalHandoff
                          ? "This shopping cart has a retailer handoff URL. Open it to continue shopping on the retailer surface."
                          : "This shopping cart is persisted. Edit only when you want to correct or add retailer products manually."}
                    </p>
                  </div>
                  {isEditing && isProductSearchSupported ? (
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[color:var(--forest)] text-xl font-semibold text-[color:var(--paper)] transition hover:bg-[color:var(--forest-strong)]"
                      aria-label="Add manual shopping cart item"
                    >
                      +
                    </button>
                  ) : null}
                </div>

                <div className="mt-4 grid auto-rows-min gap-4 content-start">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--ink-soft)]">
                      Retailer
                    </p>
                    <p className="mt-1 text-base font-semibold text-[color:var(--forest-strong)]">
                      {currentShoppingCart.retailer}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--ink-soft)]">
                      Estimated subtotal
                    </p>
                    <p className="mt-1 text-base font-semibold text-[color:var(--forest-strong)]">
                      {formatMoney(subtotal)}
                    </p>
                  </div>
                  {hasExternalHandoff ? (
                    <a
                      href={externalHandoffUrl ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-11 items-center justify-center rounded-full bg-[color:var(--forest)] px-4 text-sm font-semibold text-[color:var(--paper)] transition hover:bg-[color:var(--forest-strong)]"
                    >
                      Open in {formatRetailerName(currentShoppingCart.retailer)}
                    </a>
                  ) : null}
                  <div className="relative grid grid-cols-2 gap-3">
                    <div className="rounded-[1rem] border border-[color:var(--line)] bg-[rgba(255,255,255,0.72)] px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--ink-soft)]">
                        Cart lines
                      </p>
                      <p className="mt-1 text-lg font-semibold text-[color:var(--forest-strong)]">
                        {lineCount}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowOverview((current) => !current)}
                      className="rounded-[1rem] border border-[color:var(--line)] bg-[rgba(255,255,255,0.72)] px-4 py-3 text-left transition hover:bg-white"
                    >
                      <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--ink-soft)]">
                        Ingredient source
                      </p>
                      <p className="mt-1 text-lg font-semibold text-[color:var(--forest-strong)]">
                        {currentShoppingCart.overview.length}
                      </p>
                    </button>

                    {showOverview ? (
                      <div className="absolute right-0 top-[calc(100%+0.65rem)] z-10 w-[calc(50%-0.35rem)] min-w-[14rem] rounded-[1.1rem] border border-[color:var(--line)] bg-[color:var(--paper)] p-3 shadow-[0_20px_50px_rgba(10,18,13,0.18)]">
                        <div className="mb-3 flex items-center justify-between gap-3 border-b border-[color:var(--line)] pb-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--olive)]">
                            Ingredient source
                          </p>
                          <span className="rounded-full border border-[color:var(--line)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--ink-soft)]">
                            {currentShoppingCart.overview.length} items
                          </span>
                        </div>

                        <ul className="grid max-h-72 gap-2 overflow-y-auto pr-1">
                          {currentShoppingCart.overview.map((ingredient) => (
                            <li
                              key={`${ingredient.canonical_ingredient}-${ingredient.unit}`}
                              className="rounded-[0.95rem] border border-[color:var(--line)] bg-[rgba(255,255,255,0.72)] px-3 py-2"
                            >
                              <p className="text-sm font-semibold text-[color:var(--forest-strong)]">
                                {ingredient.canonical_ingredient}
                              </p>
                              <p className="mt-1 text-xs leading-5 text-[color:var(--ink-soft)]">
                                {ingredient.total_amount} {ingredient.unit}
                              </p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>

              <section className="self-start rounded-[1.6rem] border border-[color:var(--line)] bg-white/52 p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--olive)]">
                  Product search
                </p>

                {!isProductSearchSupported ? (
                  <div className="mt-4 rounded-[1rem] border border-dashed border-[color:var(--line)] bg-[color:var(--paper)]/52 px-4 py-3 text-sm leading-6 text-[color:var(--ink-soft)]">
                    {hasExternalHandoff
                      ? `Product search is handled by ${formatRetailerName(currentShoppingCart.retailer)} after opening the handoff link.`
                      : `${formatRetailerName(currentShoppingCart.retailer)} handoff is configured as a hosted shopping-list flow, not line-by-line product search.`}
                  </div>
                ) : searchContext ? (
                  <div className="mt-4 grid gap-4">
                    <div>
                      <p className="text-sm font-semibold text-[color:var(--forest-strong)]">
                        {searchContext.mode === "replace"
                          ? "Replace selected line"
                          : "Add manual item"}
                      </p>
                      <p className="mt-1 text-sm text-[color:var(--ink-soft)]">
                        Search {formatRetailerName(currentShoppingCart.retailer)} and
                        choose a product to use in this shopping cart.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="search"
                        value={searchContext.query}
                        onChange={(event) =>
                          setSearchContext({
                            ...searchContext,
                            query: event.target.value,
                          })
                        }
                        placeholder="Search products"
                        className="min-h-11 flex-1 rounded-2xl border border-[color:var(--line)] bg-white px-4 text-sm text-[color:var(--forest-strong)] outline-none transition placeholder:text-[color:var(--ink-soft)]/72 focus:border-[color:var(--olive)]"
                      />
                      <button
                        type="button"
                        onClick={handleSearch}
                        disabled={isSearching}
                        className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[color:var(--forest)] px-4 text-sm font-semibold text-[color:var(--paper)] transition hover:bg-[color:var(--forest-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSearching ? "Searching..." : "Search"}
                      </button>
                    </div>

                    {searchError ? (
                      <p className="rounded-2xl border border-[color:var(--clay)]/20 bg-[color:var(--clay)]/10 px-4 py-3 text-sm text-[color:var(--clay)]">
                        {searchError}
                      </p>
                    ) : null}

                    {results.length > 0 ? (
                      <ul className="grid gap-3">
                        {results.map((candidate) => (
                          <li
                            key={candidate.product_id}
                            className="rounded-[1rem] border border-[color:var(--line)] bg-[rgba(255,255,255,0.72)] p-3"
                          >
                            <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                              <div className="h-16 w-16 overflow-hidden rounded-[0.9rem] border border-[color:var(--line)] bg-[color:var(--paper)]/72">
                                {candidate.image_url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={candidate.image_url}
                                    alt={candidate.title}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="h-full w-full bg-[linear-gradient(135deg,rgba(115,135,101,0.12),rgba(245,240,228,0.44)),radial-gradient(circle_at_top_left,rgba(161,77,49,0.1),transparent_34%)]" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-[color:var(--forest-strong)]">
                                  {candidate.title}
                                </p>
                                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[color:var(--ink-soft)]">
                                  {candidate.brand ??
                                    formatRetailerName(currentShoppingCart.retailer)}
                                </p>
                                {candidate.quantity_text ? (
                                  <p className="mt-2 text-xs text-[color:var(--ink-soft)]">
                                    {candidate.quantity_text}
                                  </p>
                                ) : null}
                              </div>
                              <div className="grid justify-items-end gap-2">
                                <p className="text-sm font-semibold text-[color:var(--forest-strong)]">
                                  {formatMoney(candidate.price)}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => handleSelectCandidate(candidate)}
                                  className="rounded-full border border-[color:var(--line)] bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--olive)] transition hover:bg-[color:var(--paper)]"
                                >
                                  Select
                                </button>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="rounded-[1rem] border border-dashed border-[color:var(--line)] bg-[color:var(--paper)]/52 px-4 py-3 text-sm text-[color:var(--ink-soft)]">
                        {isSearching
                          ? `Searching ${formatRetailerName(currentShoppingCart.retailer)}...`
                          : "Search to replace a match or add a manual item."}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 rounded-[1rem] border border-dashed border-[color:var(--line)] bg-[color:var(--paper)]/52 px-4 py-3 text-sm text-[color:var(--ink-soft)]">
                    {isEditing
                      ? "Pick a line to replace or use + to add a manual product."
                      : "Enter edit mode to replace a matched product or add a manual item."}
                  </div>
                )}
              </section>

              <section className="self-start rounded-[1.6rem] border border-[color:var(--line)] bg-white/52 p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--olive)]">
                  Cart lines
                </p>
                <ul className="mt-4 grid gap-3">
                  {currentShoppingCart.matched_items.length > 0 ? (
                    currentShoppingCart.matched_items.map((item, index) => (
                      <li
                        key={`${item.kind ?? "ingredient_match"}-${item.canonical_ingredient}-${index}`}
                        className="rounded-[1rem] border border-[color:var(--line)] bg-[rgba(255,255,255,0.72)] px-4 py-3"
                      >
                        <p className="text-sm font-semibold text-[color:var(--forest-strong)]">
                          {item.manual_label ??
                            item.selected_product?.title ??
                            item.canonical_ingredient}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-[color:var(--ink-soft)]">
                          {item.selected_product
                            ? `Product line${item.selected_quantity && item.selected_quantity > 1 ? ` x${item.selected_quantity}` : ""}`
                            : "No product assigned yet"}
                        </p>
                      </li>
                    ))
                  ) : (
                    <li className="rounded-[1rem] border border-dashed border-[color:var(--line)] bg-[color:var(--paper)]/52 px-4 py-3 text-sm text-[color:var(--ink-soft)]">
                      No cart lines yet. Search and add products in edit mode.
                    </li>
                  )}
                </ul>
              </section>

            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
