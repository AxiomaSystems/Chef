"use client";

import type { Cuisine, Tag, UserPreferences } from "@cart/shared";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  updatePreferencesAction,
  type PreferencesActionState,
} from "@/app/account/actions";

const INITIAL_STATE: PreferencesActionState = {};

const KIND_LABELS: Record<Cuisine["kind"], string> = {
  national: "National",
  regional: "Regional",
  cultural: "Cultural",
  style: "Style",
  other: "Other",
};

function SaveButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="inline-flex min-h-12 items-center justify-center rounded-full bg-[color:var(--forest)] px-6 text-sm font-semibold text-[color:var(--paper)] transition hover:bg-[color:var(--forest-strong)] disabled:cursor-not-allowed disabled:opacity-70"
      disabled={pending}
    >
      {pending ? "Saving..." : "Save preferences"}
    </button>
  );
}

export function PreferencesForm(props: {
  cuisines: Cuisine[];
  tags: Tag[];
  preferences: UserPreferences;
}) {
  const [state, formAction] = useActionState(
    updatePreferencesAction,
    INITIAL_STATE,
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
    <section className="overflow-hidden rounded-[2rem] border border-[color:var(--line)] bg-white/72 shadow-[0_18px_54px_rgba(21,34,27,0.08)]">
      <div className="border-b border-[color:var(--line)] px-6 py-5 sm:px-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--olive)]">
          Preferences
        </p>
        <h2 className="mt-2 font-display text-4xl leading-none text-[color:var(--forest-strong)]">
          Culinary profile
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--ink-soft)]">
          Refine the cuisines and system tags that shape discovery after the
          initial onboarding pass. Empty selections remain valid.
        </p>
      </div>

      <form action={formAction} className="grid gap-8 px-6 py-6 sm:px-7">
        <section className="grid gap-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--olive)]">
              Cuisines
            </p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">
              Keep a few anchors for the feed or clear everything and stay
              neutral.
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
                        className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[color:var(--line)] bg-[color:var(--paper)]/68 px-4 py-2 text-sm text-[color:var(--ink)]"
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

        <section className="grid gap-5 border-t border-[color:var(--line)] pt-7">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--olive)]">
              Shared taste signals
            </p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">
              Preferences stay limited to system tags here so the account
              profile keeps a shared, curated taxonomy.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {props.tags.map((tag) => (
              <label
                key={tag.id}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[color:var(--line)] bg-[color:var(--paper)]/68 px-4 py-2 text-sm text-[color:var(--ink)]"
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

        {state.error ? (
          <p className="rounded-2xl border border-[color:var(--clay)]/20 bg-[color:var(--clay)]/10 px-4 py-3 text-sm text-[color:var(--clay)]">
            {state.error}
          </p>
        ) : null}

        {state.success ? (
          <p className="rounded-2xl border border-[color:var(--forest)]/14 bg-[color:var(--forest)]/8 px-4 py-3 text-sm text-[color:var(--forest-strong)]">
            {state.success}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <SaveButton />
          <p className="text-sm text-[color:var(--ink-soft)]">
            This updates the same `/api/v1/me/preferences` surface used during
            onboarding.
          </p>
        </div>
      </form>
    </section>
  );
}
