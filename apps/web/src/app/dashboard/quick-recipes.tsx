"use client";

import type { BaseRecipe } from "@cart/shared";
import Link from "next/link";
import { useState } from "react";
import { RecipeDetailOverlay } from "@/components/recipes/recipe-detail-overlay";
import { RecipeImage } from "@/components/ui/recipe-image";

export function QuickRecipes({
  recipes,
  onAddToCart,
}: {
  recipes: BaseRecipe[];
  onAddToCart: (recipe: BaseRecipe) => void;
}) {
  const [selected, setSelected] = useState<BaseRecipe | null>(null);

  if (recipes.length === 0) return null;

  return (
    <section className="space-y-6 pt-2">
      <div className="flex items-center justify-between">
        <h4 className="text-headline-md font-bold text-on-surface">Browse Recipes</h4>
        <Link
          href="/recipes"
          className="text-primary font-bold text-label-lg hover:underline flex items-center gap-1"
        >
          See all
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {recipes.slice(0, 8).map((recipe) => (
          <div
            key={recipe.id}
            className="space-y-3 group cursor-pointer"
            onClick={() => setSelected(recipe)}
          >
            {/* Square image */}
            <div className="aspect-square rounded-3xl overflow-hidden relative bg-surface-container">
              <RecipeImage
                src={recipe.cover_image_url}
                alt={recipe.name}
                seed={recipe.id}
                className="absolute inset-0 w-full h-full"
                imgClassName="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              {/* Add to cart overlay button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCart(recipe);
                }}
                className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-outline hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                aria-label="Add to cart"
              >
                <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
              </button>
            </div>

            {/* Info */}
            <div>
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                {recipe.cuisine.label}
              </span>
              <h5 className="text-label-lg font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-2 leading-snug mt-0.5">
                {recipe.name}
              </h5>
              <p className="text-body-sm text-outline mt-0.5">
                {recipe.servings} servings
                {recipe.nutrition_data?.calories ? ` · ${recipe.nutrition_data.calories} kcal` : ""}
              </p>
            </div>
          </div>
        ))}
      </div>

      <RecipeDetailOverlay
        recipe={selected}
        onClose={() => setSelected(null)}
        onAddToCart={(r) => { setSelected(null); onAddToCart(r); }}
      />
    </section>
  );
}
