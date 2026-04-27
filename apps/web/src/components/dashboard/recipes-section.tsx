import type { BaseRecipe } from "@cart/shared";
import type { Loadable } from "@/lib/api";
import { SectionShell } from "./section-shell";
import { StatusPill } from "./status-pill";

export function RecipesSection(props: { recipes: Loadable<BaseRecipe[]> }) {
  const { recipes } = props;

  return (
    <SectionShell
      eyebrow="Public read"
      title="Recipes"
      note="These calls remain public and expose the visible recipe catalog without requiring user context in the web app."
    >
      <div className="mb-4 flex items-center justify-between">
        <StatusPill ok={recipes.ok} label={recipes.ok ? "Connected" : "Issue"} />
        {!recipes.ok && recipes.error ? (
          <span className="text-sm text-[#ba1a1a]">
            {recipes.error}
          </span>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {recipes.data.slice(0, 6).map((recipe) => (
          <article
            key={recipe.id}
            className="rounded-[1.4rem] border border-[#d7c2b9] bg-[#faf9f6]/65 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-sans font-bold text-2xl text-[#1a1c1a]">
                  {recipe.name}
                </h3>
                <p className="mt-1 text-sm text-[#85736c]">
                  {recipe.cuisine.label} / {recipe.servings} servings
                </p>
              </div>
              <span className="rounded-full bg-[#895032] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#faf9f6]">
                {recipe.is_system_recipe ? "system" : "user"}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {recipe.tags
                .filter((tag) => tag.kind === "dietary_badge")
                .slice(0, 4)
                .map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-full border border-[#d7c2b9] bg-[rgba(250,246,236,0.92)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#895032]"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}
