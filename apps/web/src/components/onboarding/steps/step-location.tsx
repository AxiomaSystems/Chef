"use client";

type Props = {
  zip: string;
  label: string;
  onZipChange: (v: string) => void;
  onLabelChange: (v: string) => void;
};

export function StepLocation({ zip, label, onZipChange, onLabelChange }: Props) {
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <label
            htmlFor="zip"
            className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#895032]"
          >
            ZIP code
          </label>
          <input
            id="zip"
            type="text"
            value={zip}
            onChange={(e) => onZipChange(e.target.value)}
            placeholder="60611"
            maxLength={5}
            className="min-h-12 rounded-2xl border border-[#d7c2b9] bg-white/70 px-4 text-sm text-[#1a1c1a] outline-none transition placeholder:text-[#85736c]/72 focus:border-[#895032]"
          />
        </div>

        <div className="grid gap-2">
          <label
            htmlFor="location-label"
            className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#895032]"
          >
            Place label
          </label>
          <input
            id="location-label"
            type="text"
            value={label}
            onChange={(e) => onLabelChange(e.target.value)}
            placeholder="Chicago, IL"
            className="min-h-12 rounded-2xl border border-[#d7c2b9] bg-white/70 px-4 text-sm text-[#1a1c1a] outline-none transition placeholder:text-[#85736c]/72 focus:border-[#895032]"
          />
        </div>
      </div>

      <div className="flex gap-3 rounded-xl bg-[#f4f3f1] p-4">
        <span className="material-symbols-outlined mt-0.5 text-[20px] text-[#895032]">
          info
        </span>
        <p className="text-body-sm text-[#52443d]">
          Chef uses your location to surface in-stock items at nearby stores and
          build your grocery cart automatically.
        </p>
      </div>
    </div>
  );
}
