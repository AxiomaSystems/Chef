import type { Cuisine, Tag, User, UserPreferences, UserStats } from "@cart/shared";
import { AppShell } from "@/components/layout/app-shell";
import { logoutAction } from "@/app/actions";
import { AccountDataProvider } from "./account-data-provider";
import { AccountSubNav } from "./account-sub-nav";

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

export function AccountShell(props: {
  user: User;
  stats: UserStats;
  preferences: UserPreferences;
  cuisines: Cuisine[];
  systemTags: Tag[];
  children: React.ReactNode;
}) {
  const initials = getInitials(props.user.name);

  return (
    <AppShell topBarTitle="Account">
      <div className="px-6 pt-6 pb-12 max-w-4xl mx-auto space-y-6">

        {/* ── Profile header ─────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm p-6 flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-primary-fixed-dim flex items-center justify-center shrink-0">
            <span className="text-on-primary-fixed font-black text-xl">{initials || "U"}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-headline-sm font-bold text-on-surface">{props.user.name}</h1>
            <p className="text-body-sm text-outline mt-0.5">{props.user.email}</p>
            <div className="flex gap-1.5 mt-2">
              {(props.user.auth_providers ?? []).map((p) => (
                <span key={p} className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[10px] font-bold uppercase tracking-wide">
                  {p === "password" ? "Email" : "Google"}
                </span>
              ))}
            </div>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-outline-variant text-label-sm text-on-surface-variant hover:bg-surface-container-low transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              Sign out
            </button>
          </form>
        </div>

        {/* ── Stats row ──────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Recipes",        value: props.stats.owned_recipe_count,   icon: "receipt_long" },
            { label: "Cart Drafts",    value: props.stats.cart_draft_count,     icon: "draft" },
            { label: "Carts",          value: props.stats.cart_count,           icon: "shopping_bag" },
            { label: "Shopping Carts", value: props.stats.shopping_cart_count,  icon: "shopping_cart" },
          ].map(({ label, value, icon }) => (
            <div key={label} className="bg-white rounded-2xl border border-outline-variant/30 p-4 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-primary-surface flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary text-[20px]">{icon}</span>
              </div>
              <div>
                <p className="text-headline-sm font-black text-on-surface leading-none">{value}</p>
                <p className="text-[10px] text-outline mt-0.5 font-semibold uppercase tracking-wide">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Sub-nav ────────────────────────────────────── */}
        <AccountSubNav />

        {/* ── Page content ───────────────────────────────── */}
        <AccountDataProvider
          user={props.user}
          stats={props.stats}
          preferences={props.preferences}
          cuisines={props.cuisines}
          systemTags={props.systemTags}
        >
          {props.children}
        </AccountDataProvider>
      </div>
    </AppShell>
  );
}
