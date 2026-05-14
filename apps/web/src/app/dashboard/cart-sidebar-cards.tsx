"use client";

import type { ShoppingCart } from "@cart/shared";
import Link from "next/link";

function fmt$(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function retailerLabel(retailer: string) {
  const map: Record<string, string> = {
    kroger: "Kroger",
    walmart: "Walmart",
    instacart: "Instacart",
  };
  return map[retailer] ?? retailer;
}

export function CartSidebarCards({
  latestShoppingCart,
  cartCount,
  shoppingCartCount,
}: {
  latestShoppingCart: ShoppingCart | null;
  cartCount: number;
  shoppingCartCount: number;
}) {
  return (
    <div className="md:col-span-4 flex flex-col gap-6">
      <div className="bg-white p-6 rounded-[2rem] shadow-[0_4px_20px_rgba(60,154,158,0.08)] border border-outline-variant/20 flex-1">
        <div className="flex justify-between items-center mb-5">
          <h4 className="text-headline-sm font-semibold text-on-surface">
            Your Carts
          </h4>
          <span className="material-symbols-outlined text-primary">
            shopping_cart
          </span>
        </div>

        {latestShoppingCart ? (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-4 rounded-2xl bg-surface-container-low p-4">
              <div className="min-w-0 space-y-2">
                <p className="text-label-sm uppercase tracking-widest text-outline">
                  Latest order
                </p>
                <p className="truncate text-label-lg font-bold text-on-surface">
                  {retailerLabel(latestShoppingCart.retailer)} Cart
                </p>
                <p className="text-body-sm text-outline">
                  {latestShoppingCart.matched_items.length} items
                </p>
              </div>
              {latestShoppingCart.estimated_subtotal > 0 ? (
                <p className="shrink-0 text-right text-headline-sm font-black text-primary">
                  ~{fmt$(latestShoppingCart.estimated_subtotal)}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <p className="text-headline-sm font-black text-primary">
                  {cartCount}
                </p>
                <p className="text-body-sm text-outline">Carts built</p>
              </div>
              <div className="text-center">
                <p className="text-headline-sm font-black text-primary">
                  {shoppingCartCount}
                </p>
                <p className="text-body-sm text-outline">Orders ready</p>
              </div>
            </div>

            <Link
              href="/shopping"
              className="flex items-center justify-center gap-2 w-full py-2.5 border border-primary text-primary font-semibold text-label-md rounded-full hover:bg-primary-fixed-dim/10 transition-colors"
            >
              View all
              <span className="material-symbols-outlined text-[16px]">
                arrow_forward
              </span>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center gap-3 py-4">
            <span className="material-symbols-outlined text-[48px] text-outline-variant">
              shopping_cart
            </span>
            <p className="text-body-sm text-outline">
              No shopping carts yet. Generate one from your meal plan or
              recipes.
            </p>
          </div>
        )}
      </div>

      <div className="bg-on-surface p-6 rounded-[2rem] relative overflow-hidden">
        <div className="relative z-10">
          <h4 className="text-headline-sm font-bold text-white mb-1">
            Saw a recipe online?
          </h4>
          <p className="text-body-sm text-white/70 mb-4">
            Import it from YouTube, TikTok, or Instagram in seconds.
          </p>
          <Link
            href="/create?capture=1"
            className="inline-flex items-center gap-2 bg-primary-fixed-dim text-on-primary-fixed font-semibold text-label-md px-4 py-2.5 rounded-full hover:opacity-90 transition-opacity shadow-md"
          >
            <span className="material-symbols-outlined text-[16px]">
              add_link
            </span>
            Import from link
          </Link>
        </div>
        <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-white/5 text-[96px] rotate-12">
          link
        </span>
      </div>
    </div>
  );
}
