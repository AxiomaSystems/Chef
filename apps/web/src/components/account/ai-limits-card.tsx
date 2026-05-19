"use client";

import { useEffect, useState } from "react";
import type { AiLimitsStatus } from "@cart/shared";

function formatDuration(seconds: number | null) {
  if (seconds === null) return "No active window";

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;

  if (minutes <= 0) return `${remainder}s`;
  if (remainder === 0) return `${minutes}m`;
  return `${minutes}m ${remainder}s`;
}

function formatWindow(milliseconds: number) {
  const seconds = Math.round(milliseconds / 1000);
  const minutes = Math.round(seconds / 60);

  if (minutes >= 1 && seconds % 60 === 0) {
    return `${minutes} min`;
  }

  return `${seconds}s`;
}

function formatProvider(provider: string) {
  return provider === "openai" ? "OpenAI" : "Mock AI";
}

const FALLBACK_USAGE_CATEGORIES = [
  { category: "chat", label: "Chat", used: 0 },
  { category: "autofill", label: "Autofill", used: 0 },
  { category: "imports", label: "Imports", used: 0 },
  { category: "inventory_fill", label: "Inventory fill", used: 0 },
] satisfies AiLimitsStatus["usage_categories"];

export function AiLimitsCard({ status }: { status: AiLimitsStatus | null }) {
  const resetAtValue = status?.rate_limit.reset_at;
  const parsedResetAtMs = resetAtValue ? Date.parse(resetAtValue) : null;
  const resetAtMs =
    parsedResetAtMs !== null && Number.isFinite(parsedResetAtMs)
      ? parsedResetAtMs
      : null;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!resetAtMs) return;

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [resetAtMs]);

  if (!status) {
    return (
      <section className="overflow-hidden rounded-2xl border border-outline-variant/30 bg-white shadow-sm">
        <div className="border-b border-outline-variant/30 px-6 py-5">
          <p className="text-label-sm uppercase tracking-widest text-primary">
            AI
          </p>
          <h2 className="mt-1 text-headline-sm font-bold text-on-surface">
            Usage and limits
          </h2>
          <p className="mt-1 text-body-sm text-outline">
            AI limit status is unavailable right now.
          </p>
        </div>
      </section>
    );
  }

  const limit = status.rate_limit;
  const used = Math.min(limit.used, limit.max_requests);
  const percent =
    limit.max_requests > 0
      ? Math.min((used / limit.max_requests) * 100, 100)
      : 0;
  const resetInSeconds = resetAtMs
    ? Math.max(0, Math.ceil((resetAtMs - now) / 1000))
    : limit.reset_in_seconds;
  const resetText = formatDuration(resetInSeconds);
  const usageCategories =
    status.usage_categories.length > 0
      ? status.usage_categories
      : FALLBACK_USAGE_CATEGORIES;

  return (
    <section className="overflow-hidden rounded-2xl border border-outline-variant/30 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-outline-variant/30 px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-label-sm uppercase tracking-widest text-primary">
            AI
          </p>
          <h2 className="mt-1 text-headline-sm font-bold text-on-surface">
            Usage and limits
          </h2>
          <p className="mt-1 text-body-sm text-outline">
            Viewing this panel does not use an AI request.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-primary-fixed-dim px-3 py-1 text-xs font-bold text-on-primary-fixed">
            {formatProvider(status.provider)}
          </span>
          <span className="rounded-full bg-surface-container px-3 py-1 text-xs font-semibold text-on-surface-variant">
            {limit.scope === "user" ? "Per user" : "Per IP"}
          </span>
        </div>
      </div>

      <div className="space-y-5 px-6 py-6">
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-on-surface">
              {used} of {limit.max_requests} requests used
            </span>
            <span className="text-sm font-semibold text-primary">
              {limit.remaining} left
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-container">
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-surface-container-low p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-outline">
              Window
            </p>
            <p className="mt-1 text-sm font-semibold text-on-surface">
              {formatWindow(limit.window_ms)}
            </p>
          </div>
          <div className="rounded-xl bg-surface-container-low p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-outline">
              Reset
            </p>
            <p className="mt-1 text-sm font-semibold text-on-surface">
              {resetText}
            </p>
          </div>
          <div className="rounded-xl bg-surface-container-low p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-outline">
              Model
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-on-surface">
              {status.model ?? "Mock provider"}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-on-surface">
              AI requests this window
            </p>
            <p className="text-xs font-semibold text-outline">{used} total</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            {usageCategories.map((item) => (
              <div
                key={item.category}
                className="rounded-lg bg-white px-3 py-2"
              >
                <p className="text-[10px] font-bold uppercase tracking-wide text-outline">
                  {item.label}
                </p>
                <p className="mt-1 text-lg font-bold text-on-surface">
                  {item.used}
                </p>
              </div>
            ))}
          </div>
        </div>

        {status.provider === "openai" && !status.openai_configured ? (
          <div className="rounded-xl bg-error-container/40 px-3 py-2 text-sm text-on-error-container">
            OpenAI is selected, but the API key is not configured.
          </div>
        ) : null}
      </div>
    </section>
  );
}
