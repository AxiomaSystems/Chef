"use client";

import { useEffect, useRef, useState } from "react";
import type { BaseRecipe } from "@cart/shared";
import type { CookingContext } from "@/lib/cooking-context";
import {
  HandsFreeAsidePanels,
  HandsFreeTranscriptPanel,
} from "./hands-free-mode-panels";
import type {
  CookingTimer,
  HandsFreeModeStatus,
  TranscriptEntry,
} from "./hands-free-mode-types";
import { useHandsFreeVoiceSession } from "./use-hands-free-voice-session";

function formatTime(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function splitTitle(text: string) {
  const parts = text.split(/(?<=[.!?])\s+/);
  return { title: parts[0] ?? text, body: parts.slice(1).join(" ") };
}

function getStepIngredients(
  stepText: string,
  ingredients: BaseRecipe["ingredients"],
) {
  const lower = stepText.toLowerCase();
  return ingredients.filter((ing) => {
    const name = (
      ing.display_ingredient ?? ing.canonical_ingredient
    ).toLowerCase();
    return name.split(" ").some((w) => w.length > 3 && lower.includes(w));
  });
}

type Props = {
  recipe: BaseRecipe;
  cookingContext?: CookingContext;
  onClose: () => void;
};
type TimerCommand = "pause" | "resume" | "toggle";

export function HandsFreeMode({ recipe, cookingContext, onClose }: Props) {
  const [activeStep, setActiveStep] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timers, setTimers] = useState<CookingTimer[]>([]);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [lastHeard, setLastHeard] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const timerIdRef = useRef(0);
  const timersRef = useRef<CookingTimer[]>([]);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);

  const activeStepRef = useRef(0);
  const timerPausedRef = useRef(false);
  const transcriptIdRef = useRef(0);

  const currentStep = recipe.steps[activeStep] ?? null;
  const { title, body } = currentStep
    ? splitTitle(currentStep.what_to_do)
    : { title: "No steps.", body: "" };
  const stepIngredients = currentStep
    ? getStepIngredients(currentStep.what_to_do, recipe.ingredients)
    : [];
  const progress = recipe.steps.length
    ? ((activeStep + 1) / recipe.steps.length) * 100
    : 0;
  const nextStep = recipe.steps[activeStep + 1] ?? null;
  const currentPhase =
    activeStep === 0
      ? "Getting set up"
      : activeStep >= recipe.steps.length - 1
        ? "Finishing"
        : activeStep < recipe.steps.length / 3
          ? "Building momentum"
          : activeStep < (recipe.steps.length * 2) / 3
            ? "Active cooking"
            : "Bring it home";
  const contextLines = [
    cookingContext?.dietaryRules.length
      ? `${cookingContext.dietaryRules.length} food rules`
      : null,
    cookingContext?.goals.length ? `${cookingContext.goals[0]} goal` : null,
    cookingContext?.inventory.length
      ? `${cookingContext.inventory.length} pantry items`
      : null,
    cookingContext?.kitchen.length
      ? `${cookingContext.kitchen.length} kitchen defaults`
      : null,
  ].filter((line): line is string => Boolean(line));

  function addTranscript(speaker: TranscriptEntry["speaker"], text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    transcriptIdRef.current += 1;
    setTranscript((prev) => [
      ...prev.slice(-5),
      { id: transcriptIdRef.current, speaker, text: trimmed },
    ]);
  }

  function recordAction(text: string) {
    setLastAction(text);
    addTranscript("system", text);
  }

  function announce(text: string) {
    addTranscript("chef", text);
    speakLocal(text);
  }

  useEffect(() => {
    activeStepRef.current = activeStep;
  }, [activeStep]);
  useEffect(() => {
    timersRef.current = timers;
  }, [timers]);

  useEffect(() => {
    timerPausedRef.current = isTimerPaused;
  }, [isTimerPaused]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTimers((current) =>
        current.map((timer) => {
          if (timer.paused || timer.completed) return timer;
          const remainingSeconds = Math.max(0, timer.remainingSeconds - 1);
          if (remainingSeconds === 0 && timer.remainingSeconds > 0) {
            window.setTimeout(() => {
              announce(`${timer.label} timer is done.`);
            }, 0);
          }
          return {
            ...timer,
            remainingSeconds,
            completed: remainingSeconds === 0,
          };
        }),
      );
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (!timerPausedRef.current) {
        setElapsedSeconds((s) => s + 1);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  function setTimerPaused(nextPaused: boolean, announce = true) {
    timerPausedRef.current = nextPaused;
    setIsTimerPaused(nextPaused);
    if (announce) {
      const message = nextPaused ? "Timer paused." : "Timer resumed.";
      addTranscript("chef", message);
      speakLocal(message);
    }
  }

  function controlTimer(command: TimerCommand, announce = true) {
    const nextPaused =
      command === "toggle" ? !timerPausedRef.current : command === "pause";
    setTimerPaused(nextPaused, announce);
  }

  function readStep(idx = activeStepRef.current, prefix?: string) {
    const step = recipe.steps[idx];
    if (!step) return;
    const message = `${prefix ? `${prefix} ` : ""}Step ${idx + 1} of ${recipe.steps.length}. ${step.what_to_do}`;
    addTranscript("chef", message);
    speakLocal(message);
  }

  function goToStep(idx: number, announce = true) {
    const boundedIdx = Math.max(0, Math.min(recipe.steps.length - 1, idx));
    activeStepRef.current = boundedIdx;
    setActiveStep(boundedIdx);
    setElapsedSeconds(0);
    setTimerPaused(false, false);
    if (announce) {
      readStep(boundedIdx);
    }
  }

  function startCookingTimer(label: string, totalSeconds: number) {
    timerIdRef.current += 1;
    const timer: CookingTimer = {
      id: timerIdRef.current,
      label,
      remainingSeconds: totalSeconds,
      totalSeconds,
      paused: false,
      completed: false,
    };
    setTimers((current) => [timer, ...current.filter((t) => !t.completed)]);
    announce(`Started ${label} timer for ${formatTime(totalSeconds)}.`);
  }

  function updateCookingTimers(
    action: "pause" | "resume" | "stop",
    label?: string,
  ) {
    const normalizedLabel = label?.trim().toLowerCase();
    const matchingTimers = timersRef.current.filter(
      (timer) =>
        !timer.completed &&
        (!normalizedLabel ||
          timer.label.toLowerCase().includes(normalizedLabel)),
    );
    if (matchingTimers.length === 0) {
      announce(
        normalizedLabel
          ? `I don't see an active ${normalizedLabel} timer.`
          : "I don't see any active timers.",
      );
      return;
    }
    const ids = new Set(matchingTimers.map((timer) => timer.id));
    if (action === "stop") {
      setTimers((current) => current.filter((timer) => !ids.has(timer.id)));
      announce(
        matchingTimers.length === 1
          ? `Stopped the ${matchingTimers[0].label} timer.`
          : `Stopped ${matchingTimers.length} timers.`,
      );
      return;
    }
    setTimers((current) =>
      current.map((timer) =>
        ids.has(timer.id) ? { ...timer, paused: action === "pause" } : timer,
      ),
    );
    announce(
      matchingTimers.length === 1
        ? `${matchingTimers[0].label} timer ${action === "pause" ? "paused" : "resumed"}.`
        : `${matchingTimers.length} timers ${action === "pause" ? "paused" : "resumed"}.`,
    );
  }

  function announceTimerStatus() {
    const activeTimers = timersRef.current.filter((timer) => !timer.completed);
    if (activeTimers.length === 0) {
      announce("No active timers right now.");
      return;
    }
    announce(
      activeTimers
        .map(
          (timer) =>
            `${timer.label}: ${formatTime(timer.remainingSeconds)} ${timer.paused ? "paused" : "left"}`,
        )
        .join(". "),
    );
  }

  function handleToolCall(
    name: string,
    params: Record<string, unknown>,
    id: string,
    context: {
      sendToolResult: (
        id: string,
        result: { result: string; isError?: boolean },
      ) => void;
      stopQueuedSpeech: () => void;
    },
  ) {
    if (name === "timer_control" || name === "control_timer") {
      const action = String(params.action ?? params.command ?? "");
      if (action === "start" || action === "set") {
        const seconds = Number(
          params.duration_seconds ??
            params.seconds ??
            Number(params.minutes ?? 0) * 60,
        );
        if (Number.isFinite(seconds) && seconds > 0) {
          const label = String(params.label ?? "timer");
          recordAction("Started a named cooking timer.");
          startCookingTimer(label, seconds);
          context.sendToolResult(id, {
            result: `Started ${label} timer for ${formatTime(seconds)}.`,
          });
          return;
        }
      }
      if (action === "status") {
        const activeTimers = timersRef.current.filter(
          (timer) => !timer.completed,
        );
        const result =
          activeTimers.length > 0
            ? activeTimers
                .map(
                  (timer) =>
                    `${timer.label}: ${formatTime(timer.remainingSeconds)} ${timer.paused ? "paused" : "left"}`,
                )
                .join(". ")
            : "No active timers.";
        context.sendToolResult(id, { result });
        recordAction("Read active timer status.");
        announceTimerStatus();
        return;
      }
      if (action === "stop" || action === "cancel") {
        recordAction("Stopped timer.");
        updateCookingTimers("stop", String(params.label ?? ""));
        context.sendToolResult(id, { result: "Timer stopped." });
        return;
      }
      if (action === "pause" || action === "resume" || action === "toggle") {
        const label = String(params.label ?? "").trim();
        if (label) {
          recordAction(
            action === "resume"
              ? "Resumed active timer."
              : "Paused active timer.",
          );
          updateCookingTimers(action === "toggle" ? "pause" : action, label);
        } else {
          recordAction(
            action === "resume" ? "Resumed step timer." : "Paused step timer.",
          );
          controlTimer(action);
        }
        context.sendToolResult(id, {
          result:
            action === "pause"
              ? "Timer paused."
              : action === "resume"
                ? "Timer resumed."
                : timerPausedRef.current
                  ? "Timer paused."
                  : "Timer resumed.",
        });
        return;
      }

      context.sendToolResult(id, {
        result: `Unsupported timer action: ${action}`,
        isError: true,
      });
      return;
    }

    if (name !== "navigate_step") {
      context.sendToolResult(id, {
        result: `Unsupported client tool: ${name}`,
        isError: true,
      });
      return;
    }

    context.stopQueuedSpeech();

    let idx = activeStepRef.current;
    const dir = params.direction;
    if (dir === "next") idx = Math.min(recipe.steps.length - 1, idx + 1);
    else if (dir === "previous" || dir === "back") idx = Math.max(0, idx - 1);
    else if (dir !== "repeat") {
      context.sendToolResult(id, {
        result: `Unsupported navigation direction: ${String(dir)}`,
        isError: true,
      });
      return;
    }

    const step = recipe.steps[idx];
    const result = step
      ? `Step ${idx + 1} of ${recipe.steps.length}: ${step.what_to_do}`
      : dir === "next"
        ? "That's the last step - you're done!"
        : "Already at the first step.";

    context.sendToolResult(id, { result });

    if (step) {
      recordAction(`Jumped to step ${idx + 1}.`);
      goToStep(idx);
    }
  }

  const { agentMessage, connectionError, mode, speakLocal } =
    useHandsFreeVoiceSession({
      cookingContext,
      onAgentResponse: (text) => addTranscript("chef", text),
      onClientToolCall: handleToolCall,
      recipe,
    });

  function manualNav(dir: "next" | "prev") {
    const idx =
      dir === "next"
        ? Math.min(recipe.steps.length - 1, activeStep + 1)
        : Math.max(0, activeStep - 1);
    goToStep(idx);
  }

  const modeConfig: Record<
    HandsFreeModeStatus,
    { label: string; icon: string; ring: string }
  > = {
    connecting: {
      label: "Connecting...",
      icon: "mic",
      ring: "bg-white/10 text-white/30",
    },
    listening: {
      label: "Listening...",
      icon: "mic",
      ring: "animate-pulse bg-amber-400/20 text-amber-400",
    },
    speaking: {
      label: "Speaking...",
      icon: "volume_up",
      ring: "bg-amber-400/30 text-amber-300",
    },
    disconnected: {
      label: "Disconnected",
      icon: "mic_off",
      ring: "bg-red-500/20 text-red-400",
    },
  };
  const { label, icon, ring } = modeConfig[mode];
  const visibleTimers = timers.filter((timer) => !timer.completed).slice(0, 4);
  const completedTimers = timers.filter((timer) => timer.completed).slice(0, 2);

  return (
    <div className="fixed inset-0 z-80 overflow-y-auto bg-[#081514] text-white">
      <div className="pointer-events-none fixed inset-0 opacity-80">
        <div className="absolute left-1/2 top-[-18rem] h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-[#ffb84d]/20 blur-3xl" />
        <div className="absolute bottom-[-18rem] right-[-12rem] h-[34rem] w-[34rem] rounded-full bg-[#3dd6c6]/10 blur-3xl" />
      </div>

      <div className="relative flex min-h-dvh flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.26em] text-amber-300">
              Cook with Chef
            </p>
            <h2 className="truncate text-lg font-black text-white sm:text-2xl">
              {recipe.name}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => controlTimer("toggle")}
              aria-label={isTimerPaused ? "Resume timer" : "Pause timer"}
              className={`hidden items-center gap-3 rounded-2xl border px-4 py-2 text-left transition-colors sm:flex ${
                isTimerPaused
                  ? "border-amber-300/50 bg-amber-300/15"
                  : "border-white/10 bg-white/10 hover:bg-white/15"
              }`}
            >
              <span className="material-symbols-outlined text-[24px] text-amber-300">
                {isTimerPaused ? "play_arrow" : "pause"}
              </span>
              <span>
                <span className="block font-mono text-2xl font-black leading-none tabular-nums text-amber-300">
                  {formatTime(elapsedSeconds)}
                </span>
                <span className="block text-[9px] font-bold uppercase tracking-widest text-white/45">
                  {isTimerPaused ? "Paused" : "This step"}
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Exit cooking copilot"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
            >
              <span className="material-symbols-outlined text-[22px]">
                close
              </span>
            </button>
          </div>
        </header>

        <div className="h-1 bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-amber-300 via-orange-400 to-teal-300 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <main className="grid flex-1 gap-5 px-4 py-5 pb-28 sm:px-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)] lg:pb-6">
          <section className="flex min-h-[55dvh] flex-col justify-between rounded-[2rem] border border-white/10 bg-white/[0.055] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:p-7">
            <div>
              <div className="mb-6 flex items-center justify-center">
                <div className="relative grid h-32 w-32 place-items-center sm:h-40 sm:w-40">
                  <span
                    className={`absolute inset-0 rounded-full ${
                      mode === "listening"
                        ? "animate-ping bg-amber-300/20"
                        : mode === "speaking"
                          ? "bg-teal-300/20"
                          : "bg-white/10"
                    }`}
                  />
                  <span className="absolute inset-4 rounded-full border border-white/15 bg-gradient-to-br from-white/18 to-white/5 shadow-inner" />
                  <span
                    className={`relative grid h-20 w-20 place-items-center rounded-full sm:h-24 sm:w-24 ${ring}`}
                  >
                    <span className="material-symbols-outlined text-[34px]">
                      {icon}
                    </span>
                  </span>
                </div>
              </div>

              <div className="mx-auto max-w-3xl text-center">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/45">
                  {label}
                </p>
                <h1 className="mt-3 text-3xl font-black leading-tight tracking-tight text-white sm:text-5xl">
                  {agentMessage ??
                    (mode === "listening"
                      ? "I'm listening. Ask what to do next."
                      : mode === "speaking"
                        ? "Chef is talking you through it."
                        : mode === "connecting"
                          ? "Setting up your kitchen copilot..."
                          : "Voice is offline, but controls still work.")}
                </h1>
                {connectionError ? (
                  <p className="mx-auto mt-4 max-w-xl rounded-2xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm leading-6 text-red-100/85">
                    {connectionError}
                  </p>
                ) : null}
              </div>
            </div>

            <HandsFreeTranscriptPanel
              lastAction={lastAction}
              lastHeard={lastHeard}
              transcript={transcript}
            />
          </section>

          <HandsFreeAsidePanels
            activeStep={activeStep}
            body={body}
            completedTimers={completedTimers}
            contextLines={contextLines}
            controlTimer={controlTimer}
            currentPhase={currentPhase}
            elapsedSeconds={elapsedSeconds}
            isTimerPaused={isTimerPaused}
            nextStep={nextStep}
            recipe={recipe}
            setTimers={setTimers}
            stepIngredients={stepIngredients}
            title={title}
            visibleTimers={visibleTimers}
          />
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-[81] border-t border-white/10 bg-[#081514]/90 px-4 py-3 backdrop-blur-xl sm:px-6 lg:relative lg:border-t-0 lg:bg-transparent lg:pb-6">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => manualNav("prev")}
              disabled={activeStep === 0}
              aria-label="Previous step"
              className="flex h-13 w-13 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-30"
            >
              <span className="material-symbols-outlined text-[26px]">
                arrow_back
              </span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => readStep()}
                className="hidden rounded-full bg-white/10 px-4 py-3 text-sm font-bold text-white/75 hover:bg-white/15 sm:block"
              >
                Repeat
              </button>
              <button
                type="button"
                onClick={() => controlTimer("toggle")}
                className="rounded-full bg-amber-300 px-5 py-3 text-sm font-black text-[#1c1505] shadow-[0_14px_40px_rgba(251,191,36,0.25)]"
              >
                {isTimerPaused ? "Resume" : "Pause"}
              </button>
            </div>

            <button
              type="button"
              onClick={() => manualNav("next")}
              disabled={activeStep >= recipe.steps.length - 1}
              aria-label="Next step"
              className="flex h-13 w-13 items-center justify-center rounded-full bg-amber-300 text-[#1c1505] transition-colors hover:bg-amber-200 disabled:opacity-30"
            >
              <span className="material-symbols-outlined text-[26px]">
                arrow_forward
              </span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
