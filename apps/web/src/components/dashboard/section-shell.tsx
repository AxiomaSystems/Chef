export function SectionShell(props: {
  title: string;
  eyebrow: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-[#d7c2b9] bg-white/60 p-6 shadow-sm backdrop-blur-sm">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#895032]">
            {props.eyebrow}
          </p>
          <h2 className="font-sans font-bold text-3xl leading-none text-[#1a1c1a]">
            {props.title}
          </h2>
        </div>
        <p className="max-w-xs text-right text-sm text-[#85736c]">
          {props.note}
        </p>
      </div>
      {props.children}
    </section>
  );
}
