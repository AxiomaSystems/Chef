"use client";

import type { ShoppingCart } from "@cart/shared";

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

export function ShoppingCartDetailOverlay(props: {
  shoppingCart: ShoppingCart | null;
  onClose: () => void;
}) {
  const { onClose, shoppingCart } = props;

  if (!shoppingCart) {
    return null;
  }

  const updatedAt =
    shoppingCart.updated_at ??
    shoppingCart.created_at ??
    new Date().toISOString();

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
              {shoppingCart.retailer} / {shoppingCart.matched_items.length} matched
              items / updated {formatDate(updatedAt)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--line)] bg-white/74 text-xl text-[color:var(--forest-strong)] transition hover:bg-white"
            aria-label="Close shopping cart detail"
          >
            x
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
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
                    {formatMoney(shoppingCart.estimated_subtotal)}
                  </p>
                </div>
              </div>

              <ul className="grid gap-3 pt-5">
                {shoppingCart.matched_items.map((item) => {
                  const selectedProduct = item.selected_product;
                  const selectedQuantity =
                    item.selected_quantity && item.selected_quantity > 1
                      ? `x${item.selected_quantity}`
                      : null;

                  return (
                    <li
                      key={`${item.canonical_ingredient}-${item.walmart_search_query}`}
                      className="rounded-[1.2rem] border border-[color:var(--line)] bg-[rgba(255,255,255,0.74)] p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-base font-semibold text-[color:var(--forest-strong)]">
                            {item.canonical_ingredient}
                          </p>
                          <p className="mt-1 text-sm text-[color:var(--ink-soft)]">
                            Need {item.needed_amount} {item.needed_unit}
                          </p>
                        </div>
                        {item.estimated_line_total !== undefined ? (
                          <p className="text-sm font-semibold text-[color:var(--forest-strong)]">
                            {formatMoney(item.estimated_line_total)}
                          </p>
                        ) : null}
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

            <aside className="grid gap-4">
              <section className="rounded-[1.6rem] border border-[color:var(--line)] bg-white/52 p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--olive)]">
                  Snapshot
                </p>
                <div className="mt-4 grid gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--ink-soft)]">
                      Retailer
                    </p>
                    <p className="mt-1 text-base font-semibold text-[color:var(--forest-strong)]">
                      {shoppingCart.retailer}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--ink-soft)]">
                      Estimated subtotal
                    </p>
                    <p className="mt-1 text-base font-semibold text-[color:var(--forest-strong)]">
                      {formatMoney(shoppingCart.estimated_subtotal)}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-[1rem] border border-[color:var(--line)] bg-[rgba(255,255,255,0.72)] px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--ink-soft)]">
                        Overview
                      </p>
                      <p className="mt-1 text-lg font-semibold text-[color:var(--forest-strong)]">
                        {shoppingCart.overview.length}
                      </p>
                    </div>
                    <div className="rounded-[1rem] border border-[color:var(--line)] bg-[rgba(255,255,255,0.72)] px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--ink-soft)]">
                        Matches
                      </p>
                      <p className="mt-1 text-lg font-semibold text-[color:var(--forest-strong)]">
                        {shoppingCart.matched_items.length}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-[1.6rem] border border-[color:var(--line)] bg-white/52 p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--olive)]">
                  Ingredient menu
                </p>
                <ul className="mt-4 grid gap-3">
                  {shoppingCart.overview.map((ingredient) => (
                    <li
                      key={`${ingredient.canonical_ingredient}-${ingredient.unit}`}
                      className="rounded-[1rem] border border-[color:var(--line)] bg-[rgba(255,255,255,0.72)] px-4 py-3"
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
              </section>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
