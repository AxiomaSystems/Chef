"use client";

import Link from "next/link";

type ActivePlanningState =
  | {
      kind: "draft";
      title: string;
      updatedAtLabel: string;
      selectionsCount: number;
      retailer: string;
    }
  | {
      kind: "cart";
      title: string;
      updatedAtLabel: string;
      selectionsCount: number;
      dishesCount: number;
    }
  | null;

export function DashboardActionPanel(props: {
  activePlanningState: ActivePlanningState;
}) {
  const hasActivePlanning = Boolean(props.activePlanningState);
  const title = hasActivePlanning
    ? props.activePlanningState?.kind === "draft"
      ? "Resume your latest draft."
      : "Return to the current cart."
    : "Open the recipe library.";
  const description = hasActivePlanning
    ? props.activePlanningState?.kind === "draft"
      ? "Pick up where you left off and keep shaping the next cart."
      : "Review the latest cart and move it toward shopping."
    : "Browse the recipe shelf, scan dietary badges, and choose what to cook next.";
  const summary = props.activePlanningState
    ? props.activePlanningState.kind === "draft"
      ? `${props.activePlanningState.selectionsCount} selections · ${props.activePlanningState.retailer}`
      : `${props.activePlanningState.selectionsCount} selections · ${props.activePlanningState.dishesCount} dishes`
    : null;

  return (
    <section
      id="planning-workspace"
      className="relative overflow-hidden rounded-[2.75rem] border border-[color:var(--line)] bg-[color:var(--forest)] px-6 py-7 text-[color:var(--paper)] shadow-[var(--shadow)] sm:px-8 lg:px-10"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,240,228,0.12),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(161,77,49,0.18),transparent_26%)]" />
      <div className="relative grid gap-6 lg:grid-cols-[1.35fr_0.65fr] lg:items-center">
        <div className="max-w-3xl">
          <h2 className="font-display text-5xl leading-[0.95] text-[color:var(--paper)] sm:text-6xl">
            {title}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[color:var(--paper-strong)]/82 sm:text-lg">
            {description}
          </p>
          {summary ? (
            <div className="mt-4 text-sm uppercase tracking-[0.16em] text-[color:var(--paper-strong)]/66">
              {summary}
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {hasActivePlanning ? (
              <Link
                href="#recent-work"
                className="inline-flex min-h-12 items-center rounded-full bg-background[color:var(--paper)] px-5 text-sm font-semibold text-[#173224] shadow-[0_10px_30px_rgba(245,240,228,0.14)] transition hover:bg[#fffaf0]"
              >
                Continue planning
              </Link>
            ) : null}

            <Link
              href="/recipes"
              className={`inline-flex min-h-12 items-center rounded-full px-5 text-sm font-semibold transition ${
                hasActivePlanning
                  ? "border border-white/14 bg-white/8 text-[#f5f0e4] hover:bg-white/14 hover:text-white"
                  : "bg-[color:var(--paper)] text-[#173224] shadow-[0_10px_30px_rgba(245,240,228,0.14)] hover:bg-[#fffaf0]"
              }`}
            >
              Browse recipes
            </Link>
          </div>
        </div>

        <div className="flex justify-start lg:justify-end">
          <div className="flex h-32 w-32 items-center justify-center rounded-[2rem] border border-white/10 bg-white/6 text-[color:var(--paper)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm sm:h-40 sm:w-40">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/12 bg-[color:var(--paper)]/10 font-display text-4xl">
              M
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
