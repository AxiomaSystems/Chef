"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { MatchedIngredientProduct, ShoppingCart } from "@cart/shared";
import { CartSubNav } from "@/components/cart/cart-sub-nav";
import { AppShell } from "@/components/layout/app-shell";
import { ShoppingCartDetailOverlay } from "@/components/planning/shopping-cart-detail-overlay";
import {
  deleteShoppingCartAction,
  updateShoppingCartAction,
  updateShoppingCartCheckoutStateAction,
} from "@/app/home-actions";

function fmt$(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function fmtDate(iso?: string) {
  if (!iso) return "Unknown date";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

function retailerLabel(retailer: string) {
  const map: Record<string, string> = {
    kroger: "Kroger",
    walmart: "Walmart",
    instacart: "Instacart",
  };
  return map[retailer] ?? retailer;
}

function lineTitle(item: MatchedIngredientProduct) {
  return (
    item.selected_product?.title ??
    item.manual_label ??
    item.canonical_ingredient
  );
}

function lineSubtitle(item: MatchedIngredientProduct) {
  if (item.selected_product?.brand) {
    return item.selected_product.brand;
  }

  return `${item.needed_amount} ${item.needed_unit}`;
}

function subtotal(items: MatchedIngredientProduct[]) {
  return Number(
    items
      .reduce((sum, item) => sum + (item.estimated_line_total ?? 0), 0)
      .toFixed(2),
  );
}

function updateItemQuantity(
  item: MatchedIngredientProduct,
  quantity: number,
): MatchedIngredientProduct {
  if (!item.selected_product) {
    return item;
  }

  return {
    ...item,
    selected_quantity: quantity,
    estimated_line_total: Number(
      (item.selected_product.price * quantity).toFixed(2),
    ),
  };
}

export function ShoppingClient({
  shoppingCarts: initialCarts,
  cartNames,
}: {
  shoppingCarts: ShoppingCart[];
  cartNames: Record<string, string>;
}) {
  const [carts, setCarts] = useState(initialCarts);
  const [openCart, setOpenCart] = useState<ShoppingCart | null>(null);
  const [savingItemKey, setSavingItemKey] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startMutation] = useTransition();

  const activeCart = useMemo(
    () => carts.find((cart) => !cart.checked_out_at) ?? null,
    [carts],
  );

  const historyCarts = activeCart
    ? carts.filter((cart) => cart.id !== activeCart.id)
    : carts;
  const activeCartName = activeCart
    ? (cartNames[activeCart.cart_id] ??
      `${retailerLabel(activeCart.retailer)} shopping list`)
    : "Shopping list";

  function replaceCart(updatedCart: ShoppingCart) {
    setCarts((current) =>
      current.map((cart) => (cart.id === updatedCart.id ? updatedCart : cart)),
    );
    setOpenCart((current) =>
      current?.id === updatedCart.id ? updatedCart : current,
    );
  }

  function saveItems(
    cart: ShoppingCart,
    nextItems: MatchedIngredientProduct[],
    itemKey: string,
  ) {
    if (!cart.id || cart.checked_out_at) return;

    const optimisticCart = {
      ...cart,
      matched_items: nextItems,
      estimated_subtotal: subtotal(nextItems),
    };
    replaceCart(optimisticCart);
    setSavingItemKey(itemKey);
    setError(null);

    startMutation(async () => {
      const result = await updateShoppingCartAction(cart.id ?? "", nextItems);
      setSavingItemKey(null);

      if (result.error || !result.shoppingCart) {
        setError(result.error ?? "Unable to update this shopping list.");
        replaceCart(cart);
        return;
      }

      replaceCart(result.shoppingCart);
    });
  }

  function adjustQuantity(cart: ShoppingCart, index: number, delta: number) {
    const item = cart.matched_items[index];
    if (!item?.selected_product) return;

    const nextQuantity = Math.max(1, (item.selected_quantity ?? 1) + delta);
    const nextItems = cart.matched_items.map((line, currentIndex) =>
      currentIndex === index ? updateItemQuantity(line, nextQuantity) : line,
    );

    saveItems(cart, nextItems, `${cart.id}-${index}`);
  }

  function removeItem(cart: ShoppingCart, index: number) {
    const nextItems = cart.matched_items.filter(
      (_item, currentIndex) => currentIndex !== index,
    );
    saveItems(cart, nextItems, `${cart.id}-${index}`);
  }

  function deleteHistoryCart(cart: ShoppingCart) {
    if (!cart.id) return;

    setDeletingId(cart.id);
    setError(null);
    startMutation(async () => {
      const result = await deleteShoppingCartAction(cart.id ?? "");
      setDeletingId(null);

      if (result.error) {
        setError(result.error);
        return;
      }

      setCarts((current) => current.filter((item) => item.id !== cart.id));
    });
  }

  function reopenCart(cart: ShoppingCart) {
    if (!cart.id) return;

    setError(null);
    setMessage(null);
    startMutation(async () => {
      const result = await updateShoppingCartCheckoutStateAction(
        cart.id ?? "",
        null,
      );

      if (result.error || !result.shoppingCart) {
        setError(result.error ?? "Unable to reopen this shopping list.");
        return;
      }

      setCarts((current) => [
        result.shoppingCart!,
        ...current.filter((cart) => cart.id !== result.shoppingCart!.id),
      ]);
      setOpenCart(null);
      setMessage("Shopping list reopened.");
    });
  }

  return (
    <AppShell topBarTitle="Shopping Cart">
      <div className="mx-auto max-w-4xl space-y-7 px-4 pb-28 pt-6 sm:px-6 sm:pb-10">
        <div>
          <h1 className="text-headline-lg font-bold text-on-surface">
            Shopping Cart
          </h1>
          <p className="mt-1 text-body-md text-outline">
            Your generated grocery list.
          </p>
        </div>

        <CartSubNav />

        {error && (
          <div className="rounded-xl bg-error-container p-3 text-body-sm text-on-error-container">
            {error}
          </div>
        )}
        {message && (
          <div className="rounded-xl bg-secondary-container p-3 text-body-sm text-on-secondary-container">
            {message}
          </div>
        )}

        {activeCart ? (
          <section className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-title-md font-semibold text-on-surface">
                  {activeCartName}
                </p>
                <p className="text-body-sm text-outline">
                  {activeCart.matched_items.length} items &middot;{" "}
                  {retailerLabel(activeCart.retailer)}
                </p>
              </div>
              <span className="rounded-full bg-surface-container-low px-3 py-1 text-label-md text-on-surface-variant">
                {fmt$(activeCart.estimated_subtotal)}
              </span>
            </div>

            <div className="space-y-3">
              {activeCart.matched_items.map((item, index) => {
                const product = item.selected_product;
                const quantity = item.selected_quantity ?? 1;
                const itemKey = `${activeCart.id}-${index}`;
                const isSaving = savingItemKey === itemKey;

                return (
                  <div
                    key={`${item.canonical_ingredient}-${index}`}
                    className={`rounded-2xl border border-outline-variant/30 bg-white p-4 shadow-sm transition-opacity ${
                      isSaving ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-surface-container">
                        {product?.image_url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={product.image_url}
                            alt={lineTitle(item)}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="material-symbols-outlined text-outline">
                            grocery
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="line-clamp-2 text-body-lg font-semibold leading-snug text-on-surface">
                              {lineTitle(item)}
                            </p>
                            <p className="mt-0.5 text-label-sm text-outline">
                              {lineSubtitle(item)}
                            </p>
                          </div>
                          {item.estimated_line_total !== undefined && (
                            <p className="shrink-0 text-label-lg font-semibold text-primary">
                              {fmt$(item.estimated_line_total)}
                            </p>
                          )}
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                adjustQuantity(activeCart, index, -1)
                              }
                              disabled={!product || isSaving}
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant/50 text-on-surface-variant transition-colors hover:bg-surface-container-low disabled:opacity-40"
                              aria-label={`Decrease ${lineTitle(item)} quantity`}
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                remove
                              </span>
                            </button>
                            <span className="w-5 text-center text-body-md text-on-surface">
                              {quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                adjustQuantity(activeCart, index, 1)
                              }
                              disabled={!product || isSaving}
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant/50 text-on-surface-variant transition-colors hover:bg-surface-container-low disabled:opacity-40"
                              aria-label={`Increase ${lineTitle(item)} quantity`}
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                add
                              </span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeItem(activeCart, index)}
                            disabled={isSaving}
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-outline transition-colors hover:bg-error-container/30 hover:text-error disabled:opacity-40"
                            aria-label={`Remove ${lineTitle(item)}`}
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
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-dashed border-outline-variant/50 bg-surface-container-low p-8 text-center">
            <span className="material-symbols-outlined text-[40px] text-outline-variant">
              shopping_cart
            </span>
            <p className="mt-3 text-label-lg font-semibold text-on-surface">
              No active shopping list
            </p>
            <p className="mt-1 text-body-sm text-outline">
              Create a shopping list from a cart or reopen one from history.
            </p>
          </section>
        )}

        {activeCart?.id ? (
          <section className="sticky bottom-[4.5rem] z-30 bg-background/95 py-3 backdrop-blur-sm lg:bottom-0">
            <Link
              href={`/shopping/checkout/${activeCart.id}`}
              className="inline-flex min-h-13 w-full items-center justify-center rounded-full bg-[#f4be6b] px-4 py-3 text-label-lg font-black text-[#351800] shadow-[0_12px_28px_rgba(244,190,107,0.28)] transition-colors hover:bg-[#f4be6b]"
            >
              Checkout
            </Link>
          </section>
        ) : null}

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-title-md font-semibold text-on-surface">
                History
              </h2>
              <p className="text-body-sm text-outline">
                Previous shopping lists before and after checkout.
              </p>
            </div>
          </div>

          {historyCarts.length > 0 ? (
            <div className="space-y-3">
              {historyCarts.map((cart) => {
                const checkedOut = Boolean(cart.checked_out_at);
                const name =
                  cartNames[cart.cart_id] ??
                  `${retailerLabel(cart.retailer)} shopping list`;
                const isDeleting = deletingId === cart.id;

                return (
                  <div
                    key={cart.id}
                    className={`rounded-2xl border p-4 shadow-sm transition ${
                      checkedOut
                        ? "border-outline-variant/20 bg-surface-container-low opacity-70"
                        : "border-outline-variant/30 bg-white"
                    } ${isDeleting ? "opacity-40" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-surface-container">
                        <span className="material-symbols-outlined text-[24px] text-outline">
                          receipt_long
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <p className="min-w-0 flex-1 truncate text-label-lg font-semibold text-on-surface">
                            {name}
                          </p>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                              checkedOut
                                ? "bg-outline-variant/25 text-outline"
                                : "bg-secondary-container text-on-secondary-container"
                            }`}
                          >
                            {checkedOut ? "Checked out" : "Open"}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-label-sm text-outline">
                          <span className="rounded-full bg-surface-container-low px-2.5 py-1">
                            {cart.matched_items.length} items
                          </span>
                          <span className="rounded-full bg-surface-container-low px-2.5 py-1">
                            {fmt$(cart.estimated_subtotal)}
                          </span>
                          <span className="rounded-full bg-surface-container-low px-2.5 py-1">
                            {checkedOut
                              ? fmtDate(cart.checked_out_at)
                              : fmtDate(cart.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-[1fr_1fr_auto] items-center gap-2 sm:flex sm:justify-end">
                      <button
                        type="button"
                        onClick={() => setOpenCart(cart)}
                        className="min-h-9 rounded-full border border-outline-variant px-4 py-2 text-label-md text-on-surface-variant transition-colors hover:bg-surface-container-low"
                      >
                        Open
                      </button>
                      {checkedOut ? (
                        <button
                          type="button"
                          onClick={() => reopenCart(cart)}
                          className="min-h-9 rounded-full bg-white px-4 py-2 text-label-md font-semibold text-primary transition-colors hover:bg-primary-surface"
                        >
                          Reopen
                        </button>
                      ) : cart.id ? (
                        <Link
                          href={`/shopping/checkout/${cart.id}`}
                          className="inline-flex min-h-9 items-center justify-center rounded-full bg-[#f4be6b] px-4 py-2 text-label-md font-semibold text-[#351800] shadow-sm transition-colors hover:bg-[#f4be6b]"
                        >
                          Checkout
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => deleteHistoryCart(cart)}
                        disabled={isDeleting}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-outline transition-colors hover:bg-error-container/30 hover:text-error disabled:opacity-30"
                        aria-label="Delete cart"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          delete
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl bg-surface-container-low p-5 text-body-sm text-outline">
              Shopping list history will appear here after you create shopping
              lists.
            </div>
          )}
        </section>
      </div>

      {openCart && (
        <ShoppingCartDetailOverlay
          shoppingCart={openCart}
          readOnly={Boolean(openCart.checked_out_at)}
          onClose={() => setOpenCart(null)}
        />
      )}
    </AppShell>
  );
}
