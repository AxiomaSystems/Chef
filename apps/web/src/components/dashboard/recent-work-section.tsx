import type { BaseRecipe, Cart } from "@cart/shared";
import { SectionShell } from "./section-shell";
import type { DashboardCartDraft } from "./drafts-and-carts-section";

type PlanningItem =
  | {
      id: string;
      kind: "draft";
      title: string;
      subtitle: string;
      updatedAt: string;
    }
  | {
      id: string;
      kind: "cart";
      title: string;
      subtitle: string;
      updatedAt: string;
    };

function TypeBadge(props: { kind: PlanningItem["kind"] | "recipe" }) {
  const tone =
    props.kind === "draft"
      ? "border-[color:var(--olive)]/20 bg-[color:var(--olive)]/10 text-[color:var(--forest-strong)]"
      : props.kind === "cart"
        ? "border-[color:var(--clay)]/18 bg-[color:var(--clay)]/10 text-[color:var(--clay)]"
        : "border-[color:var(--line)] bg-white/72 text-[color:var(--ink-soft)]";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${tone}`}
    >
      {props.kind}
    </span>
  );
}

export function RecentWorkSection(props: {
  planningItems: PlanningItem[];
  recipes: BaseRecipe[];
  formatDate: (iso: string) => string;
}) {
  return (
    <SectionShell
      title="Recent work"
      eyebrow="Resume-able"
      note="Start where the product is hottest: planning states first, library context second."
    >
      <div id="recent-work" className="grid gap-8">
        <div>
          <div className="mb-3 flex items-center justify-between gap-4">
            <h3 className="text-lg font-semibold text-[color:var(--forest-strong)]">
              Planning queue
            </h3>
            <span className="text-xs uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">
              drafts and carts
            </span>
          </div>

          {props.planningItems.length > 0 ? (
            <div className="grid gap-3">
              {props.planningItems.map((item) => (
                <article
                  key={`${item.kind}-${item.id}`}
                  className="rounded-[1.45rem] border border-[color:var(--line)] bg-[color:var(--paper)]/76 px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <TypeBadge kind={item.kind} />
                      <h4 className="mt-3 truncate text-lg font-semibold text-[color:var(--forest-strong)]">
                        {item.title}
                      </h4>
                      <p className="mt-1 text-sm text-[color:var(--ink-soft)]">
                        {item.subtitle}
                      </p>
                    </div>
                    <span className="shrink-0 pt-1 text-xs uppercase tracking-[0.16em] text-[color:var(--olive)]">
                      {props.formatDate(item.updatedAt)}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-[1.45rem] border border-dashed border-[color:var(--line)] bg-white/46 px-4 py-5 text-sm leading-6 text-[color:var(--ink-soft)]">
              Nothing is in progress yet. The next planning run will show up
              here as soon as you build a draft or persist a cart.
            </div>
          )}
        </div>

        <div id="recipe-library">
          <div className="mb-3 flex items-center justify-between gap-4">
            <h3 className="text-lg font-semibold text-[color:var(--forest-strong)]">
              Recipe shelf
            </h3>
            <span className="text-xs uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">
              recent visible recipes
            </span>
          </div>

          <div className="grid gap-3">
            {props.recipes.map((recipe) => (
              <article
                key={recipe.id}
                className="rounded-[1.45rem] border border-[color:var(--line)] bg-white/56 px-4 py-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <TypeBadge kind="recipe" />
                    <h4 className="mt-3 truncate text-lg font-semibold text-[color:var(--forest-strong)]">
                      {recipe.name}
                    </h4>
                    <p className="mt-1 text-sm text-[color:var(--ink-soft)]">
                      {recipe.cuisine.label} · {recipe.servings} servings ·{" "}
                      {recipe.tags.slice(0, 2).map((tag) => tag.name).join(" · ") ||
                        "No tags yet"}
                    </p>
                  </div>
                  <span className="shrink-0 pt-1 text-xs uppercase tracking-[0.16em] text-[color:var(--olive)]">
                    {props.formatDate(recipe.updated_at)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

export function buildPlanningItems(
  drafts: DashboardCartDraft[],
  carts: Cart[],
): PlanningItem[] {
  const normalizedDrafts: PlanningItem[] = drafts.map((draft) => ({
    id: draft.id,
    kind: "draft",
    title: draft.name ?? "Untitled draft",
    subtitle: `${draft.selections.length} selections · ${draft.retailer}`,
    updatedAt: draft.updated_at,
  }));

  const normalizedCarts: PlanningItem[] = carts.map((cart) => ({
    id: cart.id ?? `cart-${cart.updated_at ?? cart.created_at ?? "unknown"}`,
    kind: "cart",
    title: cart.name ?? "Unnamed cart",
    subtitle: `${cart.selections.length} selections · ${cart.dishes.length} dishes`,
    updatedAt: cart.updated_at ?? cart.created_at ?? new Date().toISOString(),
  }));

  return [...normalizedDrafts, ...normalizedCarts]
    .toSorted(
      (left, right) =>
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
    )
    .slice(0, 6);
}
