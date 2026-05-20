"use client";

import { useEffect, useRef, useState } from "react";
import type { BaseRecipe } from "@cart/shared";
import type { CookingContext } from "@/lib/cooking-context";
import {
  HandsFreeAsidePanels,
  HandsFreeTranscriptPanel,
} from "./hands-free-mode-panels";
import type {
  CookingAdaptation,
  HandsFreeSessionContext,
  CookingTimer,
  HandsFreeModeStatus,
  TranscriptEntry,
} from "./hands-free-mode-types";
import { useHandsFreeVoiceSession } from "./use-hands-free-voice-session";

function formatTime(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function cleanAgentText(text: string) {
  return text
    .replace(/\[[^\]]+\]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

type Props = {
  recipe: BaseRecipe;
  cookingContext?: CookingContext;
  sessionContext?: HandsFreeSessionContext;
  onClose: () => void;
};

export function HandsFreeMode({
  recipe,
  cookingContext,
  sessionContext,
  onClose,
}: Props) {
  const initialStepIndex = Math.max(
    0,
    Math.min(recipe.steps.length - 1, (sessionContext?.startingStep ?? 1) - 1),
  );
  const [activeStep, setActiveStep] = useState(initialStepIndex);
  const [timers, setTimers] = useState<CookingTimer[]>([]);
  const [lastHeard, setLastHeard] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [adaptations, setAdaptations] = useState<CookingAdaptation[]>([]);
  const timerIdRef = useRef(0);
  const timersRef = useRef<CookingTimer[]>([]);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);

  const activeStepRef = useRef(initialStepIndex);
  const adaptationIdRef = useRef(0);
  const handledToolCallIdsRef = useRef(new Set<string>());
  const transcriptIdRef = useRef(0);

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
  function addTranscript(speaker: TranscriptEntry["speaker"], text: string) {
    const trimmed =
      speaker === "chef"
        ? cleanAgentText(text)
        : text.replace(/\s+/g, " ").trim();
    if (!trimmed) return;
    transcriptIdRef.current += 1;
    const id = transcriptIdRef.current;
    setTranscript((prev) => [
      ...prev.slice(-5),
      { id, speaker, text: trimmed },
    ]);
  }

  function recordAction(text: string) {
    setLastAction(text);
    addTranscript("system", text);
  }

  function getActiveTimerSummaries() {
    return timersRef.current
      .filter((timer) => !timer.completed)
      .map((timer) => ({
        label: timer.label,
        remaining_seconds: timer.remainingSeconds,
        paused: timer.paused,
      }));
  }

  function buildKitchenStateResult(extra: Record<string, unknown> = {}) {
    const idx = activeStepRef.current;
    const step = recipe.steps[idx];

    return JSON.stringify({
      ok: true,
      current_step_number: step ? idx + 1 : null,
      total_steps: recipe.steps.length,
      current_reference_step: step?.what_to_do ?? null,
      active_timers: getActiveTimerSummaries(),
      instruction:
        "Trust this tool result as the current visible marker. The visible step is a reference marker, not the whole kitchen truth. If the user describes a live change, adapt from that context.",
      ...extra,
    });
  }

  function announce(text: string, speak = true) {
    addTranscript("chef", text);
    if (speak) speakLocal(text);
  }

  useEffect(() => {
    activeStepRef.current = activeStep;
  }, [activeStep]);
  useEffect(() => {
    timersRef.current = timers;
  }, [timers]);

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

  function readStep(
    idx = activeStepRef.current,
    prefix?: string,
    speak = true,
  ) {
    const step = recipe.steps[idx];
    if (!step) return;
    const message = `${prefix ? `${prefix} ` : ""}Step ${idx + 1} of ${recipe.steps.length}. ${step.what_to_do}`;
    addTranscript("chef", message);
    if (speak) speakLocal(message);
  }

  function goToStep(idx: number, announce = true) {
    const boundedIdx = Math.max(0, Math.min(recipe.steps.length - 1, idx));
    activeStepRef.current = boundedIdx;
    setActiveStep(boundedIdx);
    if (announce) {
      readStep(boundedIdx);
    }
  }

  function startCookingTimer(
    label: string,
    totalSeconds: number,
    speak = true,
  ) {
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
    announce(`Started ${label} timer for ${formatTime(totalSeconds)}.`, speak);
  }

  function updateCookingTimers(
    action: "pause" | "resume" | "stop",
    label?: string,
    speak = true,
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
        speak,
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
        speak,
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
      speak,
    );
  }

  function announceTimerStatus(speak = true) {
    const activeTimers = timersRef.current.filter((timer) => !timer.completed);
    if (activeTimers.length === 0) {
      announce("No active timers right now.", speak);
      return;
    }
    announce(
      activeTimers
        .map(
          (timer) =>
            `${timer.label}: ${formatTime(timer.remainingSeconds)} ${timer.paused ? "paused" : "left"}`,
        )
        .join(". "),
      speak,
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
    if (handledToolCallIdsRef.current.has(id)) {
      context.sendToolResult(id, {
        result: buildKitchenStateResult({
          duplicate: true,
          message:
            "This tool call was already handled. Do not repeat the action.",
        }),
      });
      return;
    }
    handledToolCallIdsRef.current.add(id);

    if (name === "end_conversation" || name === "finish_cooking") {
      recordAction("Ended cooking copilot session.");
      context.sendToolResult(id, {
        result: buildKitchenStateResult({
          ended: true,
          message: "Cooking copilot ended.",
        }),
      });
      onClose();
      return;
    }

    if (name === "record_cooking_note" || name === "adapt_current_step") {
      const note = String(
        params.note ?? params.adjustment ?? params.summary ?? "",
      ).trim();
      const rawTitle = String(params.title ?? params.reason ?? "").trim();
      const requestedStep = Number(
        params.step_number ?? params.step ?? params.index ?? NaN,
      );
      const stepNumber =
        Number.isFinite(requestedStep) && requestedStep > 0
          ? Math.max(1, Math.min(recipe.steps.length, requestedStep))
          : activeStepRef.current + 1;

      if (!note) {
        context.sendToolResult(id, {
          result: buildKitchenStateResult({
            ok: false,
            error: "Missing cooking note.",
          }),
          isError: true,
        });
        return;
      }

      adaptationIdRef.current += 1;
      const title = rawTitle || `Adjustment for step ${stepNumber}`;
      const adaptation: CookingAdaptation = {
        id: adaptationIdRef.current,
        stepNumber,
        title,
        note,
      };
      setAdaptations((current) => [adaptation, ...current].slice(0, 5));
      recordAction(title);
      context.sendToolResult(id, {
        result: buildKitchenStateResult({
          recorded_note: {
            step_number: stepNumber,
            title,
            note,
          },
          message:
            "Recorded a live cooking adjustment. Use it for this session, but do not claim the saved recipe changed.",
        }),
      });
      return;
    }

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
          startCookingTimer(label, seconds, false);
          context.sendToolResult(id, {
            result: buildKitchenStateResult({
              timer_action: "started",
              timer: { label, duration_seconds: seconds },
              message: `Started ${label} timer for ${formatTime(seconds)}.`,
            }),
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
        context.sendToolResult(id, {
          result: buildKitchenStateResult({
            timer_action: "status",
            message: result,
          }),
        });
        recordAction("Read active timer status.");
        announceTimerStatus(false);
        return;
      }
      if (action === "stop" || action === "cancel") {
        recordAction("Stopped timer.");
        updateCookingTimers("stop", String(params.label ?? ""), false);
        context.sendToolResult(id, {
          result: buildKitchenStateResult({
            timer_action: "stopped",
            message: "Timer stopped.",
          }),
        });
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
          updateCookingTimers(
            action === "toggle" ? "pause" : action,
            label,
            false,
          );
        } else {
          const activeTimers = timersRef.current.filter(
            (timer) => !timer.completed,
          );
          if (activeTimers.length === 0) {
            context.sendToolResult(id, {
              result: "No active timers.",
              isError: true,
            });
            recordAction("No active timers to control.");
            return;
          }
          const nextAction =
            action === "toggle"
              ? activeTimers.every((timer) => timer.paused)
                ? "resume"
                : "pause"
              : action;
          recordAction(
            nextAction === "resume"
              ? "Resumed active timers."
              : "Paused active timers.",
          );
          updateCookingTimers(nextAction, undefined, false);
        }
        context.sendToolResult(id, {
          result: buildKitchenStateResult({
            timer_action: action,
            message:
              action === "pause"
                ? "Timer paused."
                : action === "resume"
                  ? "Timer resumed."
                  : "Timer toggled.",
          }),
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
    const dir = String(params.direction ?? params.action ?? "").toLowerCase();
    const requestedStep = Number(
      params.step_number ?? params.step ?? params.index ?? NaN,
    );
    const directionStepMatch = dir.match(/\b(?:step\s*)?(\d+)\b/);

    if (Number.isFinite(requestedStep) && requestedStep > 0) {
      idx = requestedStep - 1;
    } else if (directionStepMatch?.[1]) {
      idx = Number(directionStepMatch[1]) - 1;
    } else if (dir === "next") {
      idx = Math.min(recipe.steps.length - 1, idx + 1);
    } else if (dir === "previous" || dir === "back") {
      idx = Math.max(0, idx - 1);
    } else if (dir !== "repeat") {
      context.sendToolResult(id, {
        result: `Unsupported navigation direction: ${String(dir)}`,
        isError: true,
      });
      return;
    }
    idx = Math.max(0, Math.min(recipe.steps.length - 1, idx));

    const step = recipe.steps[idx];
    if (!step) return;

    goToStep(idx, false);
    recordAction(`Visible marker is step ${idx + 1}.`);
    context.sendToolResult(id, {
      result: buildKitchenStateResult({
        navigation_action: dir || "repeat",
        message: `Navigation succeeded. The visible step marker is now step ${
          idx + 1
        } of ${recipe.steps.length}.`,
      }),
    });
  }

  const {
    agentMessage,
    canTapToTalk,
    connectionError,
    mode,
    speakLocal,
    startTapToTalk,
    stopTapToTalk,
    wakeDebug,
  } = useHandsFreeVoiceSession({
    cookingContext,
    onAgentResponse: (text) => addTranscript("chef", text),
    onClientToolCall: handleToolCall,
    onUserTranscript: (text) => {
      setLastHeard(text);
      addTranscript("you", text);
    },
    recipe,
    sessionContext,
  });

  const modeConfig: Record<
    HandsFreeModeStatus,
    { label: string; icon: string; ring: string }
  > = {
    connecting: {
      label: "Connecting...",
      icon: "mic",
      ring: "bg-[#fff8ef] text-outline",
    },
    waiting_for_wake: {
      label: 'Say "Chef"',
      icon: "radio_button_checked",
      ring: "bg-[#ecf8f4] text-[#2f7f83]",
    },
    waiting_for_tap: {
      label: "Tap to talk",
      icon: "touch_app",
      ring: "bg-[#ecf8f4] text-[#2f7f83]",
    },
    listening: {
      label: "Listening...",
      icon: "mic",
      ring: "animate-pulse bg-[#fff2e3] text-primary",
    },
    speaking: {
      label: "Speaking...",
      icon: "volume_up",
      ring: "bg-[#fff2e3] text-primary",
    },
    disconnected: {
      label: "Disconnected",
      icon: "mic_off",
      ring: "bg-error-container/50 text-error",
    },
  };
  const { label, icon, ring } = modeConfig[mode];
  const visibleTimers = timers.filter((timer) => !timer.completed).slice(0, 4);
  const completedTimers = timers.filter((timer) => timer.completed).slice(0, 2);
  return (
    <div className="fixed inset-0 z-80 overflow-y-auto bg-[#fff8ef] text-on-surface">
      <video
        className="pointer-events-none fixed inset-0 h-full w-full object-cover opacity-70"
        src="/videos/axioma-blobs.mp4"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,rgba(255,248,239,0.28)_0%,rgba(255,253,250,0.56)_44%,rgba(255,248,239,0.68)_100%)]" />

      <div className="relative flex min-h-dvh flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-[#eadfd2]/80 bg-[#fffdfa]/78 px-4 py-4 backdrop-blur-xl sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fff2e3] text-primary shadow-sm">
              <span className="material-symbols-outlined text-[22px]">
                cooking
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                Hands-free
              </p>
              <h2 className="truncate text-xl font-black leading-tight text-on-surface sm:text-2xl">
                {recipe.name}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Exit cooking copilot"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#c0dedf] bg-white text-[#5f8689] shadow-sm hover:bg-[#fff8ef] hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </header>

        <main className="grid flex-1 gap-5 px-4 py-5 pb-28 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:pb-6 xl:grid-cols-[minmax(0,1fr)_25rem]">
          <section className="space-y-4">
            <section className="rounded-[1.75rem] border border-[#c0dedf] bg-white/80 p-5 shadow-[0_18px_50px_rgba(60,154,158,0.12)] backdrop-blur-xl">
              <div className="flex items-center gap-4">
                <div className="relative grid h-20 w-20 shrink-0 place-items-center">
                  <span
                    className={`absolute inset-0 rounded-full ${
                      mode === "listening"
                        ? "animate-ping bg-primary/18"
                        : mode === "speaking"
                          ? "bg-[#c0dedf]/60"
                          : "bg-[#fff2e3]"
                    }`}
                  />
                  <span
                    className={`relative grid h-14 w-14 place-items-center rounded-full border border-[#c0dedf] ${ring}`}
                  >
                    <span className="material-symbols-outlined text-[26px]">
                      {icon}
                    </span>
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                    {label}
                  </p>
                  <p className="mt-1 line-clamp-3 text-lg font-black leading-6 text-on-surface">
                    {agentMessage ??
                      (mode === "waiting_for_wake"
                        ? 'Say "Chef" when you need me.'
                        : mode === "waiting_for_tap"
                          ? "Tap the mic when you need me."
                          : mode === "listening"
                            ? "I'm listening."
                            : mode === "speaking"
                              ? "Chef is responding."
                              : mode === "connecting"
                                ? "Setting up Chef..."
                                : "Voice is offline.")}
                  </p>
                </div>
              </div>

              {connectionError ? (
                <p className="mt-4 rounded-2xl border border-error/20 bg-error-container/35 px-4 py-3 text-sm leading-6 text-error">
                  {connectionError}
                </p>
              ) : null}

              {wakeDebug && mode !== "disconnected" ? (
                <p className="mt-3 rounded-2xl bg-[#fff8ef] px-4 py-3 text-xs leading-5 text-outline">
                  {wakeDebug}
                </p>
              ) : null}

              {canTapToTalk &&
              (mode === "waiting_for_tap" || mode === "listening") ? (
                <button
                  type="button"
                  onClick={
                    mode === "listening" ? stopTapToTalk : startTapToTalk
                  }
                  className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-black text-on-primary shadow-[0_12px_28px_rgba(244,121,13,0.22)]"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {mode === "listening" ? "mic_off" : "mic"}
                  </span>
                  {mode === "listening" ? "Stop listening" : "Tap to talk"}
                </button>
              ) : null}
            </section>

            <HandsFreeAsidePanels
              activeStep={activeStep}
              adaptations={adaptations}
              completedTimers={completedTimers}
              currentPhase={currentPhase}
              recipe={recipe}
              setTimers={setTimers}
              visibleTimers={visibleTimers}
            />
          </section>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <HandsFreeTranscriptPanel
              lastAction={lastAction}
              lastHeard={lastHeard}
              transcript={transcript}
            />
          </aside>
        </main>
      </div>
    </div>
  );
}
