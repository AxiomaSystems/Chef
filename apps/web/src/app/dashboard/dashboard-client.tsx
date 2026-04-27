"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BaseRecipe, Cart, ShoppingCart, User } from "@cart/shared";
import { AppShell } from "@/components/layout/app-shell";
import { HeroRecipe } from "./hero-recipe";
import { CartSidebarCards } from "./cart-sidebar-cards";
import { QuickRecipes } from "./quick-recipes";
import { submitDraftFlowAction, createShoppingCartAction } from "@/app/home-actions";

export function DashboardClient({
  user,
  recipes,
  carts,
  shoppingCarts,
}: {
  user: User | null;
  recipes: BaseRecipe[];
  carts: Cart[];
  shoppingCarts: ShoppingCart[];
}) {
  const router = useRouter();
  const [selections, setSelections] = useState<Map<string, BaseRecipe>>(new Map());
  const [buildError, setBuildError] = useState<string | undefined>();
  const [isBuilding, startBuilding] = useTransition();

  const firstName = user?.name?.split(" ")[0] ?? "there";
  const featuredRecipe = recipes[0] ?? null;
  const latestShoppingCart = shoppingCarts[0] ?? null;
  const latestCart = carts[0] ?? null;
  const browseRecipes = recipes.slice(1); // exclude featured from grid

  function handleAddToCart(recipe: BaseRecipe) {
    setSelections((prev) => {
      const next = new Map(prev);
      next.set(recipe.id, recipe);
      return next;
    });
  }

  function removeSelection(id: string) {
    setSelections((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }

  function handleBuildCart() {
    if (selections.size === 0) return;
    setBuildError(undefined);

    startBuilding(async () => {
      const items = Array.from(selections.values());
      const fd = new FormData();
      fd.set("intent", "generate");
      fd.set(
        "selections_json",
        JSON.stringify(items.map((r) => ({ recipe_id: r.id, quantity: 1 }))),
      );
      fd.set("retailer", "kroger");

      const cartResult = await submitDraftFlowAction({}, fd);
      if (cartResult.error || !cartResult.resourceId) {
        setBuildError(cartResult.error ?? "Failed to build cart.");
        return;
      }

      const scResult = await createShoppingCartAction(cartResult.resourceId, "kroger");
      if (scResult.error) {
        setBuildError(scResult.error);
        return;
      }

      router.push("/shopping");
    });
  }

  return (
    <AppShell>
      <div className="px-6 py-8 max-w-6xl mx-auto space-y-10">
        {/* Greeting */}
        <section className="space-y-1">
          <h2 className="text-headline-lg text-on-surface font-bold">Welcome, {firstName}!</h2>
          <p className="text-body-lg text-outline">What are you planning to cook this week?</p>
        </section>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {featuredRecipe ? (
            <HeroRecipe recipe={featuredRecipe} onAddToCart={handleAddToCart} />
          ) : (
            <section className="md:col-span-8">
              <div className="bg-surface-container rounded-4xl min-h-105 flex items-center justify-center">
                <p className="text-body-md text-outline">No recipes yet — check back soon.</p>
              </div>
            </section>
          )}

          <CartSidebarCards
            latestShoppingCart={latestShoppingCart}
            latestCart={latestCart}
            cartCount={carts.length}
            shoppingCartCount={shoppingCarts.length}
          />
        </div>

        {/* Recipe grid */}
        <QuickRecipes
          recipes={browseRecipes.length > 0 ? browseRecipes : recipes}
          onAddToCart={handleAddToCart}
        />
      </div>

      {/* Cart builder bar */}
      {selections.size > 0 && (
        <div className="fixed bottom-20 lg:bottom-0 left-0 right-0 z-40 flex justify-center px-4 pb-4 lg:pb-6 pointer-events-none">
          <div className="bg-on-surface rounded-2xl shadow-2xl p-4 flex items-center gap-4 w-full max-w-lg pointer-events-auto">
            <div className="flex-1 min-w-0">
              <p className="text-label-lg text-white font-semibold">
                {selections.size} recipe{selections.size !== 1 ? "s" : ""} selected
              </p>
              <div className="flex gap-1.5 mt-1 flex-wrap">
                {Array.from(selections.values()).map((recipe) => (
                  <button
                    key={recipe.id}
                    onClick={() => removeSelection(recipe.id)}
                    className="flex items-center gap-1 bg-white/10 text-white text-[11px] font-medium px-2 py-0.5 rounded-full hover:bg-white/20 transition-colors"
                  >
                    {recipe.name.length > 20 ? recipe.name.slice(0, 20) + "…" : recipe.name}
                    <span className="material-symbols-outlined text-[12px]">close</span>
                  </button>
                ))}
              </div>
              {buildError && (
                <p className="text-primary-fixed-dim text-body-sm mt-1">{buildError}</p>
              )}
            </div>
            <button
              onClick={handleBuildCart}
              disabled={isBuilding}
              className="shrink-0 bg-primary-fixed-dim text-on-primary-fixed font-semibold text-label-md px-4 py-2.5 rounded-xl hover:bg-primary-fixed active:scale-[0.97] transition-all disabled:opacity-60 flex items-center gap-2"
            >
              {isBuilding ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                  Building…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
                  Generate Cart
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
