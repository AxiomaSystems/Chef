"use client";

type Props<T extends string> = {
  options: readonly T[];
  selected: T[];
  onChange: (next: T[]) => void;
  getLabel: (value: T) => string;
};

export function ChipMultiSelect<T extends string>({
  options,
  selected,
  onChange,
  getLabel,
}: Props<T>) {
  function toggle(value: T) {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => toggle(option)}
            className={`rounded-full px-4 py-2 text-label-md font-semibold transition-all active:scale-[0.97] ${
              isSelected
                ? "bg-[#895032] text-white shadow-sm"
                : "bg-[#f4f3f1] text-[#52443d] hover:bg-[#efe3b3]"
            }`}
          >
            {getLabel(option)}
          </button>
        );
      })}
    </div>
  );
}
