"use client";

import { useState } from "react";
import type { Cuisine, Tag } from "@cart/shared";
import { DIETARY_RESTRICTION_PRESETS } from "@/components/onboarding/labels";

function toRestrictionSlug(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toRestrictionLabel(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const CHIP_BASE =
  "inline-flex min-h-10 items-center gap-2 rounded-full border px-4 py-2 text-label-md font-semibold shadow-sm transition-all duration-200 active:scale-[0.97]";
const CHIP_SELECTED =
  "border-[#f4790d] bg-[#f4790d] text-white shadow-[0_12px_24px_-18px_rgba(60,154,158,0.9)]";
const CHIP_UNSELECTED =
  "border-[#c0dedf] bg-white/72 text-[#315f62] hover:-translate-y-0.5 hover:border-[#f4be6b] hover:bg-[#fff2e3]";
const ADD_INPUT =
  "flex-1 rounded-full border border-[#c0dedf] bg-white px-4 py-2 text-body-sm text-[#315f62] placeholder:text-[#5f8689] focus:outline-none focus:ring-2 focus:ring-[#f4790d]/20";
const ADD_BTN =
  "inline-flex items-center gap-1 rounded-full border border-[#f4790d] px-4 py-2 text-label-sm font-semibold text-[#f4790d] transition-colors hover:bg-[#f4790d] hover:text-white disabled:opacity-40";
const CUSTOM_CUISINE_MAX_LENGTH = 80;
const CUSTOM_RESTRICTION_MAX_LENGTH = 80;

type Props = {
  cuisines: Cuisine[];
  dietaryTags: Tag[];
  selectedCuisineIds: string[];
  selectedTagIds: string[];
  customCuisineLabels: string[];
  dietaryRestrictions: string[];
  onCuisinesChange: (ids: string[]) => void;
  onTagsChange: (ids: string[]) => void;
  onCustomCuisineLabelsChange: (labels: string[]) => void;
  onDietaryRestrictionsChange: (slugs: string[]) => void;
};

export function StepCuisineDietary({
  cuisines,
  dietaryTags,
  selectedCuisineIds,
  selectedTagIds,
  customCuisineLabels,
  dietaryRestrictions,
  onCuisinesChange,
  onTagsChange,
  onCustomCuisineLabelsChange,
  onDietaryRestrictionsChange,
}: Props) {
  const [cuisineInput, setCuisineInput] = useState("");
  const [restrictionInput, setRestrictionInput] = useState("");
  const [showAllCuisines, setShowAllCuisines] = useState(false);

  function toggleCuisine(id: string) {
    onCuisinesChange(
      selectedCuisineIds.includes(id)
        ? selectedCuisineIds.filter((x) => x !== id)
        : [...selectedCuisineIds, id],
    );
  }

  function toggleTag(id: string) {
    onTagsChange(
      selectedTagIds.includes(id)
        ? selectedTagIds.filter((x) => x !== id)
        : [...selectedTagIds, id],
    );
  }

  function toggleRestrictionPreset(slug: string) {
    onDietaryRestrictionsChange(
      dietaryRestrictions.includes(slug)
        ? dietaryRestrictions.filter((x) => x !== slug)
        : [...dietaryRestrictions, slug],
    );
  }

  function addCustomCuisine() {
    const label = cuisineInput.trim();
    if (
      !label ||
      customCuisineLabels
        .map((l) => l.toLowerCase())
        .includes(label.toLowerCase())
    )
      return;
    onCustomCuisineLabelsChange([...customCuisineLabels, label]);
    setCuisineInput("");
  }

  function removeCustomCuisine(label: string) {
    onCustomCuisineLabelsChange(customCuisineLabels.filter((l) => l !== label));
  }

  function addCustomRestriction() {
    const slug = toRestrictionSlug(restrictionInput);
    if (!slug || dietaryRestrictions.includes(slug)) return;
    onDietaryRestrictionsChange([...dietaryRestrictions, slug]);
    setRestrictionInput("");
  }

  function removeCustomRestriction(slug: string) {
    onDietaryRestrictionsChange(dietaryRestrictions.filter((s) => s !== slug));
  }

  const presetRestrictionSlugs = new Set<string>(
    DIETARY_RESTRICTION_PRESETS.map((p) => p.slug),
  );
  const customRestrictions = dietaryRestrictions.filter(
    (slug) => !presetRestrictionSlugs.has(slug),
  );
  const visibleCuisineIds = new Set(selectedCuisineIds);
  const visibleCuisines = showAllCuisines
    ? cuisines
    : cuisines.filter(
        (cuisine, index) => index < 12 || visibleCuisineIds.has(cuisine.id),
      );
  const hiddenCuisineCount = cuisines.length - visibleCuisines.length;

  return (
    <div className="grid gap-8">
      {/* ── Cuisines ─────────────────────────────────────────────────── */}
      <div className="grid gap-4">
        <p className="text-label-lg font-semibold text-[#315f62]">
          What cuisines do you love?
        </p>

        <div className="flex flex-wrap gap-2">
          {visibleCuisines.map((cuisine) => {
            const isSelected = selectedCuisineIds.includes(cuisine.id);
            return (
              <button
                key={cuisine.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => toggleCuisine(cuisine.id)}
                className={`${CHIP_BASE} ${isSelected ? CHIP_SELECTED : CHIP_UNSELECTED}`}
              >
                {isSelected && (
                  <span className="material-symbols-outlined text-[16px]">
                    check
                  </span>
                )}
                {cuisine.label}
              </button>
            );
          })}
        </div>

        {cuisines.length > visibleCuisines.length || showAllCuisines ? (
          <button
            type="button"
            onClick={() => setShowAllCuisines((current) => !current)}
            className="inline-flex w-fit items-center gap-1 rounded-full px-2 py-1 text-label-sm font-bold text-[#f4790d] transition-colors hover:bg-[#fff2e3]"
          >
            {showAllCuisines
              ? "See less"
              : `See more${hiddenCuisineCount > 0 ? ` (${hiddenCuisineCount})` : ""}`}
            <span className="material-symbols-outlined text-[18px]">
              {showAllCuisines ? "expand_less" : "expand_more"}
            </span>
          </button>
        ) : null}

        {/* Custom cuisines */}
        {customCuisineLabels.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {customCuisineLabels.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => removeCustomCuisine(label)}
                className={`${CHIP_BASE} ${CHIP_SELECTED}`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  check
                </span>
                {label}
                <span className="material-symbols-outlined text-[14px] opacity-70">
                  close
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            value={cuisineInput}
            onChange={(e) => setCuisineInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustomCuisine()}
            maxLength={CUSTOM_CUISINE_MAX_LENGTH}
            placeholder="Any more cuisines you love? Add it..."
            className={ADD_INPUT}
          />
          <button
            type="button"
            onClick={addCustomCuisine}
            disabled={!cuisineInput.trim()}
            className={ADD_BTN}
          >
            Add
          </button>
        </div>
      </div>

      {/* ── Dietary preferences ──────────────────────────────────────── */}
      {dietaryTags.length > 0 && (
        <div className="grid gap-3">
          <p className="text-label-lg font-semibold text-[#315f62]">
            Any dietary preferences?
          </p>
          <div className="flex flex-wrap gap-2">
            {dietaryTags.map((tag) => {
              const isSelected = selectedTagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => toggleTag(tag.id)}
                  className={`${CHIP_BASE} ${isSelected ? CHIP_SELECTED : CHIP_UNSELECTED}`}
                >
                  {isSelected && (
                    <span className="material-symbols-outlined text-[16px]">
                      check
                    </span>
                  )}
                  {tag.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Dietary restrictions ─────────────────────────────────────── */}
      <div className="grid gap-3">
        <div>
          <p className="text-label-lg font-semibold text-[#315f62]">
            Any dietary restrictions?
          </p>
          <p className="mt-0.5 text-body-sm text-[#5f8689]">
            Allergies, intolerances, or other hard requirements.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {DIETARY_RESTRICTION_PRESETS.map(({ slug, label }) => {
            const isSelected = dietaryRestrictions.includes(slug);
            return (
              <button
                key={slug}
                type="button"
                aria-pressed={isSelected}
                onClick={() => toggleRestrictionPreset(slug)}
                className={`${CHIP_BASE} ${isSelected ? CHIP_SELECTED : CHIP_UNSELECTED}`}
              >
                {isSelected && (
                  <span className="material-symbols-outlined text-[16px]">
                    check
                  </span>
                )}
                {label}
              </button>
            );
          })}

          {customRestrictions.map((slug) => (
            <button
              key={slug}
              type="button"
              onClick={() => removeCustomRestriction(slug)}
              className={`${CHIP_BASE} ${CHIP_SELECTED}`}
            >
              <span className="material-symbols-outlined text-[16px]">
                check
              </span>
              {toRestrictionLabel(slug)}
              <span className="material-symbols-outlined text-[14px] opacity-70">
                close
              </span>
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={restrictionInput}
            onChange={(e) => setRestrictionInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustomRestriction()}
            maxLength={CUSTOM_RESTRICTION_MAX_LENGTH}
            placeholder='e.g. "Nut Allergy"'
            className={ADD_INPUT}
          />
          <button
            type="button"
            onClick={addCustomRestriction}
            disabled={!restrictionInput.trim()}
            className={ADD_BTN}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
