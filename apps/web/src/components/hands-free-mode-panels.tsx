"use client";

import type { Dispatch, SetStateAction } from "react";
import type {
  CookingAdaptation,
  CookingTimer,
  TranscriptEntry,
} from "./hands-free-mode-types";

type TranscriptPanelProps = {
  transcript: TranscriptEntry[];
  lastHeard: string | null;
  lastAction: string | null;
};

export function HandsFreeTranscriptPanel({
  transcript,
  lastHeard,
  lastAction,
}: TranscriptPanelProps) {
  return (
    <div className="min-w-0 max-w-full overflow-hidden rounded-[1.25rem] border border-[#c0dedf] bg-white/80 p-3 shadow-[0_12px_34px_rgba(60,154,158,0.08)] backdrop-blur-xl sm:rounded-[1.5rem] sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">
          Live transcript
        </p>
      </div>
      {(lastHeard || lastAction) && (
        <div className="mb-4 grid gap-2">
          <div className="min-w-0 overflow-hidden rounded-2xl border border-[#c0dedf]/70 bg-[#fffdfa] px-3 py-2.5 sm:px-4 sm:py-3">
            <span className="block text-[9px] font-black uppercase tracking-widest text-outline">
              Heard
            </span>
            <span className="mt-1 line-clamp-2 block min-w-0 break-words text-sm text-on-surface-variant">
              {lastHeard ?? "Waiting for your voice..."}
            </span>
          </div>
          <div className="min-w-0 overflow-hidden rounded-2xl border border-[#f4be6b]/50 bg-[#fff2e3] px-3 py-2.5 sm:px-4 sm:py-3">
            <span className="block text-[9px] font-black uppercase tracking-widest text-primary">
              Preppie did
            </span>
            <span className="mt-1 line-clamp-2 block min-w-0 break-words text-sm text-on-surface">
              {lastAction ?? "No command action yet."}
            </span>
          </div>
        </div>
      )}
      <div className="space-y-3">
        {transcript.length > 0 ? (
          transcript.map((entry) => (
            <div
              key={entry.id}
              className={`flex gap-3 ${
                entry.speaker === "you" ? "justify-end" : ""
              }`}
            >
              <div
                className={`min-w-0 max-w-full break-words rounded-2xl px-3 py-2.5 text-sm leading-6 sm:max-w-[86%] sm:px-4 sm:py-3 ${
                  entry.speaker === "you"
                    ? "bg-primary text-on-primary"
                    : entry.speaker === "system"
                      ? "bg-[#fff8ef] text-on-surface-variant"
                      : "bg-[#ecf8f4] text-on-surface"
                }`}
              >
                <span className="mb-1 block text-[9px] font-black uppercase tracking-widest opacity-60">
                  {entry.speaker === "you"
                    ? "You"
                    : entry.speaker === "system"
                      ? "Action"
                      : "Preppie"}
                </span>
                {entry.text}
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm leading-6 text-on-surface-variant">
            Your conversation will appear here.
          </p>
        )}
      </div>
    </div>
  );
}

type AsidePanelsProps = {
  adaptations: CookingAdaptation[];
  completedTimers: CookingTimer[];
  setTimers: Dispatch<SetStateAction<CookingTimer[]>>;
  visibleTimers: CookingTimer[];
};

function formatTime(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function HandsFreeAsidePanels({
  adaptations,
  completedTimers,
  setTimers,
  visibleTimers,
}: AsidePanelsProps) {
  const primaryTimer = visibleTimers[0] ?? null;

  return (
    <section className="min-w-0 max-w-full space-y-4 overflow-hidden">
      {primaryTimer ? (
        <div className="min-w-0 max-w-full overflow-hidden rounded-[1.5rem] border border-[#f4be6b]/55 bg-[#fff2e3]/88 p-4 shadow-[0_14px_36px_rgba(244,121,13,0.08)] backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                Timer running
              </p>
              <h3 className="mt-1 truncate text-lg font-black text-on-surface">
                {primaryTimer.label}
              </h3>
            </div>
            <span className="font-mono text-2xl font-black tabular-nums text-primary">
              {formatTime(primaryTimer.remainingSeconds)}
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{
                width: `${Math.max(
                  0,
                  Math.min(
                    100,
                    (primaryTimer.remainingSeconds /
                      primaryTimer.totalSeconds) *
                      100,
                  ),
                )}%`,
              }}
            />
          </div>
        </div>
      ) : null}

      {visibleTimers.length > 1 || completedTimers.length > 0 ? (
        <div className="rounded-[2rem] border border-[#c0dedf] bg-white/82 p-5 shadow-[0_18px_50px_rgba(60,154,158,0.08)] backdrop-blur-xl">
          <div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                Other timers
              </span>
            </div>
            <div className="mt-3 space-y-3">
              {visibleTimers.slice(1).map((timer) => (
                <div
                  key={timer.id}
                  className="rounded-2xl border border-[#f4be6b]/50 bg-[#fff2e3] px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="block truncate text-sm font-black text-on-surface">
                        {timer.label}
                      </span>
                      <span className="mt-0.5 block text-xs font-semibold text-on-surface-variant">
                        {timer.paused ? "Paused" : "Running"}
                      </span>
                    </div>
                    <span className="font-mono text-2xl font-black tabular-nums text-primary">
                      {formatTime(timer.remainingSeconds)}
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(
                            100,
                            (timer.remainingSeconds / timer.totalSeconds) * 100,
                          ),
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
              {completedTimers.map((timer) => (
                <button
                  key={timer.id}
                  type="button"
                  onClick={() =>
                    setTimers((current) =>
                      current.filter((item) => item.id !== timer.id),
                    )
                  }
                  className="flex w-full items-center justify-between rounded-xl border border-[#f4be6b]/40 bg-[#fff2e3] px-3 py-2 text-left text-sm text-on-surface"
                >
                  <span>{timer.label} timer done</span>
                  <span className="material-symbols-outlined text-[16px]">
                    close
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {adaptations.length > 0 ? (
        <div className="rounded-[2rem] border border-[#f4be6b]/45 bg-[#fff2e3] p-5 shadow-[0_18px_50px_rgba(244,121,13,0.08)]">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">
            Live adjustments
          </p>
          <div className="mt-3 space-y-2">
            {adaptations.map((adaptation) => (
              <div
                key={adaptation.id}
                className="rounded-2xl border border-[#f4be6b]/35 bg-white px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-sm font-black text-on-surface">
                    {adaptation.title}
                  </p>
                  {adaptation.stepNumber ? (
                    <span className="shrink-0 rounded-full bg-[#fff2e3] px-2 py-1 text-[10px] font-bold text-primary">
                      Step {adaptation.stepNumber}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 line-clamp-3 text-xs leading-5 text-on-surface-variant">
                  {adaptation.note}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
