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
            aria-pressed={isSelected}
            onClick={() => toggle(option)}
            className={`group inline-flex min-h-10 items-center gap-2 rounded-full border px-4 py-2 text-label-md font-semibold shadow-sm transition-all duration-200 active:scale-[0.97] ${
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
            {getLabel(option)}
          </button>
        );
      })}
    </div>
  );
}
