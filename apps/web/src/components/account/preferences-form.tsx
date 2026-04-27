"use client";

import type { Cuisine, Tag, UserPreferences } from "@cart/shared";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updatePreferencesAction, type PreferencesActionState } from "@/app/account/actions";

const INITIAL_STATE: PreferencesActionState = {};

const KIND_LABELS: Record<Cuisine["kind"], string> = {
  national: "National", regional: "Regional", cultural: "Cultural", style: "Style", other: "Other",
};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-on-primary font-semibold text-label-md hover:bg-on-primary-container disabled:opacity-50 transition-colors"
    >
      {pending && <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>}
      {pending ? "Saving…" : "Save preferences"}
    </button>
  );
}

export function PreferencesForm({ cuisines, tags, preferences }: {
  cuisines: Cuisine[];
  tags: Tag[];
  preferences: UserPreferences;
}) {
  const [state, formAction] = useActionState(updatePreferencesAction, INITIAL_STATE);

  const grouped = cuisines.reduce<Record<Cuisine["kind"], Cuisine[]>>(
    (acc, c) => { acc[c.kind].push(c); return acc; },
    { national: [], regional: [], cultural: [], style: [], other: [] },
  );

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="shopping_location_kroger_location_id" defaultValue={preferences.shopping_location?.kroger_location_id ?? ""} />

      {/* ── Cuisines ───────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-outline-variant/30">
          <p className="text-label-sm text-primary uppercase tracking-widest">Cuisines</p>
          <h2 className="text-headline-sm font-bold text-on-surface mt-1">Culinary profile</h2>
          <p className="text-body-sm text-outline mt-1">
            Select the cuisines that shape your recipe feed. Leave empty to stay neutral.
          </p>
        </div>
        <div className="px-6 py-6 space-y-6">
          {Object.entries(grouped).map(([kind, list]) =>
            list.length > 0 ? (
              <div key={kind}>
                <p className="text-label-sm text-outline uppercase tracking-widest mb-3">
                  {KIND_LABELS[kind as Cuisine["kind"]]}
                </p>
                <div className="flex flex-wrap gap-2">
                  {list.map((cuisine) => (
                    <label
                      key={cuisine.id}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-outline-variant bg-surface-container-low text-body-sm text-on-surface cursor-pointer hover:border-primary hover:bg-primary-surface transition-colors has-[:checked]:bg-primary has-[:checked]:text-on-primary has-[:checked]:border-primary"
                    >
                      <input
                        type="checkbox"
                        name="preferred_cuisine_ids"
                        value={cuisine.id}
                        defaultChecked={preferences.preferred_cuisine_ids.includes(cuisine.id)}
                        className="sr-only"
                      />
                      {cuisine.label}
                    </label>
                  ))}
                </div>
              </div>
            ) : null,
          )}
        </div>
      </section>

      {/* ── Shopping location ──────────────────────────── */}
      <section className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-outline-variant/30">
          <p className="text-label-sm text-primary uppercase tracking-widest">Location</p>
          <h2 className="text-headline-sm font-bold text-on-surface mt-1">Shopping location</h2>
          <p className="text-body-sm text-outline mt-1">
            Save your ZIP code so retailers can find nearby stores automatically.
          </p>
        </div>
        <div className="px-6 py-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-label-sm text-outline uppercase tracking-wide">ZIP code</label>
            <input
              type="text"
              name="shopping_location_zip_code"
              defaultValue={preferences.shopping_location?.zip_code ?? ""}
              placeholder="60611"
              className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/50 bg-surface-container-low text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-label-sm text-outline uppercase tracking-wide">City / label</label>
            <input
              type="text"
              name="shopping_location_label"
              defaultValue={preferences.shopping_location?.label ?? ""}
              placeholder="Chicago, IL"
              className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/50 bg-surface-container-low text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
          </div>
        </div>
      </section>

      {/* ── Dietary tags ───────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-outline-variant/30">
          <p className="text-label-sm text-primary uppercase tracking-widest">Taste signals</p>
          <h2 className="text-headline-sm font-bold text-on-surface mt-1">Dietary preferences</h2>
          <p className="text-body-sm text-outline mt-1">
            Pick the tags that best describe your dietary style.
          </p>
        </div>
        <div className="px-6 py-6">
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <label
                key={tag.id}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-outline-variant bg-surface-container-low text-body-sm text-on-surface cursor-pointer hover:border-primary hover:bg-primary-surface transition-colors has-[:checked]:bg-primary has-[:checked]:text-on-primary has-[:checked]:border-primary"
              >
                <input
                  type="checkbox"
                  name="preferred_tag_ids"
                  value={tag.id}
                  defaultChecked={preferences.preferred_tag_ids.includes(tag.id)}
                  className="sr-only"
                />
                {tag.name}
              </label>
            ))}
          </div>
        </div>
      </section>

      {state.error && (
        <div className="p-3 rounded-xl bg-error-container text-on-error-container text-body-sm">{state.error}</div>
      )}
      {state.success && (
        <div className="p-3 rounded-xl bg-secondary-container text-on-secondary-container text-body-sm">{state.success}</div>
      )}

      <SaveButton />
    </form>
  );
}
