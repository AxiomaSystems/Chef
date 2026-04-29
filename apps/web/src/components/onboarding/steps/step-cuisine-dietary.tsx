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
                      onClick={() => toggleCuisine(cuisine.id)}
                      className={`rounded-full px-4 py-2 text-label-md font-semibold transition-all active:scale-[0.97] ${
                        isSelected
                          ? "bg-[#895032] text-white shadow-sm"
                          : "bg-[#f4f3f1] text-[#52443d] hover:bg-[#efe3b3]"
                      }`}
                    >
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
                  onClick={() => toggleTag(tag.id)}
                  className={`rounded-full px-4 py-2 text-label-md font-semibold transition-all active:scale-[0.97] ${
                    isSelected
                      ? "bg-[#895032] text-white shadow-sm"
                      : "bg-[#f4f3f1] text-[#52443d] hover:bg-[#efe3b3]"
                  }`}
                >
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
