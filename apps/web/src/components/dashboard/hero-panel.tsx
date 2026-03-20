import type { User } from "@cart/shared";
import Link from "next/link";

export function HeroPanel(props: {
  me: User | null;
  visibleRecipes: number;
  totalSelections: number;
  cartCount: number;
  shoppingCartCount: number;
  logoutAction: () => Promise<void>;
}) {
  const metrics = [
    {
      label: "Visible recipes",
      value: props.visibleRecipes,
      tone: "text-[color:var(--paper)]",
    },
    {
      label: "Draft selections",
      value: props.totalSelections,
      tone: "text-[color:var(--paper)]",
    },
    {
      label: "Persisted carts",
      value: props.cartCount,
      tone: "text-[color:var(--paper)]",
    },
    {
      label: "Shopping carts",
      value: props.shoppingCartCount,
      tone: "text-[color:var(--paper)]",
    },
  ];

  return (
    <section className="relative overflow-hidden rounded-[2.5rem] border border-[color:var(--line)] bg-[color:var(--forest)] px-6 py-8 text-[color:var(--paper)] shadow-[var(--shadow)] sm:px-8 lg:px-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,240,228,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(161,77,49,0.28),transparent_30%)]" />
      <div className="relative grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.36em] text-[color:var(--paper-strong)]/80">
            Internal v1 Control Room
          </p>
          <h1 className="mt-3 max-w-3xl font-display text-5xl leading-[0.95] sm:text-6xl">
            Recipes become meal-plan carts. Carts become shopping carts.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[color:var(--paper-strong)]/82 sm:text-lg">
            The web app now authenticates against the live{" "}
            <code>/api/v1</code> contract using bearer tokens stored in
            HTTP-only cookies. Public recipes stay readable, while drafts,
            carts, and shopping-cart history now load through the real auth
            path.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-[1.5rem] border border-white/12 bg-white/8 p-4 backdrop-blur-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--paper-strong)]/72">
              Signed in
            </div>
            <div className="mt-2 text-lg font-semibold text-[color:var(--paper)]">
              {props.me?.name ?? "Unknown user"}
            </div>
            <div className="mt-1 text-sm text-[color:var(--paper-strong)]/78">
              {props.me?.email ?? "Missing profile"}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Link
                href="/account"
                className="inline-flex items-center rounded-full border border-white/14 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--paper)] transition hover:bg-white/16"
              >
                Account
              </Link>
              <form action={props.logoutAction}>
                <button
                  type="submit"
                  className="inline-flex items-center rounded-full border border-white/14 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--paper)] transition hover:bg-white/16"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>

          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-[1.5rem] border border-white/12 bg-white/8 p-4 backdrop-blur-sm"
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--paper-strong)]/72">
                {metric.label}
              </div>
              <div className={`mt-2 text-4xl font-semibold ${metric.tone}`}>
                {metric.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
