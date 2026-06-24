"use client";

type Props = {
  zip: string;
  label: string;
  onZipChange: (v: string) => void;
  onLabelChange: (v: string) => void;
};

export function StepLocation({
  zip,
  label,
  onZipChange,
  onLabelChange,
}: Props) {
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <label
            htmlFor="zip"
            className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f4790d]"
          >
            ZIP code
          </label>
          <input
            id="zip"
            type="text"
            value={zip}
            onChange={(e) => onZipChange(e.target.value)}
            placeholder="60611"
            inputMode="numeric"
            maxLength={10}
            className="min-h-12 rounded-2xl border border-[#c0dedf] bg-white/80 px-4 text-sm text-[#132326] shadow-sm outline-none transition placeholder:text-[#5f8689]/72 focus:border-[#f4790d] focus:bg-white focus:shadow-[0_0_0_4px_rgba(60,154,158,0.12)]"
          />
        </div>

        <div className="grid gap-2">
          <label
            htmlFor="location-label"
            className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f4790d]"
          >
            Place label
          </label>
          <input
            id="location-label"
            type="text"
            value={label}
            onChange={(e) => onLabelChange(e.target.value)}
            placeholder="Chicago, IL"
            maxLength={120}
            className="min-h-12 rounded-2xl border border-[#c0dedf] bg-white/80 px-4 text-sm text-[#132326] shadow-sm outline-none transition placeholder:text-[#5f8689]/72 focus:border-[#f4790d] focus:bg-white focus:shadow-[0_0_0_4px_rgba(60,154,158,0.12)]"
          />
        </div>
      </div>

      <div className="flex gap-3 rounded-2xl border border-[#c0dedf] bg-[#fff8ef] p-4">
        <span className="material-symbols-outlined mt-0.5 text-[20px] text-[#f4790d]">
          info
        </span>
        <p className="text-body-sm text-[#315f62]">
          Preppie uses your location to surface in-stock items at nearby stores
          and build your grocery cart automatically.
        </p>
      </div>
    </div>
  );
}
