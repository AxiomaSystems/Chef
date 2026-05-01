"use client";

import type { Cuisine, Tag } from "@cart/shared";

const KIND_ORDER: Cuisine["kind"][] = [
  "national",
  "regional",
  "cultural",
  "style",
  "other",
];

const KIND_LABELS: Record<Cuisine["kind"], string> = {
  national: "National",
  regional: "Regional",
  cultural: "Cultural",
  style: "Style",
  other: "Other",
};

type Props = {
  cuisines: Cuisine[];
  dietaryTags: Tag[];
  selectedCuisineIds: string[];
  selectedTagIds: string[];
  onCuisinesChange: (ids: string[]) => void;
  onTagsChange: (ids: string[]) => void;
};

export function StepCuisineDietary({
  cuisines,
  dietaryTags,
  selectedCuisineIds,
  selectedTagIds,
  onCuisinesChange,
  onTagsChange,
}: Props) {
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

  const grouped = KIND_ORDER.reduce<Record<Cuisine["kind"], Cuisine[]>>(
    (acc, kind) => {
      acc[kind] = cuisines.filter((c) => c.kind === kind);
      return acc;
    },
    { national: [], regional: [], cultural: [], style: [], other: [] },
  );

  return (
    <div className="grid gap-8">
      <div className="grid gap-4">
        <p className="text-label-lg font-semibold text-[#52443d]">
          What cuisines do you love?
        </p>
        <div className="grid gap-4">
          {KIND_ORDER.filter((kind) => grouped[kind].length > 0).map((kind) => (
            <div key={kind} className="grid gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#895032]">
                {KIND_LABELS[kind]}
              </p>
              <div className="flex flex-wrap gap-2">
                {grouped[kind].map((cuisine) => {
                  const isSelected = selectedCuisineIds.includes(cuisine.id);
                  return (
                    <button
                      key={cuisine.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => toggleCuisine(cuisine.id)}
                      className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 py-2 text-label-md font-semibold shadow-sm transition-all duration-200 active:scale-[0.97] ${
                        isSelected
                          ? "border-[#895032] bg-[#895032] text-white shadow-[0_12px_24px_-18px_rgba(137,80,50,0.9)]"
                          : "border-[#e8ddd7] bg-white/72 text-[#52443d] hover:-translate-y-0.5 hover:border-[#d2c799] hover:bg-[#fbf3dc]"
                      }`}
                    >
                      {isSelected ? (
                        <span className="material-symbols-outlined text-[16px]">
                          check
                        </span>
                      ) : null}
                      {cuisine.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {dietaryTags.length > 0 && (
        <div className="grid gap-3">
          <p className="text-label-lg font-semibold text-[#52443d]">
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
                  className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 py-2 text-label-md font-semibold shadow-sm transition-all duration-200 active:scale-[0.97] ${
                    isSelected
                      ? "border-[#895032] bg-[#895032] text-white shadow-[0_12px_24px_-18px_rgba(137,80,50,0.9)]"
                      : "border-[#e8ddd7] bg-white/72 text-[#52443d] hover:-translate-y-0.5 hover:border-[#d2c799] hover:bg-[#fbf3dc]"
                  }`}
                >
                  {isSelected ? (
                    <span className="material-symbols-outlined text-[16px]">
                      check
                    </span>
                  ) : null}
                  {tag.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
