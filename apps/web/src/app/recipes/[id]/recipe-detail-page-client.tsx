"use client";

import { useMemo, useState, useTransition } from "react";
import type { BaseRecipe } from "@cart/shared";
import { useRouter } from "next/navigation";
import {
  createShoppingCartAction,
  submitDraftFlowAction,
} from "@/app/home-actions";
import { HandsFreeMode } from "@/components/hands-free-mode";
import { RecipeImage } from "@/components/ui/recipe-image";

type RecipeTab = "ingredients" | "steps";

function prepMinutes(recipe: BaseRecipe) {
  return Math.max(20, recipe.steps.length * 7);
}

function splitStepCopy(copy: string) {
  const parts = copy.split(/(?<=[.!?])\s+/);
  return {
    title: parts[0] ?? copy,
    body: parts.slice(1).join(" "),
  };
}

export function RecipeDetailPageClient({ recipe }: { recipe: BaseRecipe }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<RecipeTab>("ingredients");
  const [handsFreeOpen, setHandsFreeOpen] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const [isAddingToCart, startAddToCartTransition] = useTransition();
  const nutrition = recipe.nutrition_data ?? {};
  const badges = recipe.tags
    .filter((tag) => tag.kind === "dietary_badge")
    .slice(0, 2);

  const nutritionCards = useMemo(
    () => [
      {
        label: "Calories",
        value: nutrition.calories ? String(nutrition.calories) : "-",
      },
      {
        label: "Protein",
        value: nutrition.protein_g ? `${nutrition.protein_g}g` : "-",
      },
      {
        label: "Carbs",
        value: nutrition.carbs_g ? `${nutrition.carbs_g}g` : "-",
      },
      { label: "Fats", value: nutrition.fat_g ? `${nutrition.fat_g}g` : "-" },
    ],
    [
      nutrition.calories,
      nutrition.carbs_g,
      nutrition.fat_g,
      nutrition.protein_g,
    ],
  );

  function addIngredientsToCart() {
    setCartError(null);
    startAddToCartTransition(async () => {
      const formData = new FormData();
      formData.set("intent", "generate");
      formData.set("name", `${recipe.name} cart`);
      formData.set("retailer", "kroger");
      formData.set(
        "selections_json",
        JSON.stringify([{ recipe_id: recipe.id, quantity: 1 }]),
      );

      const cartResult = await submitDraftFlowAction({}, formData);

      if (cartResult.error || !cartResult.resourceId) {
        setCartError(cartResult.error ?? "Unable to add this recipe to cart.");
        return;
      }

      const shoppingCartResult = await createShoppingCartAction(
        cartResult.resourceId,
        "kroger",
      );

      if (shoppingCartResult.error) {
        setCartError(shoppingCartResult.error);
        return;
      }

      router.push("/shopping");
    });
  }

  return (
    <main className="mx-auto max-w-4xl px-4 pb-36 pt-4 sm:px-6 lg:pb-10 lg:pt-8">
      <article className="overflow-hidden rounded-[2rem] bg-[#fffdfa] shadow-[0_18px_60px_rgba(60,154,158,0.12)] lg:rounded-[2.25rem]">
        <section className="relative">
          <div className="relative h-[21rem] overflow-hidden bg-surface-container sm:h-[30rem]">
            <RecipeImage
              src={recipe.cover_image_url}
              alt={recipe.name}
              seed={recipe.id}
              className="h-full w-full"
              imgClassName="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,14,9,0.04)_0%,rgba(20,14,9,0.18)_42%,rgba(20,14,9,0.62)_100%)]" />
            <button
              type="button"
              className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white text-primary shadow-sm"
              aria-label="Save recipe"
            >
              <span className="material-symbols-outlined icon-filled text-[21px]">
                favorite
              </span>
            </button>
            <div className="absolute inset-x-0 bottom-0 p-5 pb-12 text-white sm:p-7 sm:pb-16">
              <h1 className="max-w-2xl text-[2.35rem] font-black leading-[0.95] sm:text-[3.6rem]">
                {recipe.name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] font-bold">
                <span>{prepMinutes(recipe)} min</span>
                <span className="h-1 w-1 rounded-full bg-white/70" />
                <span>{recipe.cuisine.label}</span>
                {badges.map((badge) => (
                  <span
                    key={badge.id}
                    className="rounded-full bg-white/18 px-2.5 py-1"
                  >
                    {badge.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="-mt-5 grid grid-cols-4 gap-0 px-4 sm:-mt-8 sm:px-7">
          {nutritionCards.map((item) => (
            <div
              key={item.label}
              className="relative bg-white px-2 py-4 text-center shadow-[0_10px_28px_rgba(60,154,158,0.08)] first:rounded-l-2xl last:rounded-r-2xl"
            >
              <p className="text-[1.05rem] font-black leading-tight text-on-surface sm:text-headline-sm">
                {item.value}
              </p>
              <p className="mt-1 text-[10px] font-semibold text-outline sm:text-label-md">
                {item.label}
              </p>
            </div>
          ))}
        </section>

        <section className="px-4 pt-6 sm:px-7">
          <div className="grid grid-cols-2 border-b border-outline-variant/30">
            {(["ingredients", "steps"] as RecipeTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`relative py-3 text-label-lg capitalize ${
                  activeTab === tab ? "text-primary" : "text-outline"
                }`}
              >
                {tab}
                {activeTab === tab ? (
                  <span className="absolute inset-x-8 bottom-0 h-0.5 rounded-full bg-primary-fixed-dim" />
                ) : null}
              </button>
            ))}
          </div>
        </section>

        <section className="min-h-[21rem] px-4 py-4 sm:px-7 sm:py-6">
          {activeTab === "ingredients" ? (
            <div className="space-y-3">
              {recipe.ingredients.map((ingredient, index) => (
                <div
                  key={`${ingredient.canonical_ingredient}-${index}`}
                  className="flex items-center gap-3 rounded-[1.15rem] border border-outline-variant/25 bg-white px-4 py-3"
                >
                  <span className="material-symbols-outlined text-primary-fixed-dim">
                    grocery
                  </span>
                  <span className="min-w-0 flex-1 text-body-sm font-semibold text-on-surface">
                    {ingredient.display_ingredient ??
                      ingredient.canonical_ingredient}
                    {ingredient.preparation
                      ? `, ${ingredient.preparation}`
                      : ""}
                  </span>
                  <span className="shrink-0 text-body-sm text-outline">
                    {ingredient.amount} {ingredient.unit}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {recipe.steps.map((step) => {
                const copy = splitStepCopy(step.what_to_do);
                return (
                  <div
                    key={step.step}
                    className="flex gap-3 rounded-[1.25rem] border border-outline-variant/25 bg-white p-4"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-fixed-dim text-label-lg text-on-primary-fixed">
                      {step.step}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-label-lg text-on-surface">
                        {copy.title}
                      </span>
                      {copy.body ? (
                        <span className="mt-1 block text-body-sm text-on-surface-variant">
                          {copy.body}
                        </span>
                      ) : null}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="sticky bottom-0 border-t border-outline-variant/25 bg-[#fffdfa]/95 px-4 py-4 backdrop-blur-sm sm:px-7">
          {cartError ? (
            <p className="mb-3 rounded-2xl border border-error/20 bg-error-container/35 px-3 py-2 text-center text-body-sm text-error">
              {cartError}
            </p>
          ) : null}
          <button
            type="button"
            onClick={addIngredientsToCart}
            disabled={isAddingToCart}
            className="mb-3 flex min-h-13 w-full items-center justify-center gap-2 rounded-full border border-primary-fixed-dim bg-white px-5 py-3 text-label-lg font-black text-primary-fixed-dim shadow-sm transition-colors hover:bg-primary-surface disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[20px]">
              {isAddingToCart ? "progress_activity" : "add_shopping_cart"}
            </span>
            {isAddingToCart
              ? "Adding ingredients..."
              : "Add ingredients to cart"}
          </button>
          <button
            type="button"
            onClick={() => setHandsFreeOpen(true)}
            className="flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-primary-fixed-dim px-5 py-3 text-label-lg font-black text-on-primary-fixed shadow-[0_12px_28px_rgba(244,121,13,0.25)]"
          >
            <span className="material-symbols-outlined text-[20px]">mic</span>
            Start hands-free mode
            <span className="material-symbols-outlined text-[18px]">
              arrow_forward
            </span>
          </button>
        </section>
      </article>

      {handsFreeOpen ? (
        <HandsFreeMode
          recipe={recipe}
          onClose={() => setHandsFreeOpen(false)}
        />
      ) : null}
    </main>
  );
}
