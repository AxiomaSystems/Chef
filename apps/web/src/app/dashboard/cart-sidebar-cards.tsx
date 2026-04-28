"use client";

import type { Cart, ShoppingCart } from "@cart/shared";
import Link from "next/link";

function fmt$(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
}

function retailerLabel(r: string) {
  const map: Record<string, string> = { kroger: "Kroger", walmart: "Walmart", instacart: "Instacart" };
  return map[r] ?? r;
}

export function CartSidebarCards({
  latestShoppingCart,
  latestCart,
  cartCount,
  shoppingCartCount,
}: {
  latestShoppingCart: ShoppingCart | null;
  latestCart: Cart | null;
  cartCount: number;
  shoppingCartCount: number;
}) {
  return (
    <div className="md:col-span-4 flex flex-col gap-6">
      {/* Shopping summary card */}
      <div className="bg-white p-6 rounded-[2rem] shadow-[0_4px_20px_rgba(137,80,50,0.08)] border border-outline-variant/20 flex-1">
        <div className="flex justify-between items-center mb-5">
          <h4 className="text-headline-sm font-semibold text-on-surface">Your Carts</h4>
          <span className="material-symbols-outlined text-primary">shopping_cart</span>
        </div>

        {latestShoppingCart ? (
          <div className="space-y-5">
            {/* Latest shopping cart */}
            <div className="bg-surface-container-low rounded-2xl p-4 space-y-2">
              <p className="text-label-sm text-outline uppercase tracking-widest">Latest order</p>
              <p className="text-label-lg font-bold text-on-surface">
                {retailerLabel(latestShoppingCart.retailer)} Cart
              </p>
              <p className="text-body-sm text-outline">
                {latestShoppingCart.matched_items.length} items
              </p>
              {latestShoppingCart.estimated_subtotal > 0 && (
                <p className="text-headline-sm font-black text-primary">
                  ~{fmt$(latestShoppingCart.estimated_subtotal)}
                </p>
              )}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <p className="text-headline-sm font-black text-primary">{cartCount}</p>
                <p className="text-body-sm text-outline">Carts built</p>
              </div>
              <div className="text-center">
                <p className="text-headline-sm font-black text-primary">{shoppingCartCount}</p>
                <p className="text-body-sm text-outline">Orders ready</p>
              </div>
            </div>

            <Link
              href="/shopping"
              className="flex items-center justify-center gap-2 w-full py-2.5 border border-primary text-primary font-semibold text-label-md rounded-full hover:bg-primary-fixed-dim/10 transition-colors"
            >
              View all
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>
        ) : latestCart ? (
          <div className="space-y-4">
            <div className="bg-surface-container-low rounded-2xl p-4">
              <p className="text-label-sm text-outline uppercase tracking-widest">Last cart</p>
              <p className="text-label-lg font-bold text-on-surface mt-1">
                {latestCart.name ?? "Untitled Cart"}
              </p>
              <p className="text-body-sm text-outline mt-0.5">
                {latestCart.selections.length} recipes · {retailerLabel(latestCart.retailer)}
              </p>
            </div>
            <Link
              href="/shopping"
              className="flex items-center justify-center gap-2 w-full py-2.5 border border-primary text-primary font-semibold text-label-md rounded-full hover:bg-primary-fixed-dim/10 transition-colors"
            >
              View shopping
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center gap-3 py-4">
            <span className="material-symbols-outlined text-[48px] text-outline-variant">shopping_cart</span>
            <p className="text-body-sm text-outline">No carts yet. Pick recipes to build your first one.</p>
          </div>
        )}
      </div>

      {/* Import shortcut card */}
      <div className="bg-on-surface p-6 rounded-[2rem] relative overflow-hidden">
        <div className="relative z-10">
          <h4 className="text-headline-sm font-bold text-white mb-1">Saw a recipe online?</h4>
          <p className="text-body-sm text-white/70 mb-4">
            Import it from YouTube, TikTok, or Instagram in seconds.
          </p>
          <Link
            href="/import"
            className="inline-flex items-center gap-2 bg-primary-fixed-dim text-on-primary-fixed font-semibold text-label-md px-4 py-2.5 rounded-full hover:opacity-90 transition-opacity shadow-md"
          >
            <span className="material-symbols-outlined text-[16px]">add_link</span>
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
