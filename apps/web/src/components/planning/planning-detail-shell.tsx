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
        <header className="rounded-[2rem] border border-[color:var(--line)] bg-white/58 px-6 py-6 shadow-[var(--shadow)] backdrop-blur-sm sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="grid gap-3">
              <Link
                href="/"
                className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--olive)] transition hover:text-[color:var(--forest-strong)]"
              >
                Back to workspace
              </Link>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--olive)]">
                  {props.eyebrow}
                </p>
                <h1 className="mt-3 font-display text-5xl leading-[0.94] text-[color:var(--forest-strong)]">
                  {props.title}
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-[color:var(--ink-soft)]">
                  {props.subtitle}
                </p>
              </div>
            </div>
            {props.metadata ? (
              <div className="rounded-[1.5rem] border border-[color:var(--line)] bg-[color:var(--paper)]/76 px-4 py-4 text-sm text-[color:var(--ink-soft)]">
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
