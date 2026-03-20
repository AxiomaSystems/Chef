import type {
  Cuisine,
  Tag,
  User,
  UserPreferences,
  UserStats,
} from "@cart/shared";
import { logoutAction } from "@/app/actions";
import { AccountSidebar } from "./account-sidebar";
import { PreferencesForm } from "./preferences-form";
import { ProfileForm } from "./profile-form";
import { StatsStrip } from "./stats-strip";

export function AccountShell(props: {
  user: User;
  stats: UserStats;
  preferences: UserPreferences;
  cuisines: Cuisine[];
  systemTags: Tag[];
}) {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="rounded-[2.75rem] border border-[color:var(--line)] bg-[color:var(--forest-strong)] shadow-[var(--shadow)]">
        <div className="grid min-h-[calc(100vh-5rem)] gap-0 lg:grid-cols-[320px_minmax(0,1fr)]">
          <AccountSidebar user={props.user} logoutAction={logoutAction} />

          <div className="bg-[color:var(--paper)]/88 px-6 py-7 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
            <div className="max-w-4xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[color:var(--olive)]">
                Account
              </p>
              <h1 className="mt-3 font-display text-5xl leading-[0.95] text-[color:var(--forest-strong)] sm:text-6xl">
                Tune the kitchen ledger around you.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-[color:var(--ink-soft)]">
                Keep your public identity clean, update the name attached to
                your recipes, and refine the cuisines and shared tags that shape
                the feed after onboarding.
              </p>
            </div>

            <div className="mt-8 grid gap-6">
              <StatsStrip stats={props.stats} />
              <ProfileForm user={props.user} />
              <PreferencesForm
                preferences={props.preferences}
                cuisines={props.cuisines}
                tags={props.systemTags}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
