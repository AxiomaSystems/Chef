"use client";

import type { BaseRecipe } from "@cart/shared";
import Link from "next/link";
import { useState } from "react";
import { RecipeDetailOverlay } from "@/components/recipes/recipe-detail-overlay";
import { RecipeImage } from "@/components/ui/recipe-image";

function getDietaryBadge(recipe: BaseRecipe) {
  return recipe.tags.find((t) => t.kind === "dietary_badge") ?? null;
}

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
    <section className="space-y-5 pt-2">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-headline-md font-bold text-on-surface">Quick Recipe Ideas</h4>
          <p className="text-body-sm text-outline mt-0.5">Pick something to cook tonight</p>
        </div>
        <Link
          href="/recipes"
          className="text-primary font-bold text-label-lg hover:underline flex items-center gap-1 shrink-0"
        >
          See all
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {recipes.slice(0, 8).map((recipe) => {
          const badge = getDietaryBadge(recipe);
          return (
            <div
              key={recipe.id}
              className="group cursor-pointer flex flex-col gap-2.5"
              onClick={() => setSelected(recipe)}
            >
              {/* Image */}
              <div className="aspect-square rounded-2xl overflow-hidden relative bg-surface-container">
                <RecipeImage
                  src={recipe.cover_image_url}
                  alt={recipe.name}
                  seed={recipe.id}
                  className="absolute inset-0 w-full h-full"
                  imgClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />

                {/* Dietary badge overlay */}
                {badge && (
                  <span className="absolute bottom-2 left-2 rounded-full bg-white/90 backdrop-blur-sm px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#895032]">
                    {badge.name}
                  </span>
                )}

                {/* Add to cart on hover */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToCart(recipe);
                  }}
                  className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-outline hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                  aria-label="Add to cart"
                >
                  <span className="material-symbols-outlined text-[16px]">add_shopping_cart</span>
                </button>
              </div>

              {/* Info */}
              <div>
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest">
                  {recipe.cuisine.label}
                </p>
                <h5 className="text-label-lg font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-2 leading-snug mt-0.5">
                  {recipe.name}
                </h5>
                <p className="text-body-sm text-outline mt-0.5 flex items-center gap-2">
                  <span className="flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[13px]">group</span>
                    {recipe.servings}
                  </span>
                  {recipe.nutrition_data?.calories && (
                    <span className="flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[13px]">local_fire_department</span>
                      {recipe.nutrition_data.calories} kcal
                    </span>
                  )}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <RecipeDetailOverlay
        recipe={selected}
        onClose={() => setSelected(null)}
        onAddToCart={(r) => { setSelected(null); onAddToCart(r); }}
      />
    </section>
  );
}
