import Link from "next/link";

export function PlanningDetailShell(props: {
  title: string;
  subtitle: string;
  eyebrow: string;
  metadata?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen px-5 py-6 sm:px-8 lg:px-12">
      <div className="mx-auto grid max-w-6xl gap-6">
        <header className="rounded-[2rem] border border-[#c0dedf] bg-white/58 px-6 py-6 shadow-sm backdrop-blur-sm sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="grid gap-3">
              <Link
                href="/"
                className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#f4790d] transition hover:text-[#132326]"
              >
                Back to workspace
              </Link>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f4790d]">
                  {props.eyebrow}
                </p>
                <h1 className="mt-3 font-sans font-bold text-5xl leading-[0.94] text-[#132326]">
                  {props.title}
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-[#5f8689]">
                  {props.subtitle}
                </p>
              </div>
            </div>
            {props.metadata ? (
              <div className="rounded-[1.5rem] border border-[#c0dedf] bg-[#fff8ef]/76 px-4 py-4 text-sm text-[#5f8689]">
                {props.metadata}
              </div>
            ) : null}
          </div>
        </header>

        {props.children}
      </div>
    </main>
  );
}
