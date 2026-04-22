export function StatusPill({
  ok,
  label,
}: {
  ok: boolean;
  label: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${
        ok
          ? "border-emerald-900/15 bg-emerald-950/8 text-emerald-950"
          : "border-[#ba1a1a]/20 bg-[#ba1a1a]/10 text-[#ba1a1a]"
      }`}
    >
      {label}
    </span>
  );
}
