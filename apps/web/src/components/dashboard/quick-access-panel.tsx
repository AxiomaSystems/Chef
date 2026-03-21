import type {
  BaseRecipe,
  ShoppingCartHistorySummary,
  UserPreferences,
} from "@cart/shared";
import Link from "next/link";
import { SectionShell } from "./section-shell";

export function QuickAccessPanel(props: {
  preferences: UserPreferences;
  suggestedRecipes: BaseRecipe[];
  latestShopping?: ShoppingCartHistorySummary;
  formatDate: (iso: string) => string;
  formatMoney: (value: number) => string;
}) {
  const hasPreferences =
    props.preferences.preferred_cuisines.length > 0 ||
    props.preferences.preferred_tags.length > 0;

  return (
    <div className="grid gap-6">
      <SectionShell
        title="Quick access"
        eyebrow="Taste signals"
        note="Only the cues that help you re-enter planning quickly."
      >
        <div className="grid gap-6">
          <div>
            <div className="mb-3 text-sm font-semibold text-[color:var(--forest-strong)]">
              Preferred cuisines
            </div>
            {props.preferences.preferred_cuisines.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {props.preferences.preferred_cuisines.slice(0, 6).map((cuisine) => (
                  <span
                    key={cuisine.id}
                    className="rounded-full border border-[color:var(--line)] bg-[color:var(--paper)]/72 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--forest-strong)]"
                  >
                    {cuisine.label}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-6 text-[color:var(--ink-soft)]">
                No cuisine preferences yet. Tune them once and they will start
                shaping the recipe shelf and future cart flows.
              </p>
            )}
          </div>

          <div>
            <div className="mb-3 text-sm font-semibold text-[color:var(--forest-strong)]">
              Shared tags
            </div>
            {props.preferences.preferred_tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {props.preferences.preferred_tags.slice(0, 8).map((tag) => (
                  <span
                    key={tag.id}
                    className="rounded-full border border-[color:var(--olive)]/20 bg-[color:var(--olive)]/9 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--forest-strong)]"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-6 text-[color:var(--ink-soft)]">
                No shared tags selected yet. A small set of signals goes a long
                way when you come back to plan dinner.
              </p>
            )}
          </div>

          {hasPreferences ? (
            <Link
              href="/account/settings/preferences"
              className="inline-flex min-h-11 items-center rounded-full border border-[color:var(--line)] bg-white/60 px-4 text-sm font-semibold text-[color:var(--forest-strong)] transition hover:border-[color:var(--olive)] hover:bg-[color:var(--paper)]"
            >
              Refine preferences
            </Link>
          ) : null}
        </div>
      </SectionShell>

      <SectionShell
        title="Useful context"
        eyebrow="Secondary"
        note="Helpful, but never louder than the planning state."
      >
        <div className="grid gap-6">
          <div>
            <div className="mb-3 text-sm font-semibold text-[color:var(--forest-strong)]">
              Suggested from your signals
            </div>
            {props.suggestedRecipes.length > 0 ? (
              <div className="grid gap-3">
                {props.suggestedRecipes.map((recipe) => (
                  <article
                    key={recipe.id}
                    className="rounded-[1.35rem] border border-[color:var(--line)] bg-white/56 px-4 py-4"
                  >
                    <h3 className="text-lg font-semibold text-[color:var(--forest-strong)]">
                      {recipe.name}
                    </h3>
                    <p className="mt-1 text-sm text-[color:var(--ink-soft)]">
                      {recipe.cuisine.label} · {recipe.tags
                        .slice(0, 2)
                        .map((tag) => tag.name)
                        .join(" · ") || "No tags"}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-6 text-[color:var(--ink-soft)]">
                As your preferences and recipe library grow, this space can
                surface tighter shortcuts into planning.
              </p>
            )}
          </div>

          <div id="shopping-status" className="rounded-[1.45rem] border border-[color:var(--line)] bg-[linear-gradient(145deg,rgba(255,255,255,0.94),rgba(239,229,210,0.72))] px-4 py-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--olive)]">
              Latest shopping handoff
            </div>
            {props.latestShopping ? (
              <div className="mt-3 grid gap-2">
                <div className="text-3xl font-semibold text-[color:var(--forest-strong)]">
                  {props.formatMoney(props.latestShopping.estimated_subtotal)}
                </div>
                <p className="text-sm leading-6 text-[color:var(--ink-soft)]">
                  {props.latestShopping.overview_count} overview items ·{" "}
                  {props.latestShopping.matched_item_count} matched lines for{" "}
                  {props.latestShopping.retailer}.
                </p>
                <div className="text-xs uppercase tracking-[0.16em] text-[color:var(--olive)]">
                  Updated {props.formatDate(props.latestShopping.updated_at)}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-[color:var(--ink-soft)]">
                No shopping cart has been handed off yet. Once one exists, this
                slot becomes the fastest glance into the retailer side.
              </p>
            )}
          </div>
        </div>
      </SectionShell>
    </div>
  );
}
