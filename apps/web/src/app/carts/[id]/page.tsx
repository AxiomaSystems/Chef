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
            <span className="font-semibold text-[color:var(--forest-strong)]">
              Selections:
            </span>{" "}
            {cart.data.selections.length}
          </div>
          <div>
            <span className="font-semibold text-[color:var(--forest-strong)]">
              Dishes:
            </span>{" "}
            {cart.data.dishes.length}
          </div>
          <div>
            <span className="font-semibold text-[color:var(--forest-strong)]">
              Updated:
            </span>{" "}
            {formatDate(cart.data.updated_at ?? cart.data.created_at ?? new Date().toISOString())}
          </div>
        </div>
      }
    >
      <section className="rounded-[2rem] border border-[color:var(--line)] bg-white/60 p-6 shadow-[var(--shadow)] backdrop-blur-sm">
        <div className="mb-5">
          <h2 className="font-display text-3xl leading-none text-[color:var(--forest-strong)]">
            Dishes
          </h2>
          <p className="mt-3 text-sm leading-6 text-[color:var(--ink-soft)]">
            The cart resolves selections into dishes with ingredients and steps.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {cart.data.dishes.map((dish, index) => (
            <article
              key={`${dish.name}-${index}`}
              className="rounded-[1.45rem] border border-[color:var(--line)] bg-[color:var(--paper)]/70 p-5"
            >
              <div className="grid gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--olive)]">
                    {dish.cuisine ?? "Dish"}
                  </p>
                  <h3 className="mt-2 font-display text-[1.9rem] leading-[0.96] text-[color:var(--forest-strong)]">
                    {dish.name}
                  </h3>
                </div>

                <div className="grid gap-1 text-sm text-[color:var(--ink-soft)]">
                  <div>Servings: {dish.servings ?? "Default"}</div>
                  <div>Ingredients: {dish.ingredients.length}</div>
                  <div>Steps: {dish.steps.length}</div>
                </div>

                <div className="grid gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--olive)]">
                    Ingredients
                  </p>
                  <ul className="grid gap-1 text-sm leading-6 text-[color:var(--ink-soft)]">
                    {dish.ingredients.slice(0, 5).map((ingredient, ingredientIndex) => (
                      <li key={`${ingredient.canonical_ingredient}-${ingredientIndex}`}>
                        {ingredient.amount} {ingredient.unit} {ingredient.display_ingredient ?? ingredient.canonical_ingredient}
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
