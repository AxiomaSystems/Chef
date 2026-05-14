import type { ShoppingCartHistorySummary } from "@cart/shared";
import type { Loadable } from "@/lib/api";
import { SectionShell } from "./section-shell";
import { StatusPill } from "./status-pill";

export function ShoppingHistorySection(props: {
  shoppingHistory: Loadable<ShoppingCartHistorySummary[]>;
  formatDate: (iso: string) => string;
  formatMoney: (value: number) => string;
}) {
  const { shoppingHistory, formatDate, formatMoney } = props;

  return (
    <SectionShell
      eyebrow="Retail layer"
      title="Shopping Cart History"
      note="These snapshots sit on the retailer-facing side of the planning model. Product matching can stay mock-backed in development or switch to a real retailer provider behind the same boundary."
    >
      <div className="mb-4 flex items-center justify-between">
        <StatusPill
          ok={shoppingHistory.ok}
          label={shoppingHistory.ok ? "History ready" : "History issue"}
        />
        {!shoppingHistory.ok && shoppingHistory.error ? (
          <span className="text-sm text-[#ba1a1a]">
            {shoppingHistory.error}
          </span>
        ) : null}
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {shoppingHistory.data.slice(0, 6).map((shoppingCart) => (
          <article
            key={shoppingCart.id}
            className="rounded-[1.5rem] border border-[#c0dedf] bg-[linear-gradient(145deg,rgba(255,255,255,0.92),rgba(192,222,223,0.76))] p-5"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f4790d]">
              {shoppingCart.retailer}
            </p>
            <h3 className="mt-2 font-sans font-bold text-3xl text-[#132326]">
              {formatMoney(shoppingCart.estimated_subtotal)}
            </h3>
            <p className="mt-2 text-sm text-[#5f8689]">
              Cart {shoppingCart.cart_id}
            </p>
            <div className="mt-5 flex items-end justify-between">
              <div className="space-y-1 text-sm text-[#5f8689]">
                <div>{shoppingCart.overview_count} overview items</div>
                <div>{shoppingCart.matched_item_count} matched items</div>
              </div>
              <span className="text-xs uppercase tracking-[0.18em] text-[#f4790d]">
                {formatDate(shoppingCart.updated_at)}
              </span>
            </div>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}
