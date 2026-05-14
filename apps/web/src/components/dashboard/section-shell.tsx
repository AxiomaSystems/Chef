export function SectionShell(props: {
  title: string;
  eyebrow: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-[#c0dedf] bg-white/60 p-6 shadow-sm backdrop-blur-sm">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f4790d]">
            {props.eyebrow}
          </p>
          <h2 className="font-sans font-bold text-3xl leading-none text-[#132326]">
            {props.title}
          </h2>
        </div>
        <p className="max-w-xs text-right text-sm text-[#5f8689]">
          {props.note}
        </p>
      </div>
      {props.children}
    </section>
  );
}
