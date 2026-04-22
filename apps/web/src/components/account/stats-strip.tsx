import type { UserStats } from "@cart/shared";

export function StatsStrip(props: { stats: UserStats }) {
  const items = [
    {
      label: "Owned recipes",
      value: props.stats.owned_recipe_count,
    },
    {
      label: "Cart drafts",
      value: props.stats.cart_draft_count,
    },
    {
      label: "Carts",
      value: props.stats.cart_count,
    },
    {
      label: "Shopping carts",
      value: props.stats.shopping_cart_count,
    },
    {
      label: "Preferred cuisines",
      value: props.stats.preferred_cuisine_count,
    },
    {
      label: "Preferred tags",
      value: props.stats.preferred_tag_count,
    },
  ];

  return (
    <section className="overflow-hidden rounded-[2rem] border border-[#d7c2b9] bg-[linear-gradient(180deg,rgba(255,255,255,0.68),rgba(245,240,228,0.78))] shadow-[0_18px_54px_rgba(21,34,27,0.08)]">
      <div className="border-b border-[#d7c2b9] px-6 py-5 sm:px-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#895032]">
          Snapshot
        </p>
        <h2 className="mt-2 font-sans font-bold text-4xl leading-none text-[#1a1c1a]">
          Your workspace at a glance
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#85736c]">
          Lightweight counters from `/api/v1/me/stats`, meant to anchor the
          account surface without turning it into a full analytics dashboard.
        </p>
      </div>

      <div className="grid gap-px bg-[#d7c2b9] sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="bg-white/72 px-6 py-5 sm:px-7"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#895032]">
              {item.label}
            </div>
            <div className="mt-3 font-sans font-bold text-5xl leading-none text-[#1a1c1a]">
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
