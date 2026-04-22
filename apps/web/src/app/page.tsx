"use client";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const mockCarts = [
  {
    id: "1",
    name: "Weeknight Biryani",
    cuisine: "Pakistani",
    recipeCount: 3,
    retailer: "Kroger",
  },
  {
    id: "2",
    name: "Sunday Meal Prep",
    cuisine: "Mediterranean",
    recipeCount: 5,
    retailer: "Kroger",
  },
];

const recentRecipes = [
  { id: "1", name: "Hyderabadi Chicken Biryani", cuisine: "Pakistani" },
  { id: "2", name: "Greek Quinoa Bowl", cuisine: "Mediterranean" },
  { id: "3", name: "Salmon Teriyaki", cuisine: "Japanese" },
  { id: "4", name: "Avocado Egg Toast", cuisine: "American" },
  { id: "5", name: "Roasted Veggie Bowl", cuisine: "Mediterranean" },
];

export default function HomePage() {
  return (
    <AppShell>
      <div className="px-4 pt-6 pb-8 max-w-4xl mx-auto space-y-8">
        {/* Greeting */}
        <div>
          <p className="text-body-md text-[#85736c]">Welcome back</p>
          <h1 className="text-headline-md text-[#1a1c1a] font-bold mt-0.5">
            Here&apos;s your planning workspace.
          </h1>
        </div>

        {/* Primary CTA Banner */}
        <div className="bg-[#ffb38e] rounded-xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-[0_4px_20px_-4px_rgba(137,80,50,0.18)]">
          <div>
            <h2 className="text-headline-sm text-[#3d1e08] font-bold">Start Planning</h2>
            <p className="text-body-md text-[#7a4326] mt-1">
              Pick recipes, set quantities, generate a Kroger cart.
            </p>
          </div>
          <Button variant="primary" icon="add" className="shrink-0">
            New Cart
          </Button>
        </div>

        {/* Recent Carts */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-headline-sm text-[#1a1c1a]">Recent Carts</h2>
            <Link
              href="/shopping"
              className="text-label-md text-[#895032] hover:underline transition-all"
            >
              View all
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {mockCarts.map((cart) => (
              <div
                key={cart.id}
                className="bg-white rounded-xl border border-[#d7c2b9]/30 shadow-[0_4px_20px_-4px_rgba(137,80,50,0.08)] p-4 flex gap-4 active:scale-[0.98] transition-all"
              >
                {/* Image placeholder */}
                <div className="w-16 h-16 rounded-xl bg-[#efeeeb] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[28px] text-[#85736c]">
                    restaurant
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-label-lg text-[#1a1c1a] font-semibold truncate">
                    {cart.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="secondary">{cart.cuisine}</Badge>
                  </div>
                  <p className="text-body-sm text-[#85736c] mt-1">
                    {cart.recipeCount} recipes &middot; {cart.retailer}
                  </p>
                </div>
                <div className="flex items-end">
                  <Button variant="ghost" size="sm">
                    View Cart
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Browse Recipes */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-headline-sm text-[#1a1c1a]">Browse Recipes</h2>
            <Link
              href="/recipes"
              className="text-label-md text-[#895032] hover:underline transition-all flex items-center gap-1"
            >
              See all
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {recentRecipes.map((recipe) => (
              <Link
                key={recipe.id}
                href="/recipes"
                className="flex-shrink-0 bg-white rounded-full border border-[#d7c2b9]/30 shadow-[0_4px_20px_-4px_rgba(137,80,50,0.08)] px-4 py-2.5 flex items-center gap-2 hover:border-[#895032]/40 active:scale-[0.98] transition-all"
              >
                <span className="text-label-md text-[#1a1c1a] whitespace-nowrap font-medium">
                  {recipe.name}
                </span>
                <Badge variant="secondary" className="text-[10px]">
                  {recipe.cuisine}
                </Badge>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* FAB — mobile only */}
      <button className="lg:hidden fixed bottom-24 right-5 w-14 h-14 bg-[#895032] text-white rounded-full shadow-[0_8px_24px_-4px_rgba(137,80,50,0.45)] flex items-center justify-center active:scale-[0.95] transition-all z-40">
        <span className="material-symbols-outlined text-[28px]">add</span>
      </button>
    </AppShell>
  );
}
