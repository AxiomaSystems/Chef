"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCartDetailOverlay } from "@/components/planning/shopping-cart-detail-overlay";
import Link from "next/link";

type MockCart = {
  id: string;
  name: string;
  retailer: string;
  itemCount: number;
  estimatedTotal: string;
  createdAt: string;
};

const mockCarts: MockCart[] = [
  {
    id: "1",
    name: "Weeknight Biryani",
    retailer: "Kroger",
    itemCount: 8,
    estimatedTotal: "$42.30",
    createdAt: "Apr 22",
  },
];

export default function ShoppingPage() {
  const [openCartId, setOpenCartId] = useState<string | null>(null);

  return (
    <AppShell topBarTitle="Shopping">
      <div className="px-4 pt-6 pb-8 max-w-3xl mx-auto space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-headline-lg text-[#1a1c1a] font-bold">Shopping Carts</h1>
          <p className="text-body-md text-[#85736c] mt-1">Your saved grocery runs.</p>
        </div>

        {/* Saved Cart List */}
        <div className="space-y-3">
          {mockCarts.map((cart) => (
            <div
              key={cart.id}
              className="bg-white rounded-xl border border-[#d7c2b9]/30 shadow-[0_4px_20px_-4px_rgba(137,80,50,0.08)] p-4 flex items-center gap-4 active:scale-[0.98] transition-all"
            >
              {/* Icon */}
              <div className="w-14 h-14 rounded-xl bg-[#efeeeb] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[26px] text-[#85736c]">
                  shopping_cart
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-label-lg text-[#1a1c1a] font-semibold truncate">
                    {cart.name}
                  </h3>
                  <Badge variant="secondary">{cart.retailer}</Badge>
                </div>
                <p className="text-body-sm text-[#85736c] mt-1">
                  {cart.itemCount} items &middot; ~{cart.estimatedTotal} &middot; {cart.createdAt}
                </p>
              </div>

              {/* Action */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpenCartId(cart.id)}
              >
                Open
              </Button>
            </div>
          ))}
        </div>

        {/* Empty state — shown after the single mock item as a call-to-action */}
        <div className="rounded-xl bg-[#f4f3f1] p-8 flex flex-col items-center text-center gap-4">
          <div className="w-20 h-20 rounded-xl bg-[#efeeeb] flex items-center justify-center">
            <span className="material-symbols-outlined text-[40px] text-[#d7c2b9]">
              shopping_cart
            </span>
          </div>
          <div>
            <p className="text-label-lg text-[#1a1c1a] font-semibold">Want more carts?</p>
            <p className="text-body-sm text-[#85736c] mt-1">
              Generate one from your recipes to get started.
            </p>
          </div>
          <Link href="/recipes">
            <Button variant="primary" icon="restaurant_menu">
              Browse Recipes
            </Button>
          </Link>
        </div>
      </div>

      {/* Shopping Cart Detail Overlay */}
      {openCartId && (
        <ShoppingCartDetailOverlay
          cartId={openCartId}
          onClose={() => setOpenCartId(null)}
        />
      )}
    </AppShell>
  );
}
