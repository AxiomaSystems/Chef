"use client";

import { useState, useTransition } from "react";
import type { ShoppingCart } from "@cart/shared";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCartDetailOverlay } from "@/components/planning/shopping-cart-detail-overlay";
import { deleteShoppingCartAction } from "@/app/home-actions";
import Link from "next/link";

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

export function ShoppingClient({
  shoppingCarts: initialCarts,
  cartNames,
}: {
  shoppingCarts: ShoppingCart[];
  cartNames: Record<string, string>;
}) {
  const [carts, setCarts] = useState(initialCarts);
  const [openCart, setOpenCart] = useState<ShoppingCart | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteErr, setDeleteErr] = useState<string | undefined>();
  const [, startDelete] = useTransition();

  function handleDelete(cart: ShoppingCart) {
    const cartId = cart.id;
    if (!cartId) return;
    setDeletingId(cartId);
    setDeleteErr(undefined);
    startDelete(async () => {
      const res = await deleteShoppingCartAction(cartId);
      if (res.error) {
        setDeleteErr(res.error);
        setDeletingId(null);
      } else {
        setCarts((prev) => prev.filter((current) => current.id !== cart.id));
        setDeletingId(null);
      }
    });
  }

  return (
    <AppShell topBarTitle="Shopping">
      <div className="mx-auto max-w-3xl space-y-6 px-4 pt-6 pb-8">
        <div>
          <h1 className="text-headline-lg font-bold text-on-surface">
            Shopping Carts
          </h1>
          <p className="mt-1 text-body-md text-outline">
            Your saved grocery runs.
          </p>
        </div>

        {deleteErr && (
          <div className="rounded-xl bg-error-container p-3 text-body-sm text-on-error-container">
            {deleteErr}
          </div>
        )}

        {carts.length > 0 ? (
          <div className="space-y-3">
            {carts.map((cart) => {
              const name =
                cartNames[cart.cart_id] ??
                `${retailerLabel(cart.retailer)} Cart`;
              const isDeleting = deletingId === cart.id;

              return (
                <div
                  key={cart.id}
                  className={`flex items-center gap-4 rounded-xl border border-outline-variant/30 bg-white p-4 shadow-[0_4px_20px_-4px_rgba(137,80,50,0.08)] transition-all ${
                    isDeleting ? "opacity-40" : ""
                  }`}
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-surface-container">
                    <span className="material-symbols-outlined text-[26px] text-outline">
                      shopping_cart
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-label-lg font-semibold text-on-surface">
                        {name}
                      </h3>
                      <Badge variant="secondary">
                        {retailerLabel(cart.retailer)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-body-sm text-outline">
                      {cart.matched_items.length} items
                      {cart.estimated_subtotal > 0
                        ? ` - ~${fmt$(cart.estimated_subtotal)}`
                        : ""}
                      {cart.created_at ? ` - ${fmtDate(cart.created_at)}` : ""}
                    </p>
                    {cart.external_url && (
                      <a
                        href={cart.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 flex items-center gap-1 text-label-sm text-primary hover:underline"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          open_in_new
                        </span>
                        View on {retailerLabel(cart.retailer)}
                      </a>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setOpenCart(cart)}
                    >
                      Open
                    </Button>
                    {cart.id && (
                      <Link
                        href={`/shopping/checkout/${cart.id}`}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ffb38e] px-4 py-2 text-label-md font-semibold text-[#6d391d] shadow-sm transition-colors hover:bg-[#ffcfb6]"
                      >
                        Checkout
                      </Link>
                    )}
                    <button
                      onClick={() => handleDelete(cart)}
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
          <div className="flex flex-col items-center gap-4 rounded-xl bg-surface-container-low p-8 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-surface-container">
              <span className="material-symbols-outlined text-[40px] text-outline-variant">
                shopping_cart
              </span>
            </div>
            <div>
              <p className="text-label-lg font-semibold text-on-surface">
                No shopping carts yet
              </p>
              <p className="mt-1 text-body-sm text-outline">
                Generate one from your recipes to get started.
              </p>
            </div>
            <Link href="/recipes">
              <Button variant="primary" icon="restaurant_menu">
                Browse Recipes
              </Button>
            </Link>
          </div>
        )}
      </div>

      {openCart && (
        <ShoppingCartDetailOverlay
          shoppingCart={openCart}
          onClose={() => setOpenCart(null)}
        />
      )}
    </AppShell>
  );
}
