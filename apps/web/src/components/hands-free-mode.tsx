"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
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

function formatIngredientQuantity(
  ingredient: BaseRecipe["ingredients"][number],
) {
  return [
    ingredient.amount,
    ingredient.unit,
    ingredient.display_ingredient ?? ingredient.canonical_ingredient,
    ingredient.preparation,
  ]
    .filter((part) => part !== null && part !== undefined && part !== "")
    .map(String)
    .join(" ");
}

function normalizeIngredientText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function singularizeToken(value: string) {
  if (value.endsWith("ies") && value.length > 4)
    return `${value.slice(0, -3)}y`;
  if (value.endsWith("es") && value.length > 4) return value.slice(0, -2);
  if (value.endsWith("s") && value.length > 3) return value.slice(0, -1);
  return value;
}

function ingredientTokens(ingredient: BaseRecipe["ingredients"][number]) {
  const source = [
    ingredient.canonical_ingredient,
    ingredient.display_ingredient,
    ingredient.preparation,
  ]
    .filter(Boolean)
    .join(" ");

  return normalizeIngredientText(source)
    .split(" ")
    .map(singularizeToken)
    .filter((token) => token.length >= 4);
}

function getStepIngredientItems(
  stepText: string | undefined,
  ingredients: BaseRecipe["ingredients"],
) {
  if (!stepText) return [];
  const normalizedStep = ` ${normalizeIngredientText(stepText)} `;
  const stepTokens = new Set(
    normalizedStep.trim().split(" ").map(singularizeToken),
  );

  return ingredients
    .filter((ingredient) => {
      const names = [
        ingredient.canonical_ingredient,
        ingredient.display_ingredient,
      ].filter(Boolean);
      const directMatch = names.some((name) => {
        const normalizedName = normalizeIngredientText(String(name));
        return normalizedName && normalizedStep.includes(` ${normalizedName} `);
      });

      return (
        directMatch ||
        ingredientTokens(ingredient).some((token) => stepTokens.has(token))
      );
    })
    .map(formatIngredientQuantity)
    .filter(Boolean);
}

type ScreenWakeLockSentinel = {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: "release", listener: () => void) => void;
  removeEventListener: (type: "release", listener: () => void) => void;
};

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

  function announce(text: string, _speak = true) {
    addTranscript("chef", text);
  }

  useEffect(() => {
    activeStepRef.current = activeStep;
  }, [activeStep]);
  useEffect(() => {
    timersRef.current = timers;
  }, [timers]);

  useEffect(() => {
    let mounted = true;
    let wakeLock: ScreenWakeLockSentinel | null = null;
    const nav = navigator as Navigator & {
      wakeLock?: {
        request: (type: "screen") => Promise<ScreenWakeLockSentinel>;
      };
    };

    function handleWakeLockRelease() {
      wakeLock?.removeEventListener("release", handleWakeLockRelease);
      wakeLock = null;
      if (mounted && document.visibilityState === "visible") {
        void requestWakeLock();
      }
    }

    async function requestWakeLock() {
      if (!mounted || !nav.wakeLock || document.visibilityState !== "visible") {
        return;
      }
      try {
        wakeLock = await nav.wakeLock.request("screen");
        wakeLock.addEventListener("release", handleWakeLockRelease);
      } catch {
        wakeLock = null;
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible" && !wakeLock) {
        void requestWakeLock();
      }
    }

    void requestWakeLock();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mounted = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      wakeLock?.removeEventListener("release", handleWakeLockRelease);
      void wakeLock?.release().catch(() => {});
      wakeLock = null;
    };
  }, []);

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

  function readStep(idx = activeStepRef.current, prefix?: string) {
    const step = recipe.steps[idx];
    if (!step) return;
    const message = `${prefix ? `${prefix} ` : ""}Step ${idx + 1} of ${recipe.steps.length}. ${step.what_to_do}`;
    addTranscript("chef", message);
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
  ): { label: string; updated: boolean } {
    const normalizedLabel = label.trim().toLowerCase();
    const existingTimer = timersRef.current.find(
      (timer) =>
        !timer.completed &&
        timer.label.trim().toLowerCase() === normalizedLabel,
    );

    if (existingTimer) {
      setTimers((current) =>
        current.map((timer) =>
          timer.id === existingTimer.id
            ? {
                ...timer,
                label,
                remainingSeconds: totalSeconds,
                totalSeconds,
                paused: false,
                completed: false,
              }
            : timer,
        ),
      );
      announce(`Updated ${label} timer to ${formatTime(totalSeconds)}.`, speak);
      return { label, updated: true };
    }

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
    return { label, updated: false };
  }

  function getContextualTimerLabel(rawLabel?: unknown) {
    const label = String(rawLabel ?? "").trim();
    const genericLabels = new Set(["", "timer", "cooking timer"]);
    if (label && !genericLabels.has(label.toLowerCase())) return label;

    const activeTimers = timersRef.current.filter((timer) => !timer.completed);
    if (activeTimers.length === 1) return activeTimers[0].label;

    const currentStep = recipe.steps[activeStepRef.current]?.what_to_do ?? "";
    const lowerStep = currentStep.toLowerCase();
    const candidates: Array<[RegExp, string]> = [
      [/\b(bake|oven|roast)\b/, "bake"],
      [/\bsimmer\b/, "simmer"],
      [/\bboil\b/, "boil"],
      [/\bpasta\b/, "pasta"],
      [/\brice\b/, "rice"],
      [/\bsauce\b/, "sauce"],
      [/\bchicken\b/, "chicken"],
      [/\b(cookie|cookies)\b/, "cookies"],
      [/\bcool\b/, "cooling"],
      [/\brest\b/, "resting"],
    ];

    return (
      candidates.find(([pattern]) => pattern.test(lowerStep))?.[1] ??
      `step ${activeStepRef.current + 1}`
    );
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
      const action = String(
        params.action ?? params.command ?? "",
      ).toLowerCase();
      if (action === "start" || action === "set") {
        const seconds = Number(
          params.duration_seconds ??
            params.seconds ??
            Number(params.minutes ?? 0) * 60,
        );
        if (Number.isFinite(seconds) && seconds > 0) {
          const label = getContextualTimerLabel(params.label);
          const timerResult = startCookingTimer(label, seconds, false);
          recordAction(
            timerResult.updated
              ? "Updated a cooking timer."
              : "Started a named cooking timer.",
          );
          context.sendToolResult(id, {
            result: buildKitchenStateResult({
              timer_action: timerResult.updated ? "updated" : "started",
              timer: { label, duration_seconds: seconds },
              message: timerResult.updated
                ? `Updated ${label} timer to ${formatTime(seconds)}.`
                : `Started ${label} timer for ${formatTime(seconds)}.`,
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
    const normalizedDir = dir.replace(/[_-]+/g, " ").trim();
    const requestedStep = Number(
      params.step_number ?? params.step ?? params.index ?? NaN,
    );
    const directionStepMatch = normalizedDir.match(/\b(?:step\s*)?(\d+)\b/);
    const wantsLastStep =
      /\b(last|final|end|ending|finish(?:ing)?(?:\s+step)?)\b/.test(
        normalizedDir,
      );

    if (Number.isFinite(requestedStep) && requestedStep > 0) {
      idx = requestedStep - 1;
    } else if (directionStepMatch?.[1]) {
      idx = Number(directionStepMatch[1]) - 1;
    } else if (wantsLastStep) {
      idx = recipe.steps.length - 1;
    } else if (normalizedDir === "next") {
      idx = Math.min(recipe.steps.length - 1, idx + 1);
    } else if (normalizedDir === "previous" || normalizedDir === "back") {
      idx = Math.max(0, idx - 1);
    } else if (normalizedDir !== "repeat") {
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
        navigation_action: normalizedDir || "repeat",
        target_step_number: idx + 1,
        target_step_text: step.what_to_do,
        message: `Navigation succeeded. The visible step marker is now step ${
          idx + 1
        } of ${recipe.steps.length}: ${step.what_to_do}`,
      }),
    });
  }

  const {
    agentMessage,
    canTapToTalk,
    connectionError,
    isAudioPaused,
    mode,
    pauseAudioMode,
    resumeAudioMode,
    startTapToTalk,
    stopTapToTalk,
    stopQueuedSpeech,
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

  function moveStep(delta: number) {
    stopQueuedSpeech();
    goToStep(activeStepRef.current + delta, false);
  }

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
      label: "Say Chef, Prep, or Preppie",
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
    paused: {
      label: "Audio paused",
      icon: "pause",
      ring: "bg-surface-container text-outline",
    },
    disconnected: {
      label: "Disconnected",
      icon: "mic_off",
      ring: "bg-error-container/50 text-error",
    },
  };
  const { label, ring } = modeConfig[mode];
  const visibleTimers = timers.filter((timer) => !timer.completed).slice(0, 4);
  const completedTimers = timers.filter((timer) => timer.completed).slice(0, 2);
  const primaryTimer = visibleTimers[0] ?? null;
  const currentStep = recipe.steps[activeStep];
  const stepProgress = recipe.steps.length
    ? ((activeStep + 1) / recipe.steps.length) * 100
    : 0;
  const currentStepAdjustment =
    adaptations.find(
      (adaptation) => adaptation.stepNumber === activeStep + 1,
    ) ?? null;
  const isThinking =
    mode === "connecting" ||
    (!!agentMessage &&
      agentMessage.startsWith("Heard:") &&
      mode !== "speaking");
  const ingredientQuantityItems = getStepIngredientItems(
    currentStep?.what_to_do,
    recipe.ingredients,
  ).slice(0, 8);

  return (
    <div className="fixed inset-0 z-80 max-w-full overflow-x-hidden overflow-y-auto bg-[#fff8ef] text-on-surface">
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

      <div className="relative flex min-h-dvh min-w-0 max-w-full flex-col overflow-x-hidden">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-[#eadfd2]/80 bg-[#fffdfa]/78 px-3 py-2.5 backdrop-blur-xl sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fff2e3] text-primary shadow-sm sm:flex">
              <span className="material-symbols-outlined text-[22px]">
                cooking
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-primary sm:text-[10px]">
                Hands-free
              </p>
              <h2 className="truncate text-base font-black leading-tight text-on-surface sm:text-2xl">
                {recipe.name}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Exit cooking copilot"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#c0dedf] bg-white text-[#5f8689] shadow-sm hover:bg-[#fff8ef] hover:text-on-surface sm:h-11 sm:w-11"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </header>

        <main className="grid min-w-0 flex-1 max-w-full gap-4 overflow-x-hidden px-2 py-3 pb-20 sm:px-6 sm:py-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:pb-6 xl:grid-cols-[minmax(0,1fr)_25rem]">
          <section className="min-w-0 max-w-full space-y-3 overflow-hidden sm:space-y-4">
            <section className="min-w-0 max-w-full overflow-hidden rounded-[1.25rem] border border-[#c0dedf] bg-white/84 p-3 shadow-[0_14px_42px_rgba(60,154,158,0.11)] backdrop-blur-xl sm:rounded-[1.75rem] sm:p-5 md:p-6">
              <div className="flex min-w-0 items-start gap-3 sm:gap-4 md:gap-6">
                <button
                  type="button"
                  onClick={isAudioPaused ? resumeAudioMode : pauseAudioMode}
                  disabled={mode === "connecting" || mode === "disconnected"}
                  aria-label={
                    isAudioPaused
                      ? "Resume Preppie audio"
                      : "Pause Preppie audio"
                  }
                  aria-pressed={isAudioPaused}
                  className="relative grid h-16 w-16 shrink-0 place-items-center disabled:cursor-not-allowed disabled:opacity-70 sm:h-20 sm:w-20 md:h-24 md:w-24"
                >
                  <span
                    className={`absolute inset-0 rounded-full ${
                      mode === "listening"
                        ? "animate-ping bg-primary/18"
                        : mode === "speaking"
                          ? "bg-[#c0dedf]/60"
                          : mode === "paused"
                            ? "bg-surface-container"
                            : "bg-[#fff2e3]"
                    }`}
                  />
                  {mode === "listening" ? (
                    <>
                      <span className="absolute inset-0 rounded-full border-2 border-primary/25 animate-ping" />
                      <span className="absolute inset-2 rounded-full border border-primary/20 animate-pulse" />
                    </>
                  ) : null}
                  {isThinking ? (
                    <span className="absolute inset-0 rounded-full border-2 border-dashed border-primary/40 animate-spin" />
                  ) : null}
                  {mode === "speaking" ? (
                    <span className="absolute inset-1 rounded-full bg-[#c0dedf]/55 animate-pulse" />
                  ) : null}
                  <span
                    className={`relative grid h-12 w-12 place-items-center overflow-hidden rounded-full border border-[#c0dedf] bg-white sm:h-14 sm:w-14 md:h-16 md:w-16 ${ring}`}
                  >
                    <Image
                      src="/P_Preppie Logo_web.png"
                      alt=""
                      width={48}
                      height={48}
                      className={`h-10 w-10 object-contain sm:h-12 sm:w-12 md:h-14 md:w-14 ${
                        isAudioPaused ? "grayscale" : ""
                      }`}
                    />
                  </span>
                </button>

                <div className="min-w-0 flex-1 space-y-2 md:space-y-4">
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="hidden text-[10px] font-black uppercase tracking-[0.18em] text-primary md:block">
                        Now cooking
                      </p>
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary md:mt-1 md:text-4xl md:normal-case md:tracking-normal md:text-on-surface">
                        Step {activeStep + 1}/{recipe.steps.length}
                      </p>
                      <p className="text-[10px] font-bold text-outline sm:text-xs">
                        {label}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => moveStep(-1)}
                        disabled={activeStep === 0}
                        aria-label="Previous step"
                        className="grid h-9 w-9 place-items-center rounded-full border border-[#c0dedf] bg-white text-[#5f8689] transition-colors hover:bg-[#fff8ef] disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:w-10"
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          arrow_back
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => moveStep(1)}
                        disabled={activeStep >= recipe.steps.length - 1}
                        aria-label="Next step"
                        className="grid h-9 w-9 place-items-center rounded-full bg-primary text-on-primary shadow-[0_10px_24px_rgba(244,121,13,0.18)] transition-colors hover:bg-on-primary-container disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:w-10"
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          arrow_forward
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="rounded-[1.15rem] border border-[#f4be6b]/45 bg-[#fff8ef]/78 p-3 md:rounded-[1.5rem] md:p-5">
                    <p className="hidden text-[10px] font-black uppercase tracking-[0.18em] text-primary md:block">
                      Current instruction
                    </p>
                    <p
                      className={`mt-0 text-lg font-black leading-6 text-on-surface md:mt-3 md:leading-tight ${
                        (currentStep?.what_to_do.length ?? 0) > 180
                          ? "line-clamp-6 md:text-2xl"
                          : (currentStep?.what_to_do.length ?? 0) > 100
                            ? "line-clamp-5 md:text-3xl"
                            : "line-clamp-5 md:text-4xl"
                      }`}
                    >
                      {currentStep?.what_to_do ?? "No recipe step loaded."}
                    </p>
                  </div>

                  <div className="h-1.5 overflow-hidden rounded-full bg-[#fff2e3] sm:h-2">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${stepProgress}%` }}
                    />
                  </div>

                  {agentMessage &&
                  (mode === "listening" ||
                    mode === "speaking" ||
                    mode === "paused" ||
                    mode === "connecting" ||
                    mode === "disconnected") ? (
                    <p className="line-clamp-2 text-xs font-semibold leading-4 text-on-surface-variant">
                      {agentMessage}
                    </p>
                  ) : null}

                  {ingredientQuantityItems.length > 0 ||
                  currentStepAdjustment ||
                  primaryTimer ? (
                    <div className="grid gap-2">
                      {ingredientQuantityItems.length > 0 ? (
                        <div className="max-w-full overflow-x-auto pb-1">
                          <div className="flex w-max max-w-none gap-2 pr-2">
                            {ingredientQuantityItems.map((item, index) => (
                              <span
                                key={`${item}-${index}`}
                                className="max-w-[11rem] truncate rounded-full border border-[#c0dedf]/70 bg-[#fffdfa] px-3 py-1.5 text-[11px] font-bold text-on-surface-variant md:text-xs"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {currentStepAdjustment ? (
                        <p className="line-clamp-2 rounded-2xl bg-[#fff2e3] px-3 py-2 text-xs font-semibold leading-5 text-on-surface-variant">
                          {currentStepAdjustment.title}:{" "}
                          {currentStepAdjustment.note}
                        </p>
                      ) : null}

                      {primaryTimer ? (
                        <p className="rounded-2xl bg-[#ecf8f4] px-3 py-2 text-xs font-bold text-on-surface-variant">
                          {primaryTimer.label}:{" "}
                          {formatTime(primaryTimer.remainingSeconds)}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>

              {connectionError ? (
                <p className="mt-4 rounded-2xl border border-error/20 bg-error-container/35 px-4 py-3 text-sm leading-6 text-error">
                  {connectionError}
                </p>
              ) : null}

              {canTapToTalk &&
              (mode === "waiting_for_tap" || mode === "listening") ? (
                <button
                  type="button"
                  onClick={
                    mode === "listening" ? stopTapToTalk : startTapToTalk
                  }
                  aria-label={
                    mode === "listening" ? "Stop listening" : "Tap to talk"
                  }
                  className="mt-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-on-primary shadow-[0_12px_28px_rgba(244,121,13,0.22)]"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {mode === "listening" ? "mic_off" : "mic"}
                  </span>
                </button>
              ) : null}
            </section>

            <HandsFreeAsidePanels
              adaptations={adaptations}
              completedTimers={completedTimers}
              setTimers={setTimers}
              visibleTimers={visibleTimers}
            />
          </section>

          <aside className="min-w-0 max-w-full space-y-4 overflow-hidden lg:sticky lg:top-24 lg:self-start">
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
