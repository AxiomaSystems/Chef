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
  latestShoppingLabel?: string;
  latestShoppingSubtotal?: string;
  preferredCuisineCount: number;
  preferredTagCount: number;
}) {
  const hasActivePlanning = Boolean(props.activePlanningState);
  const title = hasActivePlanning
    ? props.activePlanningState?.kind === "draft"
      ? "Resume your latest planning draft."
      : "Pick up the most recent cart."
    : "Start the next planning pass.";
  const description = hasActivePlanning
    ? props.activePlanningState?.kind === "draft"
      ? "Your latest draft is the shortest path back into the planning flow. Refine the selections, sanity-check the retailer, and keep moving toward a final cart."
      : "A persisted cart is already waiting. Reopen the last combination of dishes, validate the mix, and hand it off to shopping when you are ready."
    : "There is no active planning state right now. Use the recipe library and your saved taste signals to build the next cart without wading through metrics first.";

  return (
    <section
      id="planning-workspace"
      className="relative overflow-hidden rounded-[2.75rem] border border-[color:var(--line)] bg-[color:var(--forest)] px-6 py-8 text-[color:var(--paper)] shadow-[var(--shadow)] sm:px-8 lg:px-10"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,240,228,0.14),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(161,77,49,0.22),transparent_28%)]" />
      <div className="relative grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[color:var(--paper-strong)]/78">
            Planning state
          </p>
          <h2 className="mt-3 font-display text-5xl leading-[0.95] text-[color:var(--paper)] sm:text-6xl">
            {title}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[color:var(--paper-strong)]/82 sm:text-lg">
            {description}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href={hasActivePlanning ? "#recent-work" : "#recipe-library"}
              className="inline-flex min-h-12 items-center rounded-full bg-[color:var(--paper)] px-5 text-sm font-semibold text-[color:var(--forest-strong)] transition hover:bg-[color:var(--paper-strong)]"
            >
              {hasActivePlanning ? "Continue planning" : "Browse recipes"}
            </Link>
            <Link
              href={
                hasActivePlanning
                  ? "#recipe-library"
                  : "/account/settings/preferences"
              }
              className="inline-flex min-h-12 items-center rounded-full border border-white/12 bg-white/8 px-5 text-sm font-semibold text-[color:var(--paper)] transition hover:bg-white/14"
            >
              {hasActivePlanning ? "Review recipes" : "Tune preferences"}
            </Link>
          </div>
        </div>

        <div className="grid gap-3">
          <article className="rounded-[1.75rem] border border-white/12 bg-white/8 p-5 backdrop-blur-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[color:var(--paper-strong)]/70">
              Current focus
            </p>
            {props.activePlanningState ? (
              <div className="mt-3 grid gap-3">
                <div>
                  <div className="text-xl font-semibold text-[color:var(--paper)]">
                    {props.activePlanningState.title}
                  </div>
                  <div className="mt-1 text-sm text-[color:var(--paper-strong)]/78">
                    {props.activePlanningState.kind === "draft"
                      ? `${props.activePlanningState.selectionsCount} selections · ${props.activePlanningState.retailer}`
                      : `${props.activePlanningState.selectionsCount} selections · ${props.activePlanningState.dishesCount} dishes`}
                  </div>
                </div>
                <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--paper-strong)]/66">
                  Updated {props.activePlanningState.updatedAtLabel}
                </div>
              </div>
            ) : (
              <p className="mt-3 max-w-sm text-sm leading-6 text-[color:var(--paper-strong)]/78">
                No draft or cart is waiting right now. The fastest path back
                into the product is to pick a recipe and start a new planning
                run.
              </p>
            )}
          </article>

          <article className="rounded-[1.75rem] border border-white/12 bg-white/8 p-5 backdrop-blur-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[color:var(--paper-strong)]/70">
              Quiet signals
            </p>
            <div className="mt-3 grid gap-3 text-sm text-[color:var(--paper-strong)]/80">
              <div className="flex items-center justify-between gap-4">
                <span>Preferred cuisines</span>
                <span className="font-semibold text-[color:var(--paper)]">
                  {props.preferredCuisineCount}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Preferred shared tags</span>
                <span className="font-semibold text-[color:var(--paper)]">
                  {props.preferredTagCount}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Latest shopping handoff</span>
                <span className="font-semibold text-[color:var(--paper)]">
                  {props.latestShoppingSubtotal ?? "None yet"}
                </span>
              </div>
            </div>
            {props.latestShoppingLabel ? (
              <div className="mt-4 text-xs uppercase tracking-[0.18em] text-[color:var(--paper-strong)]/64">
                {props.latestShoppingLabel}
              </div>
            ) : null}
          </article>
        </div>
      </div>
    </section>
  );
}
