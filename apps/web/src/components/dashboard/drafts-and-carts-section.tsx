import type { Cart, CartSelection } from "@cart/shared";
import type { Loadable } from "@/lib/api";
import { SectionShell } from "./section-shell";
import { StatusPill } from "./status-pill";

export type DashboardCartDraft = {
  id: string;
  user_id?: string;
  name?: string;
  selections: CartSelection[];
  retailer: string;
  created_at: string;
  updated_at: string;
};

export function DraftsAndCartsSection(props: {
  drafts: Loadable<DashboardCartDraft[]>;
  carts: Loadable<Cart[]>;
  formatDate: (iso: string) => string;
}) {
  const { drafts, carts, formatDate } = props;

  return (
    <SectionShell
      eyebrow="Authenticated read"
      title="Drafts and Carts"
      note="These internal resources now resolve through the authenticated session instead of the temporary dev actor header."
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <StatusPill ok={drafts.ok} label="Drafts" />
        <StatusPill ok={carts.ok} label="Carts" />
      </div>

      <div className="grid gap-3">
        {drafts.data.slice(0, 3).map((draft) => (
          <article
            key={draft.id}
            className="rounded-[1.35rem] border border-[#c0dedf] bg-white/50 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-[#132326]">
                  {draft.name ?? "Untitled draft"}
                </h3>
                <p className="text-sm text-[#5f8689]">
                  {draft.selections.length} selections / {draft.retailer}
                </p>
              </div>
              <span className="text-xs uppercase tracking-[0.18em] text-[#f4790d]">
                {formatDate(draft.updated_at)}
              </span>
            </div>
          </article>
        ))}

        {carts.data.slice(0, 3).map((cart) => (
          <article
            key={cart.id}
            className="rounded-[1.35rem] border border-[#c0dedf] bg-[#fff8ef]/70 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-[#132326]">
                  {cart.name ?? "Unnamed cart"}
                </h3>
                <p className="text-sm text-[#5f8689]">
                  {cart.selections.length} selections / {cart.dishes.length}{" "}
                  dishes
                </p>
              </div>
              <span className="text-xs uppercase tracking-[0.18em] text-[#f4790d]">
                {formatDate(cart.updated_at ?? new Date().toISOString())}
              </span>
            </div>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}
