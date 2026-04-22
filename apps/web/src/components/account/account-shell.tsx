import type {
  Cuisine,
  Tag,
  User,
  UserPreferences,
  UserStats,
} from "@cart/shared";
import { logoutAction } from "@/app/actions";
import { AccountDataProvider } from "./account-data-provider";
import { AccountSidebar } from "./account-sidebar";

export function AccountShell(props: {
  user: User;
  stats: UserStats;
  preferences: UserPreferences;
  cuisines: Cuisine[];
  systemTags: Tag[];
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="rounded-[2.75rem] border border-[#d7c2b9] bg-[#1a1c1a] shadow-sm">
        <div className="grid min-h-[calc(100vh-5rem)] gap-0 lg:grid-cols-[320px_minmax(0,1fr)]">
          <AccountSidebar
            user={props.user}
            logoutAction={logoutAction}
            stats={props.stats}
          />

          <AccountDataProvider
            user={props.user}
            stats={props.stats}
            preferences={props.preferences}
            cuisines={props.cuisines}
            systemTags={props.systemTags}
          >
            <div className="bg-[#faf9f6]/88 px-6 py-7 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
              <div className="max-w-4xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#895032]">
                  Account
                </p>
                <h1 className="mt-3 font-sans font-bold text-5xl leading-[0.95] text-[#1a1c1a] sm:text-6xl">
                  Tune the kitchen ledger around you.
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-[#85736c]">
                  Keep your public identity clean, update the name attached to
                  your recipes, refine the cuisines and shared tags that shape
                  the feed, and manage the account security model behind the
                  app.
                </p>
              </div>

              <div className="mt-8">{props.children}</div>
            </div>
          </AccountDataProvider>
        </div>
      </section>
    </div>
  );
}
