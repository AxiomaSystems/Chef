"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RecipeDetailOverlay } from "@/components/recipes/recipe-detail-overlay";

type Recipe = {
  id: string;
  name: string;
  cuisine: string;
  time: string;
  kcal: number;
  tags: string[];
  image?: string;
};

const recipes: Recipe[] = [
  {
    id: "1",
    name: "Hyderabadi Chicken Biryani",
    cuisine: "Pakistani",
    time: "60 min",
    kcal: 680,
    tags: ["Halal"],
    image: "https://images.unsplash.com/photo-1563379091339-03246963e5f8?w=800",
  },
  {
    id: "2",
    name: "Greek Quinoa Bowl",
    cuisine: "Mediterranean",
    time: "25 min",
    kcal: 420,
    tags: ["Vegan", "Gluten-Free"],
  },
  {
    id: "3",
    name: "Salmon Teriyaki",
    cuisine: "Japanese",
    time: "30 min",
    kcal: 520,
    tags: ["High Protein"],
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400",
  },
  {
    id: "4",
    name: "Avocado Egg Toast",
    cuisine: "American",
    time: "10 min",
    kcal: 290,
    tags: ["Quick"],
  },
  {
    id: "5",
    name: "Roasted Veggie Bowl",
    cuisine: "Mediterranean",
    time: "40 min",
    kcal: 380,
    tags: ["Vegan"],
  },
];

const filterOptions = ["All", "Pakistani", "Mediterranean", "Italian", "Vegan", "High Protein"];

function RecipeImagePlaceholder({ className }: { className?: string }) {
  return (
    <div className={`bg-[#efeeeb] flex items-center justify-center ${className ?? ""}`}>
      <span className="material-symbols-outlined text-[40px] text-[#85736c]">restaurant</span>
    </div>
  );
}

export default function RecipesPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedRecipe, setSelectedRecipe] = useState<string | null>(null);

  const filtered =
    activeFilter === "All"
      ? recipes
      : recipes.filter(
          (r) =>
            r.cuisine === activeFilter ||
            r.tags.includes(activeFilter),
        );

  const [featured, ...rest] = filtered;

  return (
    <AppShell topBarTitle="Recipes">
      <div className="px-4 pt-6 pb-8 max-w-5xl mx-auto space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-headline-lg text-[#1a1c1a] font-bold">Recipes</h1>
          <p className="text-body-md text-[#85736c] mt-1">Browse and add to your cart.</p>
        </div>

        {/* Hero Action Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#ffb38e] rounded-xl p-5 flex flex-col gap-3 cursor-pointer active:scale-[0.98] transition-all shadow-[0_4px_20px_-4px_rgba(137,80,50,0.14)]">
            <span className="material-symbols-outlined text-[32px] text-[#7a4326]">
              auto_fix_high
            </span>
            <div>
              <p className="text-label-lg font-semibold text-[#3d1e08]">System Recipes</p>
              <p className="text-body-sm text-[#7a4326] mt-0.5">Curated by Chef</p>
            </div>
          </div>
          <div className="bg-[#fcb1b8] rounded-xl p-5 flex flex-col gap-3 cursor-pointer active:scale-[0.98] transition-all shadow-[0_4px_20px_-4px_rgba(136,77,84,0.14)]">
            <span className="material-symbols-outlined text-[32px] text-[#794147]">bookmark</span>
            <div>
              <p className="text-label-lg font-semibold text-[#3d1e08]">My Recipes</p>
              <p className="text-body-sm text-[#794147] mt-0.5">Your saved collection</p>
            </div>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {filterOptions.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-label-md font-semibold transition-all active:scale-[0.97] ${
                activeFilter === filter
                  ? "bg-[#895032] text-white"
                  : "bg-[#efe3b3] text-[#6d643f] hover:bg-[#e3d69a]"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Bento Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-body-md text-[#85736c]">
            No recipes match this filter.
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-4">
            {/* Featured large card */}
            {featured && (
              <div
                className="col-span-12 lg:col-span-8 relative rounded-xl overflow-hidden cursor-pointer group active:scale-[0.98] transition-all shadow-[0_4px_20px_-4px_rgba(137,80,50,0.12)]"
                style={{ minHeight: 300 }}
                onClick={() => setSelectedRecipe(featured.id)}
              >
                {featured.image ? (
                  <img
                    src={featured.image}
                    alt={featured.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <RecipeImagePlaceholder className="absolute inset-0 w-full h-full" />
                )}
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <Badge variant="primary">{featured.cuisine}</Badge>
                    {featured.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="bg-white/20 text-white border-white/30">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <h2 className="text-headline-sm text-white font-bold">{featured.name}</h2>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-body-sm text-white/80 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">schedule</span>
                      {featured.time}
                    </span>
                    <span className="text-body-sm text-white/80 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">local_fire_department</span>
                      {featured.kcal} kcal
                    </span>
                  </div>
                  <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="primary"
                      size="sm"
                      icon="add_shopping_cart"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      Add to Cart
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Smaller cards */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
              {rest.slice(0, 2).map((recipe) => (
                <div
                  key={recipe.id}
                  className="bg-white rounded-xl border border-[#d7c2b9]/30 shadow-[0_4px_20px_-4px_rgba(137,80,50,0.08)] overflow-hidden cursor-pointer group active:scale-[0.98] transition-all flex gap-3"
                  onClick={() => setSelectedRecipe(recipe.id)}
                >
                  <div className="w-24 h-24 flex-shrink-0 relative">
                    {recipe.image ? (
                      <img
                        src={recipe.image}
                        alt={recipe.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <RecipeImagePlaceholder className="w-full h-full" />
                    )}
                  </div>
                  <div className="flex-1 py-3 pr-3 min-w-0">
                    <div className="flex flex-wrap gap-1 mb-1">
                      <Badge variant="secondary">{recipe.cuisine}</Badge>
                    </div>
                    <h3 className="text-label-lg text-[#1a1c1a] font-semibold line-clamp-2 leading-snug">
                      {recipe.name}
                    </h3>
                    <p className="text-body-sm text-[#85736c] mt-1">
                      {recipe.time} &middot; {recipe.kcal} kcal
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Remaining cards row */}
            {rest.slice(2).map((recipe) => (
              <div
                key={recipe.id}
                className="col-span-12 sm:col-span-6 lg:col-span-4 bg-white rounded-xl border border-[#d7c2b9]/30 shadow-[0_4px_20px_-4px_rgba(137,80,50,0.08)] overflow-hidden cursor-pointer group active:scale-[0.98] transition-all"
                onClick={() => setSelectedRecipe(recipe.id)}
              >
                <div className="h-36 relative">
                  {recipe.image ? (
                    <img
                      src={recipe.image}
                      alt={recipe.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <RecipeImagePlaceholder className="w-full h-full" />
                  )}
                </div>
                <div className="p-3">
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    <Badge variant="secondary">{recipe.cuisine}</Badge>
                    {recipe.tags.slice(0, 1).map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <h3 className="text-label-lg text-[#1a1c1a] font-semibold leading-snug">
                    {recipe.name}
                  </h3>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-body-sm text-[#85736c]">
                      {recipe.time} &middot; {recipe.kcal} kcal
                    </p>
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-[#895032] hover:text-[#7a4326]"
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Add to cart"
                    >
                      <span className="material-symbols-outlined text-[20px]">add_shopping_cart</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recipe Detail Overlay */}
      {selectedRecipe && (
        <RecipeDetailOverlay
          recipeId={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
        />
      )}
    </AppShell>
  );
}
