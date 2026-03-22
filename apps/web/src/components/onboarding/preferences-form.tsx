"use client";

import type { Cuisine, Tag, UserPreferences } from "@cart/shared";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  savePreferencesAndCompleteAction,
  skipOnboardingAction,
  type OnboardingActionState,
} from "@/app/onboarding/actions";

const INITIAL_STATE: OnboardingActionState = {};

const KIND_LABELS: Record<Cuisine["kind"], string> = {
  national: "National",
  regional: "Regional",
  cultural: "Cultural",
  style: "Style",
  other: "Other",
};

function ContinueButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="inline-flex min-h-12 items-center justify-center rounded-full bg-[color:var(--forest)] px-6 text-sm font-semibold text-[color:var(--paper)] transition hover:bg-[color:var(--forest-strong)] disabled:cursor-not-allowed disabled:opacity-70"
      disabled={pending}
    >
      {pending ? "Saving..." : "Save and continue"}
    </button>
  );
}

export function PreferencesForm(props: {
  cuisines: Cuisine[];
  tags: Tag[];
  preferences: UserPreferences;
  initialError?: string;
}) {
  const [state, formAction] = useActionState(
    savePreferencesAndCompleteAction,
    props.initialError ? { error: props.initialError } : INITIAL_STATE,
  );

  const groupedCuisines = props.cuisines.reduce<Record<Cuisine["kind"], Cuisine[]>>(
    (groups, cuisine) => {
      groups[cuisine.kind].push(cuisine);
      return groups;
    },
    {
      national: [],
      regional: [],
      cultural: [],
      style: [],
      other: [],
    },
  );

  return (
    <div className="grid gap-8">
      <form action={formAction} className="grid gap-8">
        <input
          type="hidden"
          name="shopping_location_kroger_location_id"
          defaultValue={props.preferences.shopping_location?.kroger_location_id ?? ""}
        />
        <section className="grid gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--olive)]">
              Step 1
            </p>
            <h2 className="mt-2 font-display text-4xl leading-none text-[color:var(--forest-strong)]">
              What cuisines do you gravitate toward?
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--ink-soft)]">
              Pick a few to personalize the app. You can also skip this for now.
            </p>
          </div>

          <div className="grid gap-5">
            {Object.entries(groupedCuisines).map(([kind, cuisines]) =>
              cuisines.length > 0 ? (
                <div key={kind} className="grid gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--olive)]">
                    {KIND_LABELS[kind as Cuisine["kind"]]}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {cuisines.map((cuisine) => (
                      <label
                        key={cuisine.id}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[color:var(--line)] bg-white/70 px-4 py-2 text-sm text-[color:var(--ink)]"
                      >
                        <input
                          type="checkbox"
                          name="preferred_cuisine_ids"
                          value={cuisine.id}
                          defaultChecked={props.preferences.preferred_cuisine_ids.includes(
                            cuisine.id,
                          )}
                          className="size-4 accent-[color:var(--forest)]"
                        />
                        <span>{cuisine.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : null,
            )}
          </div>
        </section>

        <section className="grid gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--olive)]">
              Step 2
            </p>
            <h2 className="mt-2 font-display text-4xl leading-none text-[color:var(--forest-strong)]">
              What sounds good most often?
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--ink-soft)]">
              These shared tags drive the first-pass personalization for recipes
              and future recommendations.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {props.tags.map((tag) => (
              <label
                key={tag.id}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[color:var(--line)] bg-white/70 px-4 py-2 text-sm text-[color:var(--ink)]"
              >
                <input
                  type="checkbox"
                  name="preferred_tag_ids"
                  value={tag.id}
                  defaultChecked={props.preferences.preferred_tag_ids.includes(
                    tag.id,
                  )}
                  className="size-4 accent-[color:var(--forest)]"
                />
                <span>{tag.name}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="grid gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--olive)]">
              Step 3
            </p>
            <h2 className="mt-2 font-display text-4xl leading-none text-[color:var(--forest-strong)]">
              Where do you usually shop?
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--ink-soft)]">
              Add a ZIP code or place label now. Later this same profile field
              can be filled from GPS and used to resolve nearby stores.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--olive)]">
                ZIP code
              </span>
              <input
                type="text"
                name="shopping_location_zip_code"
                defaultValue={props.preferences.shopping_location?.zip_code ?? ""}
                placeholder="60611"
                className="min-h-12 rounded-2xl border border-[color:var(--line)] bg-white/70 px-4 text-sm text-[color:var(--forest-strong)] outline-none transition placeholder:text-[color:var(--ink-soft)]/72 focus:border-[color:var(--olive)]"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--olive)]">
                Place label
              </span>
              <input
                type="text"
                name="shopping_location_label"
                defaultValue={props.preferences.shopping_location?.label ?? ""}
                placeholder="Chicago, IL"
                className="min-h-12 rounded-2xl border border-[color:var(--line)] bg-white/70 px-4 text-sm text-[color:var(--forest-strong)] outline-none transition placeholder:text-[color:var(--ink-soft)]/72 focus:border-[color:var(--olive)]"
              />
            </label>
          </div>
        </section>

        {state.error ? (
          <p className="rounded-2xl border border-[color:var(--clay)]/20 bg-[color:var(--clay)]/10 px-4 py-3 text-sm text-[color:var(--clay)]">
            {state.error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <ContinueButton />
          <p className="text-sm text-[color:var(--ink-soft)]">
            You can save empty preferences if you just want to continue.
          </p>
        </div>
      </form>

      <form action={skipOnboardingAction}>
        <button
          type="submit"
          className="text-sm font-medium text-[color:var(--ink-soft)] underline decoration-[color:var(--olive)]/40 underline-offset-4 transition hover:text-[color:var(--forest-strong)]"
        >
          Skip for now
        </button>
      </form>
    </div>
  );
}
