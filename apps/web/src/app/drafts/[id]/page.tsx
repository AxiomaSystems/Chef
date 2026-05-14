import type { BaseRecipe } from "@cart/shared";
import { notFound } from "next/navigation";
import { RecipeImage } from "@/components/ui/recipe-image";
import { PlanningDetailShell } from "@/components/planning/planning-detail-shell";
import type { DashboardCartDraft } from "@/components/dashboard/drafts-and-carts-section";
import { fetchAuthedResource, fetchCollection } from "@/lib/api";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default async function DraftDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const [draft, recipes] = await Promise.all([
    fetchAuthedResource<DashboardCartDraft>(`/cart-drafts/${id}`),
    fetchCollection<BaseRecipe>("/recipes"),
  ]);

  if (!draft.data) {
    notFound();
  }

  const recipeMap = new Map(recipes.data.map((recipe) => [recipe.id, recipe]));
  const selections = draft.data.selections.map((selection) => ({
    ...selection,
    recipe: recipeMap.get(selection.recipe_id),
  }));

  return (
    <PlanningDetailShell
      eyebrow="Draft"
      title={draft.data.name ?? "Untitled draft"}
      subtitle="A saved planning state you can revisit, inspect, and promote into a cart."
      metadata={
        <div className="grid gap-2">
          <div>
            <span className="font-semibold text-[#132326]">Retailer:</span>{" "}
            {draft.data.retailer}
          </div>
          <div>
            <span className="font-semibold text-[#132326]">Selections:</span>{" "}
            {draft.data.selections.length}
          </div>
          <div>
            <span className="font-semibold text-[#132326]">Updated:</span>{" "}
            {formatDate(draft.data.updated_at)}
          </div>
        </div>
      }
    >
      <section className="rounded-[2rem] border border-[#c0dedf] bg-white/60 p-6 shadow-sm backdrop-blur-sm">
        <div className="mb-5">
          <h2 className="font-sans font-bold text-3xl leading-none text-[#132326]">
            Selected recipes
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#5f8689]">
            This draft stores recipe selections plus retailer context before a
            final cart exists.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {selections.map((selection, index) => (
            <article
              key={`${selection.recipe_id}-${index}`}
              className="overflow-hidden rounded-[1.45rem] border border-[#c0dedf] bg-[#fff8ef]/70"
            >
              <RecipeImage
                src={selection.recipe?.cover_image_url}
                alt={selection.recipe?.name ?? selection.recipe_id}
                seed={selection.recipe?.id ?? selection.recipe_id}
                className="h-28 overflow-hidden border-b border-[#c0dedf]"
                imgClassName="h-full w-full object-cover"
              />

              <div className="grid gap-3 p-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f4790d]">
                    {selection.recipe?.cuisine.label ?? "Recipe"}
                  </p>
                  <h3 className="mt-2 font-sans font-bold text-[1.8rem] leading-[0.96] text-[#132326]">
                    {selection.recipe?.name ?? selection.recipe_id}
                  </h3>
                </div>

                <div className="grid gap-1 text-sm text-[#5f8689]">
                  <div>Quantity: {selection.quantity}</div>
                  <div>
                    Servings:{" "}
                    {selection.servings_override ??
                      selection.recipe?.servings ??
                      "Default"}
                  </div>
                </div>

                <p className="line-clamp-3 text-sm leading-6 text-[#5f8689]">
                  {selection.recipe?.description?.trim() ||
                    "No description yet for this recipe."}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </PlanningDetailShell>
  );
}
