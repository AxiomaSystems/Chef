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
      <div className="mx-auto max-w-4xl space-y-5 px-4 pb-12 pt-5 sm:space-y-6 sm:px-6 sm:pt-6">

        {/* ── Profile header ─────────────────────────────── */}
        <div className="flex flex-col gap-4 rounded-2xl border border-outline-variant/30 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:gap-5 sm:p-6">
          <div className="flex items-center gap-4 sm:flex-1 sm:min-w-0">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-fixed-dim sm:h-16 sm:w-16">
            <span className="text-xl font-black text-on-primary-fixed">{initials || "U"}</span>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-title-lg font-bold text-on-surface sm:text-headline-sm">{props.user.name}</h1>
            <p className="mt-0.5 truncate text-body-sm text-outline">{props.user.email}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(props.user.auth_providers ?? []).map((p) => (
                <span key={p} className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[10px] font-bold uppercase tracking-wide">
                  {p === "password" ? "Email" : "Google"}
                </span>
              ))}
            </div>
          </div>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex min-h-10 w-full items-center justify-center gap-2 rounded-full border border-outline-variant px-4 py-2 text-label-sm text-on-surface-variant transition-colors hover:bg-surface-container-low sm:w-auto"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              Sign out
            </button>
          </form>
        </div>

        {/* ── Stats row ──────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Recipes",        value: props.stats.owned_recipe_count,   icon: "receipt_long" },
            { label: "Cart Drafts",    value: props.stats.cart_draft_count,     icon: "draft" },
            { label: "Carts",          value: props.stats.cart_count,           icon: "shopping_bag" },
            { label: "Shopping Carts", value: props.stats.shopping_cart_count,  icon: "shopping_cart" },
          ].map(({ label, value, icon }) => (
            <div key={label} className="flex min-w-0 items-center gap-2 rounded-2xl border border-outline-variant/30 bg-white p-3 shadow-sm sm:gap-3 sm:p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-surface sm:h-10 sm:w-10">
                <span className="material-symbols-outlined text-primary text-[20px]">{icon}</span>
              </div>
              <div className="min-w-0">
                <p className="text-headline-sm font-black text-on-surface leading-none">{value}</p>
                <p className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-wide text-outline">{label}</p>
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
