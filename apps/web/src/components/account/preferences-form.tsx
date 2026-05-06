"use client";

import type { Cuisine, Tag, UserPreferences } from "@cart/shared";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { updatePreferencesAction, type PreferencesActionState } from "@/app/account/actions";

const INITIAL_STATE: PreferencesActionState = {};

function normalizeChipLabel(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

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

function CustomChipInput({
  name,
  values,
  onChange,
  placeholder,
}: {
  name: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState("");

  function addChip(value = input) {
    const label = normalizeChipLabel(value.replace(/,+$/g, ""));
    if (!label) return;

    onChange(
      values.some((existing) => existing.toLowerCase() === label.toLowerCase())
        ? values
        : [...values, label],
    );
    setInput("");
  }

  return (
    <div className="space-y-2">
      {values.map((value) => (
        <input key={value} type="hidden" name={name} value={value} />
      ))}
      <div className="flex min-h-[46px] w-full flex-wrap items-center gap-2 rounded-xl border border-outline-variant/50 bg-surface-container-low px-3 py-2 text-body-sm text-on-surface focus-within:ring-2 focus-within:ring-primary/20">
        {values.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onChange(values.filter((item) => item !== value))}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-label-sm font-semibold text-on-primary transition-colors hover:bg-on-primary-container"
          >
            {value}
            <span className="material-symbols-outlined text-[14px]">close</span>
          </button>
        ))}
        <input
          value={input}
          onChange={(event) => {
            const nextValue = event.target.value;
            if (nextValue.includes(",")) {
              const [firstValue, ...rest] = nextValue.split(",");
              addChip(firstValue);
              setInput(rest.join(",").trimStart());
              return;
            }
            setInput(nextValue);
          }}
          onKeyDown={(event) => {
            if (event.key === "," || event.key === "Enter") {
              event.preventDefault();
              addChip();
              return;
            }

            if (event.key === "Backspace" && !input && values.length > 0) {
              event.preventDefault();
              onChange(values.slice(0, -1));
            }
          }}
          onBlur={() => addChip()}
          placeholder={values.length ? "Add another..." : placeholder}
          className="min-w-40 flex-1 border-0 bg-transparent px-1 py-1.5 outline-none placeholder:text-outline"
        />
      </div>
    </div>
  );
}

export function PreferencesForm({ cuisines, tags, preferences }: {
  cuisines: Cuisine[];
  tags: Tag[];
  preferences: UserPreferences;
}) {
  const [state, formAction] = useActionState(updatePreferencesAction, INITIAL_STATE);
  const [customCuisines, setCustomCuisines] = useState<string[]>([]);
  const [customDietaryLabels, setCustomDietaryLabels] = useState<string[]>([]);

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
        <div className="px-6 py-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            {cuisines.map((cuisine) => (
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
          <CustomChipInput
            name="custom_cuisine_labels"
            values={customCuisines}
            onChange={setCustomCuisines}
            placeholder="Add another cuisine..."
          />
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
        <div className="px-6 py-6 space-y-4">
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
          <CustomChipInput
            name="custom_dietary_labels"
            values={customDietaryLabels}
            onChange={setCustomDietaryLabels}
            placeholder="Add a dietary preference..."
          />
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
