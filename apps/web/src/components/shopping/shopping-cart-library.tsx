"use client";

import { useDeferredValue, useMemo, useState } from "react";
import type { ShoppingCart } from "@cart/shared";
import { ShoppingCartDetailOverlay } from "@/components/planning/shopping-cart-detail-overlay";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatDate(iso?: string) {
  const value = iso ?? new Date().toISOString();

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function ShoppingCartLibrary(props: {
  shoppingCarts: ShoppingCart[];
}) {
  const [query, setQuery] = useState("");
  const [activeShoppingCartId, setActiveShoppingCartId] = useState<string | null>(
    null,
  );
  const deferredQuery = useDeferredValue(query);

  const filteredShoppingCarts = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return props.shoppingCarts;
    }

    return props.shoppingCarts.filter((shoppingCart) => {
      const haystack = [
        shoppingCart.retailer,
        shoppingCart.cart_id,
        ...shoppingCart.matched_items.map((item) =>
          item.manual_label ??
          item.selected_product?.title ??
          item.canonical_ingredient ??
          "",
        ),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [deferredQuery, props.shoppingCarts]);

  const activeShoppingCart =
    props.shoppingCarts.find((shoppingCart) => shoppingCart.id === activeShoppingCartId) ??
    null;

  return (
    <>
      <section className="rounded-[2rem] border border-[color:var(--line)] bg-white/60 p-6 shadow-[var(--shadow)] backdrop-blur-sm">
        <div className="grid gap-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="font-display text-4xl leading-none text-[color:var(--forest-strong)]">
                Saved shopping carts
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--ink-soft)]">
                Review persisted retailer outputs, revisit saved purchase baskets,
                and reopen the editor when you need to replace products or add
                manual items.
              </p>
            </div>

            <label className="block w-full lg:max-w-sm">
              <span className="sr-only">
                Search by retailer, ingredient, or manual item
              </span>
              <input
                suppressHydrationWarning
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search retailer, ingredient, or item"
                className="min-h-11 w-full rounded-full border border-[color:var(--line)] bg-[color:var(--paper)]/78 px-4 text-sm text-[color:var(--forest-strong)] outline-none transition placeholder:text-[color:var(--ink-soft)]/72 focus:border-[color:var(--olive)]"
              />
            </label>
          </div>

          {filteredShoppingCarts.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredShoppingCarts.map((shoppingCart) => {
                const updatedAt =
                  shoppingCart.updated_at ??
                  shoppingCart.created_at ??
                  new Date().toISOString();
                const manualItems = shoppingCart.matched_items.filter(
                  (item) => item.kind === "manual_item",
                ).length;
                const productLabels = shoppingCart.matched_items
                  .map((item) =>
                    item.manual_label ??
                    item.selected_product?.title ??
                    item.canonical_ingredient,
                  )
                  .filter(Boolean)
                  .slice(0, 3);

                return (
                  <button
                    key={shoppingCart.id}
                    type="button"
                    onClick={() => setActiveShoppingCartId(shoppingCart.id ?? null)}
                    className="rounded-[1.45rem] border border-[color:var(--line)] bg-[color:var(--paper)]/78 p-5 text-left transition hover:border-[color:var(--olive)]/28 hover:bg-white/82"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--olive)]">
                          {shoppingCart.retailer}
                        </p>
                        <h2 className="mt-2 font-display text-[2rem] leading-[0.94] text-[color:var(--forest-strong)]">
                          {formatMoney(shoppingCart.estimated_subtotal)}
                        </h2>
                      </div>
                      <span className="rounded-full border border-[color:var(--line)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--ink-soft)]">
                        {formatDate(updatedAt)}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 text-sm text-[color:var(--ink-soft)]">
                      <div className="flex items-center justify-between gap-3">
                        <span>Matched items</span>
                        <span className="font-semibold text-[color:var(--forest-strong)]">
                          {shoppingCart.matched_items.length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Ingredient lines</span>
                        <span className="font-semibold text-[color:var(--forest-strong)]">
                          {shoppingCart.overview.length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Manual items</span>
                        <span className="font-semibold text-[color:var(--forest-strong)]">
                          {manualItems}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {productLabels.map((label, index) => (
                        <span
                          key={`${shoppingCart.id}-${label}-${index}`}
                          className="rounded-full border border-[color:var(--line)] bg-[rgba(250,246,236,0.92)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--olive)]"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[1.55rem] border border-dashed border-[color:var(--line)] bg-[color:var(--paper)]/52 px-5 py-6">
              <div className="text-lg font-semibold text-[color:var(--forest-strong)]">
                No shopping carts in this view
              </div>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[color:var(--ink-soft)]">
                Generate a shopping cart from a saved cart first, or try another
                search term.
              </p>
            </div>
          )}
        </div>
      </section>

      <ShoppingCartDetailOverlay
        key={
          activeShoppingCart
            ? `${activeShoppingCart.id ?? "shopping-cart"}:${activeShoppingCart.updated_at ?? activeShoppingCart.created_at ?? "open"}`
            : "shopping-cart-none"
        }
        shoppingCart={activeShoppingCart}
        onClose={() => setActiveShoppingCartId(null)}
      />
    </>
  );
}
