import type { Cart } from "@cart/shared";
import { notFound } from "next/navigation";
import { PlanningDetailShell } from "@/components/planning/planning-detail-shell";
import { fetchAuthedResource } from "@/lib/api";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default async function CartDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const cart = await fetchAuthedResource<Cart>(`/carts/${id}`);

  if (!cart.data) {
    notFound();
  }

  return (
    <PlanningDetailShell
      eyebrow="Cart"
      title={cart.data.name ?? "Unnamed cart"}
      subtitle="A finalized planning pass with resolved dishes, ready for downstream shopping work."
      metadata={
        <div className="grid gap-2">
          <div>
            <span className="font-semibold text-[#132326]">Selections:</span>{" "}
            {cart.data.selections.length}
          </div>
          <div>
            <span className="font-semibold text-[#132326]">Dishes:</span>{" "}
            {cart.data.dishes.length}
          </div>
          <div>
            <span className="font-semibold text-[#132326]">Updated:</span>{" "}
            {formatDate(
              cart.data.updated_at ??
                cart.data.created_at ??
                new Date().toISOString(),
            )}
          </div>
        </div>
      }
    >
      <section className="rounded-[2rem] border border-[#c0dedf] bg-white/60 p-6 shadow-sm backdrop-blur-sm">
        <div className="mb-5">
          <h2 className="font-sans font-bold text-3xl leading-none text-[#132326]">
            Dishes
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#5f8689]">
            The cart resolves selections into dishes with ingredients and steps.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {cart.data.dishes.map((dish, index) => (
            <article
              key={`${dish.name}-${index}`}
              className="rounded-[1.45rem] border border-[#c0dedf] bg-[#fff8ef]/70 p-5"
            >
              <div className="grid gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f4790d]">
                    {dish.cuisine ?? "Dish"}
                  </p>
                  <h3 className="mt-2 font-sans font-bold text-[1.9rem] leading-[0.96] text-[#132326]">
                    {dish.name}
                  </h3>
                </div>

                <div className="grid gap-1 text-sm text-[#5f8689]">
                  <div>Servings: {dish.servings ?? "Default"}</div>
                  <div>Ingredients: {dish.ingredients.length}</div>
                  <div>Steps: {dish.steps.length}</div>
                </div>

                <div className="grid gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f4790d]">
                    Ingredients
                  </p>
                  <ul className="grid gap-1 text-sm leading-6 text-[#5f8689]">
                    {dish.ingredients
                      .slice(0, 5)
                      .map((ingredient, ingredientIndex) => (
                        <li
                          key={`${ingredient.canonical_ingredient}-${ingredientIndex}`}
                        >
                          {ingredient.amount} {ingredient.unit}{" "}
                          {ingredient.display_ingredient ??
                            ingredient.canonical_ingredient}
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </PlanningDetailShell>
  );
}
