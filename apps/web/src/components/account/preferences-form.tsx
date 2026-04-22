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
      className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#895032] px-6 text-sm font-semibold text-[#faf9f6] transition hover:bg-[#1a1c1a] disabled:cursor-not-allowed disabled:opacity-70"
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
    <section className="overflow-hidden rounded-[2rem] border border-[#d7c2b9] bg-white/72 shadow-[0_18px_54px_rgba(21,34,27,0.08)]">
      <div className="border-b border-[#d7c2b9] px-6 py-5 sm:px-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#895032]">
          Preferences
        </p>
        <h2 className="mt-2 font-sans font-bold text-4xl leading-none text-[#1a1c1a]">
          Culinary profile
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#85736c]">
          Refine the cuisines and system tags that shape discovery after the
          initial onboarding pass. Empty selections remain valid.
        </p>
      </div>

      <form action={formAction} className="grid gap-8 px-6 py-6 sm:px-7">
        <input
          type="hidden"
          name="shopping_location_kroger_location_id"
          defaultValue={props.preferences.shopping_location?.kroger_location_id ?? ""}
        />
        <section className="grid gap-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#895032]">
              Cuisines
            </p>
            <p className="mt-2 text-sm leading-6 text-[#85736c]">
              Keep a few anchors for the feed or clear everything and stay
              neutral.
            </p>
          </div>

          <div className="grid gap-5">
            {Object.entries(groupedCuisines).map(([kind, cuisines]) =>
              cuisines.length > 0 ? (
                <div key={kind} className="grid gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#895032]">
                    {KIND_LABELS[kind as Cuisine["kind"]]}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {cuisines.map((cuisine) => (
                      <label
                        key={cuisine.id}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#d7c2b9] bg-[#faf9f6]/68 px-4 py-2 text-sm text-[#1a1c1a]"
                      >
                        <input
                          type="checkbox"
                          name="preferred_cuisine_ids"
                          value={cuisine.id}
                          defaultChecked={props.preferences.preferred_cuisine_ids.includes(
                            cuisine.id,
                          )}
                          className="size-4 accent-[#895032]"
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

        <section className="grid gap-5 border-t border-[#d7c2b9] pt-7">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#895032]">
              Shopping location
            </p>
            <p className="mt-2 text-sm leading-6 text-[#85736c]">
              Keep a ZIP code or place label on file so future retailer
              providers can resolve nearby stores without asking from scratch.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#895032]">
                ZIP code
              </span>
              <input
                type="text"
                name="shopping_location_zip_code"
                defaultValue={props.preferences.shopping_location?.zip_code ?? ""}
                placeholder="60611"
                className="min-h-12 rounded-2xl border border-[#d7c2b9] bg-white/80 px-4 text-sm text-[#1a1c1a] outline-none transition placeholder:text-[#85736c]/72 focus:border-[#895032]"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#895032]">
                Place label
              </span>
              <input
                type="text"
                name="shopping_location_label"
                defaultValue={props.preferences.shopping_location?.label ?? ""}
                placeholder="Chicago, IL"
                className="min-h-12 rounded-2xl border border-[#d7c2b9] bg-white/80 px-4 text-sm text-[#1a1c1a] outline-none transition placeholder:text-[#85736c]/72 focus:border-[#895032]"
              />
            </label>
          </div>
        </section>

        <section className="grid gap-5 border-t border-[#d7c2b9] pt-7">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#895032]">
              Shared taste signals
            </p>
            <p className="mt-2 text-sm leading-6 text-[#85736c]">
              Preferences stay limited to system tags here so the account
              profile keeps a shared, curated taxonomy.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {props.tags.map((tag) => (
              <label
                key={tag.id}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#d7c2b9] bg-[#faf9f6]/68 px-4 py-2 text-sm text-[#1a1c1a]"
              >
                <input
                  type="checkbox"
                  name="preferred_tag_ids"
                  value={tag.id}
                  defaultChecked={props.preferences.preferred_tag_ids.includes(
                    tag.id,
                  )}
                  className="size-4 accent-[#895032]"
                />
                <span>{tag.name}</span>
              </label>
            ))}
          </div>
        </section>

        {state.error ? (
          <p className="rounded-2xl border border-[#ba1a1a]/20 bg-[#ba1a1a]/10 px-4 py-3 text-sm text-[#ba1a1a]">
            {state.error}
          </p>
        ) : null}

        {state.success ? (
          <p className="rounded-2xl border border-[#895032]/14 bg-[#895032]/8 px-4 py-3 text-sm text-[#1a1c1a]">
            {state.success}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <SaveButton />
          <p className="text-sm text-[#85736c]">
            This updates the same `/api/v1/me/preferences` surface used during
            onboarding.
          </p>
        </div>
      </form>
    </section>
  );
}
