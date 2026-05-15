"use client";

import type { BaseRecipe } from "@cart/shared";
import type { CookingTimer, TranscriptEntry } from "./hands-free-mode-types";

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
    <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-black/18 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/45">
          Live transcript
        </p>
        <p className="text-[11px] text-white/35">
          Say "next", "repeat", or "pause timer"
        </p>
      </div>
      {(lastHeard || lastAction) && (
        <div className="mb-4 grid gap-2 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3">
            <span className="block text-[9px] font-black uppercase tracking-widest text-white/35">
              Heard
            </span>
            <span className="mt-1 line-clamp-2 block text-sm text-white/75">
              {lastHeard ?? "Waiting for your voice..."}
            </span>
          </div>
          <div className="rounded-2xl border border-amber-300/15 bg-amber-300/10 px-4 py-3">
            <span className="block text-[9px] font-black uppercase tracking-widest text-amber-200/60">
              Chef did
            </span>
            <span className="mt-1 line-clamp-2 block text-sm text-amber-50/85">
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
                className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                  entry.speaker === "you"
                    ? "bg-amber-300 text-[#1b1405]"
                    : entry.speaker === "system"
                      ? "bg-white/8 text-white/55"
                      : "bg-white/12 text-white/86"
                }`}
              >
                <span className="mb-1 block text-[9px] font-black uppercase tracking-widest opacity-60">
                  {entry.speaker === "you"
                    ? "You"
                    : entry.speaker === "system"
                      ? "Action"
                      : "Chef"}
                </span>
                {entry.text}
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm leading-6 text-white/45">
            Your conversation will appear here so you can see what Chef heard
            and what it did.
          </p>
        )}
      </div>
    </div>
  );
}

type AsidePanelsProps = {
  activeStep: number;
  completedTimers: CookingTimer[];
  contextLines: string[];
  controlTimer: (command: "pause" | "resume" | "toggle") => void;
  currentPhase: string;
  elapsedSeconds: number;
  isTimerPaused: boolean;
  nextStep: BaseRecipe["steps"][number] | null;
  recipe: BaseRecipe;
  setTimers: React.Dispatch<React.SetStateAction<CookingTimer[]>>;
  stepIngredients: BaseRecipe["ingredients"];
  title: string;
  body: string;
  visibleTimers: CookingTimer[];
};

function formatTime(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function HandsFreeAsidePanels({
  activeStep,
  completedTimers,
  contextLines,
  controlTimer,
  currentPhase,
  elapsedSeconds,
  isTimerPaused,
  nextStep,
  recipe,
  setTimers,
  stepIngredients,
  title,
  body,
  visibleTimers,
}: AsidePanelsProps) {
  return (
    <aside className="space-y-4">
      <section className="rounded-[1.6rem] border border-white/10 bg-white/[0.07] p-5 backdrop-blur-xl">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300/80">
          Kitchen state
        </p>
        <h3 className="mt-2 text-2xl font-black text-white">{currentPhase}</h3>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => controlTimer("toggle")}
            className={`rounded-2xl border p-4 text-left transition-colors ${
              isTimerPaused
                ? "border-amber-300/45 bg-amber-300/12"
                : "border-white/10 bg-black/15 hover:bg-white/10"
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/45">
              Step timer
            </span>
            <span className="mt-1 block font-mono text-3xl font-black tabular-nums text-amber-300">
              {formatTime(elapsedSeconds)}
            </span>
            <span className="mt-1 block text-xs text-white/45">
              {isTimerPaused ? "Paused" : "Running"}
            </span>
          </button>
          <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/45">
              Progress
            </span>
            <span className="mt-1 block text-3xl font-black text-white">
              {activeStep + 1}/{recipe.steps.length}
            </span>
            <span className="mt-1 block text-xs text-white/45">
              Recipe steps
            </span>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-black/15 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/45">
              Active timers
            </span>
            <span className="text-xs text-white/35">
              Say "start a pasta timer for 8 minutes"
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {visibleTimers.length > 0 ? (
              visibleTimers.map((timer) => (
                <div key={timer.id} className="rounded-xl bg-white/8 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-bold text-white">
                      {timer.label}
                    </span>
                    <span className="font-mono text-sm font-black tabular-nums text-amber-300">
                      {formatTime(timer.remainingSeconds)}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-amber-300 transition-all duration-500"
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
              ))
            ) : (
              <p className="text-sm leading-6 text-white/45">
                No named timers yet. Chef can keep track of parallel cooking
                tasks while you work.
              </p>
            )}
            {completedTimers.map((timer) => (
              <button
                key={timer.id}
                type="button"
                onClick={() =>
                  setTimers((current) =>
                    current.filter((item) => item.id !== timer.id),
                  )
                }
                className="flex w-full items-center justify-between rounded-xl border border-amber-300/30 bg-amber-300/12 px-3 py-2 text-left text-sm text-amber-100"
              >
                <span>{timer.label} timer done</span>
                <span className="material-symbols-outlined text-[16px]">
                  close
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[1.6rem] border border-white/10 bg-[#fff8e8] p-5 text-[#142326] shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#9b5b05]">
            Recipe reference
          </p>
          <span className="rounded-full bg-[#142326]/8 px-3 py-1 text-xs font-bold">
            Step {activeStep + 1}
          </span>
        </div>
        <h3 className="mt-4 text-2xl font-black leading-tight">{title}</h3>
        {body ? (
          <p className="mt-3 text-sm leading-6 text-[#315b5f]">{body}</p>
        ) : null}

        {stepIngredients.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {stepIngredients.map((ing, i) => (
              <span
                key={i}
                className="rounded-full bg-[#f4790d]/12 px-3 py-1.5 text-xs font-bold text-[#7a3d00]"
              >
                {ing.amount} {ing.unit}{" "}
                {ing.display_ingredient ?? ing.canonical_ingredient}
              </span>
            ))}
          </div>
        ) : null}

        {nextStep ? (
          <div className="mt-5 rounded-2xl bg-white/70 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#6e8588]">
              Next likely action
            </p>
            <p className="mt-1 line-clamp-2 text-sm font-semibold text-[#142326]">
              {nextStep.what_to_do}
            </p>
          </div>
        ) : (
          <div className="mt-5 rounded-2xl bg-white/70 p-4 text-sm font-semibold text-[#142326]">
            Last step. Ask Chef for plating or cleanup help.
          </div>
        )}
      </section>

      <section className="rounded-[1.6rem] border border-white/10 bg-white/[0.07] p-5 backdrop-blur-xl">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/45">
          Try saying
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            "What do I do now?",
            "Start a pasta timer for 8 minutes",
            "How much time left?",
            "Repeat that",
            "Pause timer",
            "Next step",
            "What can I prep?",
          ].map((prompt) => (
            <span
              key={prompt}
              className="rounded-full border border-white/10 bg-white/8 px-3 py-2 text-xs font-semibold text-white/70"
            >
              {prompt}
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-[1.6rem] border border-teal-200/10 bg-teal-200/[0.07] p-5 backdrop-blur-xl">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-teal-200/70">
          Chef knows
        </p>
        {contextLines.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {contextLines.map((line) => (
              <span
                key={line}
                className="rounded-full border border-teal-200/10 bg-teal-200/10 px-3 py-2 text-xs font-semibold text-teal-50/80"
              >
                {line}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-white/45">
            No profile or pantry context loaded yet. Chef will guide from the
            recipe only.
          </p>
        )}
      </section>
    </aside>
  );
}
