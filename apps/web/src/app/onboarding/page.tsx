import type { Cuisine, Tag, User, UserPreferences } from "@cart/shared";
import { redirect } from "next/navigation";
import { PreferencesForm } from "@/components/onboarding/preferences-form";
import {
  fetchAuthedResource,
  fetchCollection,
} from "@/lib/api";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function OnboardingPage(props: {
  searchParams: SearchParams;
}) {
  const [me, preferences, cuisines, publicTags, searchParams] = await Promise.all([
    fetchAuthedResource<User>("/me"),
    fetchAuthedResource<UserPreferences>("/me/preferences"),
    fetchCollection<Cuisine>("/cuisines"),
    fetchCollection<Tag>("/tags"),
    props.searchParams,
  ]);

  if (!me.data) {
    redirect("/login");
  }

  if (me.data.onboarding_completed_at) {
    redirect("/");
  }

  const initialError =
    searchParams.error === "skip-failed"
      ? "Unable to complete onboarding right now."
      : undefined;

  const systemTags = publicTags.data.filter((tag) => tag.scope === "system");
  const safePreferences =
    preferences.data ?? {
      preferred_cuisine_ids: [],
      preferred_cuisines: [],
      preferred_tag_ids: [],
      preferred_tags: [],
    };

  return (
    <main className="min-h-screen px-5 py-6 sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section className="relative overflow-hidden rounded-[2.5rem] border border-[color:var(--line)] bg-[color:var(--forest)] px-6 py-8 text-[color:var(--paper)] shadow-[var(--shadow)] sm:px-8 lg:px-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,240,228,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(161,77,49,0.28),transparent_30%)]" />
          <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.36em] text-[color:var(--paper-strong)]/80">
                Welcome
              </p>
              <h1 className="mt-3 max-w-3xl font-display text-5xl leading-[0.95] sm:text-6xl">
                Set a starting point for your recipe feed.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[color:var(--paper-strong)]/82 sm:text-lg">
                Pick cuisines and shared tags to shape your first experience.
                You can skip and keep both lists empty if you want to get
                straight into the app.
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-white/12 bg-white/8 p-5 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--paper-strong)]/72">
                Signed in
              </p>
              <div className="mt-3 text-lg font-semibold text-[color:var(--paper)]">
                {me.data.name}
              </div>
              <div className="mt-1 text-sm text-[color:var(--paper-strong)]/78">
                {me.data.email}
              </div>
              <div className="mt-5 grid gap-3 text-sm text-[color:var(--paper-strong)]/82">
                <div>{cuisines.data.length} cuisines available</div>
                <div>{systemTags.length} system tags available</div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-[color:var(--line)] bg-white/70 p-6 shadow-[var(--shadow)] backdrop-blur-sm sm:p-8">
          <PreferencesForm
            cuisines={cuisines.data}
            tags={systemTags}
            preferences={safePreferences}
            initialError={initialError}
          />
        </section>
      </div>
    </main>
  );
}
