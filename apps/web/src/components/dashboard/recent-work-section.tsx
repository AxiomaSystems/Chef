"use client";

import { useMemo, useState } from "react";
import type { PlanningItem } from "./recent-work.utils";

function TypeBadge(props: { kind: PlanningItem["kind"] }) {
  const tone =
    props.kind === "draft"
      ? "border-[color:var(--olive)]/20 bg-[color:var(--olive)]/10 text-[color:var(--forest-strong)]"
      : "border-[color:var(--clay)]/18 bg-[color:var(--clay)]/10 text-[color:var(--clay)]";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${tone}`}
    >
      {props.kind}
    </span>
  );
}

export function RecentWorkSection(props: {
  planningItems: PlanningItem[];
  onOpenDetail: (detail: { type: "draft" | "cart"; id: string }) => void;
}) {
  const [activeTab, setActiveTab] = useState<"all" | "draft" | "cart">("all");
  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  const counts = useMemo(
    () => ({
      all: props.planningItems.length,
      draft: props.planningItems.filter((item) => item.kind === "draft").length,
      cart: props.planningItems.filter((item) => item.kind === "cart").length,
    }),
    [props.planningItems],
  );
  const visibleItems = useMemo(
    () =>
      props.planningItems.filter(
        (item) => activeTab === "all" || item.kind === activeTab,
      ),
    [activeTab, props.planningItems],
  );

  return (
    <section className="rounded-[2rem] border border-[color:var(--line)] bg-white/60 p-6 shadow-[var(--shadow)] backdrop-blur-sm">
      <div id="recent-work" className="grid gap-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-3xl leading-none text-[color:var(--forest-strong)]">
            Recent work
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {([
              ["all", "All"],
              ["draft", "Drafts"],
              ["cart", "Carts"],
            ] as const).map(([value, label]) => {
              const disabled = counts[value] === 0;
              const active = activeTab === value;

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setActiveTab(value)}
                  disabled={disabled}
                  className={`inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-semibold uppercase tracking-[0.14em] transition ${
                    active
                      ? "border-[color:var(--forest)] bg-[color:var(--forest)] text-[color:var(--paper)]"
                      : "border-[color:var(--line)] bg-[color:var(--paper)]/72 text-[color:var(--ink-soft)] hover:bg-white"
                  } ${disabled ? "cursor-not-allowed opacity-45 hover:bg-[color:var(--paper)]/72" : ""}`}
                >
                  {label}
                  <span className="ml-2 opacity-75">{counts[value]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {visibleItems.length > 0 ? (
          <div className="grid gap-3">
            {visibleItems.map((item) => (
              <button
                key={`${item.kind}-${item.id}`}
                type="button"
                onClick={() =>
                  props.onOpenDetail({
                    type: item.kind,
                    id: item.id,
                  })
                }
                className="rounded-[1.45rem] border border-[color:var(--line)] bg-[color:var(--paper)]/68 px-4 py-4 transition hover:border-[color:var(--olive)]/26 hover:bg-[color:var(--paper)]/82"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <TypeBadge kind={item.kind} />
                    <h3 className="mt-3 truncate text-lg font-semibold text-[color:var(--forest-strong)]">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-sm text-[color:var(--ink-soft)]">
                      {item.subtitle}
                    </p>
                  </div>
                  <span className="shrink-0 pt-1 text-xs uppercase tracking-[0.16em] text-[color:var(--olive)]">
                    {formatDate(item.updatedAt)}
                    </span>
                  </div>
                </button>
            ))}
          </div>
        ) : (
          <div className="rounded-[1.55rem] border border-dashed border-[color:var(--line)] bg-[color:var(--paper)]/52 px-5 py-6">
            <div className="text-lg font-semibold text-[color:var(--forest-strong)]">
              {activeTab === "draft"
                ? "No drafts yet"
                : activeTab === "cart"
                  ? "No carts yet"
                  : "No recent work yet"}
            </div>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[color:var(--ink-soft)]">
              {activeTab === "cart"
                ? "Generated carts will start showing up here once planning moves forward."
                : "Start with a new draft and it will appear here once planning begins."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
