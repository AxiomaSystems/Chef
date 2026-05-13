"use client";

import { useDeferredValue, useMemo, useState } from "react";
import type { PlanningItem } from "./recent-work.utils";

function TypeBadge(props: { kind: PlanningItem["kind"] }) {
  const tone =
    props.kind === "draft"
      ? "border-[#f4790d]/20 bg-[#f4790d]/10 text-[#132326]"
      : "border-[#ba1a1a]/18 bg-[#ba1a1a]/10 text-[#ba1a1a]";

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
  onOpenDraft: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"draft" | "cart">("cart");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));

  const counts = useMemo(
    () => ({
      draft: props.planningItems.filter((item) => item.kind === "draft").length,
      cart: props.planningItems.filter((item) => item.kind === "cart").length,
    }),
    [props.planningItems],
  );

  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const visibleItems = useMemo(
    () =>
      props.planningItems.filter((item) => {
        const matchesTab = item.kind === activeTab;
        const matchesQuery =
          normalizedQuery.length === 0 ||
          item.title.toLowerCase().includes(normalizedQuery) ||
          item.subtitle.toLowerCase().includes(normalizedQuery);

        return matchesTab && matchesQuery;
      }),
    [activeTab, normalizedQuery, props.planningItems],
  );

  return (
    <section className="rounded-[2rem] border border-[#c0dedf] bg-white/60 p-6 shadow-sm backdrop-blur-sm">
      <div id="recent-work" className="grid gap-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-sans font-bold text-3xl leading-none text-[#132326]">
            Recent work
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={props.onOpenDraft}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#f4790d] bg-[#f4790d] text-xl font-semibold text-[#fff8ef] transition hover:bg-[#132326]"
              aria-label="Create new draft"
            >
              +
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="block w-full lg:max-w-sm">
            <span className="sr-only">Search recent work</span>
            <input
              suppressHydrationWarning
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search drafts and carts"
              className="min-h-11 w-full rounded-full border border-[#c0dedf] bg-[#fff8ef]/78 px-4 text-sm text-[#132326] outline-none transition placeholder:text-[#5f8689]/72 focus:border-[#f4790d]"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                ["cart", "Carts"],
                ["draft", "Drafts"],
              ] as const
            ).map(([value, label]) => {
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
                      ? "border-[#f4790d] bg-[#f4790d] text-[#fff8ef]"
                      : "border-[#c0dedf] bg-[#fff8ef]/72 text-[#5f8689] hover:bg-white"
                  } ${disabled ? "cursor-not-allowed opacity-45 hover:bg-[#fff8ef]/72" : ""}`}
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
                className={`block w-full rounded-[1.45rem] px-4 py-4 text-left transition ${
                  item.kind === "draft"
                    ? "border border-dashed border-[#f4790d]/28 bg-[rgba(192,222,223,0.52)] hover:border-[#f4790d]/42 hover:bg-[rgba(192,222,223,0.7)]"
                    : "border border-[#c0dedf] bg-[#fff8ef]/68 hover:border-[#f4790d]/26 hover:bg-[#fff8ef]/82"
                }`}
              >
                <div className="flex w-full items-start justify-between gap-4">
                  <div className="min-w-0">
                    <TypeBadge kind={item.kind} />
                    {item.kind === "draft" ? (
                      <div className="mt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f4790d]/82">
                        In progress
                      </div>
                    ) : null}
                    <h3 className="mt-3 truncate text-lg font-semibold text-[#132326]">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-sm text-[#5f8689]">
                      {item.subtitle}
                    </p>
                  </div>
                  <span className="shrink-0 pt-1 text-xs uppercase tracking-[0.16em] text-[#f4790d]">
                    {formatDate(item.updatedAt)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-[1.55rem] border border-dashed border-[#c0dedf] bg-[#fff8ef]/52 px-5 py-6">
            <div className="text-lg font-semibold text-[#132326]">
              {activeTab === "draft" ? "No drafts yet" : "No carts yet"}
            </div>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#5f8689]">
              {normalizedQuery.length > 0
                ? "Try a different search term."
                : activeTab === "cart"
                  ? "Generated carts will start showing up here once planning moves forward."
                  : "Start with a new draft and it will appear here once planning begins."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
