import type { UserStats } from "@cart/shared";

export function DashboardStatsStrip(props: { stats: UserStats }) {
  const items = [
    {
      label: "Owned recipes",
      value: props.stats.owned_recipe_count,
    },
    {
      label: "Planning states",
      value: props.stats.cart_draft_count + props.stats.cart_count,
    },
    {
      label: "Shopping carts",
      value: props.stats.shopping_cart_count,
    },
    {
      label: "Preference signals",
      value:
        props.stats.preferred_cuisine_count + props.stats.preferred_tag_count,
    },
  ];

  return (
    <section className="rounded-[1.75rem] border border-[color:var(--line)] bg-white/52 px-5 py-4 shadow-[var(--shadow)] backdrop-blur-sm sm:px-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="flex items-end justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--olive)]">
                {item.label}
              </div>
              <div className="mt-2 text-3xl font-semibold text-[color:var(--forest-strong)]">
                {item.value}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
