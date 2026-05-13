"use client";

type Props<T extends string> = {
  options: readonly T[];
  selected: T | null;
  onChange: (next: T) => void;
  getLabel: (value: T) => string;
  isOptionDisabled?: (value: T) => boolean;
};

export function ChipSingleSelect<T extends string>({
  options,
  selected,
  onChange,
  getLabel,
  isOptionDisabled,
}: Props<T>) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = selected === option;
        const isDisabled = isOptionDisabled?.(option) ?? false;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={isSelected}
            disabled={isDisabled}
            onClick={() => {
              if (!isDisabled) onChange(option);
            }}
            className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 py-2 text-label-md font-semibold shadow-sm transition-all duration-200 active:scale-[0.97] ${
              isDisabled
                ? "cursor-not-allowed border-[#c0dedf] bg-[#fff8ef] text-[#5f8689] opacity-55 shadow-none"
                : isSelected
                  ? "border-[#f4790d] bg-[#f4790d] text-white shadow-[0_12px_24px_-18px_rgba(60,154,158,0.9)]"
                  : "border-[#c0dedf] bg-white/72 text-[#315f62] hover:-translate-y-0.5 hover:border-[#f4be6b] hover:bg-[#fff2e3]"
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
