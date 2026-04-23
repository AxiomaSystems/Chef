"use client";

import type { BaseRecipe } from "@cart/shared";
import { useState } from "react";
import { RecipeDetailOverlay } from "@/components/recipes/recipe-detail-overlay";
import { Badge } from "@/components/ui/badge";
import { RecipeImage } from "@/components/ui/recipe-image";

export function HeroRecipe({
  recipe,
  onAddToCart,
}: {
  recipe: BaseRecipe;
  onAddToCart: (recipe: BaseRecipe) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <section
        className="md:col-span-8 group cursor-pointer"
        onClick={() => setOpen(true)}
      >
        <div className="bg-white rounded-[2rem] overflow-hidden shadow-[0_4px_20px_rgba(137,80,50,0.08)] border border-outline-variant/20 relative min-h-[420px] flex flex-col">
          {/* Image */}
          <div className="absolute inset-0">
            <RecipeImage
              src={recipe.cover_image_url}
              alt={recipe.name}
              seed={recipe.id}
              className="absolute inset-0 w-full h-full"
              imgClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          </div>

          {/* Content */}
          <div className="absolute bottom-0 left-0 p-8 w-full">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                Featured Recipe
              </span>
              <Badge variant="primary">{recipe.cuisine.label}</Badge>
              {recipe.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag.id}
                  className="bg-white/20 text-white px-2.5 py-0.5 rounded-full text-[10px] font-semibold"
                >
                  {tag.name}
                </span>
              ))}
            </div>

            <h3 className="text-white text-[clamp(1.25rem,3vw,2rem)] font-black leading-tight mb-3">
              {recipe.name}
            </h3>

            <div className="flex items-center gap-6 text-white/90 mb-6 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary-fixed-dim text-[18px]">group</span>
                <span className="text-label-lg">{recipe.servings} servings</span>
              </div>
              {recipe.nutrition_data?.calories && (
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary-fixed-dim text-[18px]">local_fire_department</span>
                  <span className="text-label-lg">{recipe.nutrition_data.calories} kcal</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary-fixed-dim text-[18px]">receipt_long</span>
                <span className="text-label-lg">{recipe.ingredients.length} ingredients</span>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddToCart(recipe);
              }}
              className="bg-primary-fixed-dim hover:bg-primary-fixed text-on-primary-fixed px-8 py-3 rounded-full font-bold text-label-lg transition-all active:scale-[0.97] shadow-xl"
            >
              Add to Cart
            </button>
          </div>
        </div>
      </section>

      <RecipeDetailOverlay
        recipe={open ? recipe : null}
        onClose={() => setOpen(false)}
        onAddToCart={(r) => { setOpen(false); onAddToCart(r); }}
      />
    </>
  );
}
