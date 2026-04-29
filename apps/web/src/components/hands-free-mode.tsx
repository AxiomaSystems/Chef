"use client";

import { useEffect, useRef, useState } from "react";
import type { BaseRecipe } from "@cart/shared";

type SpeechRecognitionResultEvent = Event & {
  results: {
    [index: number]: {
      [index: number]: {
        transcript?: string;
      };
    };
  };
};

type SpeechRecognitionErrorLikeEvent = Event & {
  error?: string;
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorLikeEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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
    return name
      .split(" ")
      .some((word) => word.length > 3 && lower.includes(word));
  });
}

function speakText(text: string) {
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.88;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

type Props = {
  recipe: BaseRecipe;
  onClose: () => void;
};

export function HandsFreeMode({ recipe, onClose }: Props) {
  const [activeStep, setActiveStep] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [voiceFeedback, setVoiceFeedback] = useState<string | null>(null);
  const [lastHeard, setLastHeard] = useState<string | null>(null);
  const [voiceSupported, setVoiceSupported] = useState(true);

  // Stable refs so recognition callbacks always see latest values
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const currentStepTextRef = useRef<string | null>(null);
  const stepsLengthRef = useRef(recipe.steps.length);
  stepsLengthRef.current = recipe.steps.length;

  const currentStep = recipe.steps[activeStep] ?? null;
  const stepIngredients = currentStep
    ? getStepIngredients(currentStep.what_to_do, recipe.ingredients)
    : [];
  const { title, body } = currentStep
    ? splitTitle(currentStep.what_to_do)
    : { title: "No steps available.", body: "" };

  // Keep step text ref fresh
  useEffect(() => {
    currentStepTextRef.current = currentStep?.what_to_do ?? null;
  }, [currentStep]);

  // Auto-read step aloud whenever it changes
  useEffect(() => {
    if (!currentStep) return;
    const t = setTimeout(() => speakText(currentStep.what_to_do), 350);
    return () => {
      clearTimeout(t);
      window.speechSynthesis.cancel();
    };
  }, [activeStep]); // eslint-disable-line react-hooks/exhaustive-deps

  // Per-step timer
  useEffect(() => {
    setElapsedSeconds(0);
    const interval = window.setInterval(
      () => setElapsedSeconds((s) => s + 1),
      1000,
    );
    return () => window.clearInterval(interval);
  }, [activeStep]);

  // Voice recognition — non-continuous, immediate restart so indicator never flickers
  useEffect(() => {
    const speechWindow = window as Window & {
      SpeechRecognition?: BrowserSpeechRecognitionConstructor;
      webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
    };
    const SR =
      speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

    if (!SR) {
      setVoiceSupported(false);
      return;
    }

    const Recognition = SR;
    let active = true;

    function showFeedback(text: string) {
      setVoiceFeedback(text);
      setTimeout(() => setVoiceFeedback(null), 2500);
    }

    function handleTranscript(transcript: string) {
      setLastHeard(transcript);
      setTimeout(() => setLastHeard(null), 3500);

      if (transcript.includes("next")) {
        showFeedback("Next step");
        setActiveStep((s) => Math.min(stepsLengthRef.current - 1, s + 1));
      } else if (
        transcript.includes("back") ||
        transcript.includes("previous") ||
        transcript.includes("go back")
      ) {
        showFeedback("Previous step");
        setActiveStep((s) => Math.max(0, s - 1));
      } else if (
        transcript.includes("repeat") ||
        transcript.includes("again") ||
        transcript.includes("read")
      ) {
        showFeedback("Repeating step");
        if (currentStepTextRef.current) speakText(currentStepTextRef.current);
      } else if (
        transcript.includes("exit") ||
        transcript.includes("close") ||
        transcript.includes("quit") ||
        transcript.includes("done")
      ) {
        showFeedback("Exiting...");
        setTimeout(() => onCloseRef.current(), 800);
      }
    }

    function start() {
      if (!active) return;

      // Mark as listening immediately so the indicator never flickers during restart
      setIsListening(true);

      const rec = new Recognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";
      rec.maxAlternatives = 1;

      rec.onresult = (event) => {
        const transcript = event.results[0]?.[0]?.transcript
          ?.trim()
          .toLowerCase();
        if (transcript) handleTranscript(transcript);
      };

      rec.onerror = (event) => {
        if (
          event.error === "not-allowed" ||
          event.error === "service-not-allowed"
        ) {
          setVoiceSupported(false);
          setIsListening(false);
          active = false;
        }
        // all other errors (no-speech, network, aborted) — onend will restart
      };

      rec.onend = () => {
        // 50ms is enough for browser cleanup but imperceptible to the user
        if (active) setTimeout(start, 50);
        else setIsListening(false);
      };

      try {
        rec.start();
      } catch {
        if (active) setTimeout(start, 200);
      }
    }

    start();

    return () => {
      active = false;
      setIsListening(false);
      window.speechSynthesis.cancel();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-80 flex flex-col bg-[#0f0a05] text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pb-4 pt-6">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-400/70">
            Hands-free
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-white/60">
            Step {activeStep + 1} of {recipe.steps.length}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-white/10 px-5 py-2 text-center">
            <p className="font-mono text-2xl font-semibold tabular-nums text-amber-300">
              {formatTime(elapsedSeconds)}
            </p>
            <p className="text-[10px] uppercase tracking-widest text-white/40">
              This step
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
            aria-label="Exit hands-free mode"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-white/10">
        <div
          className="h-full bg-amber-400/60 transition-all duration-300"
          style={{
            width: `${((activeStep + 1) / recipe.steps.length) * 100}%`,
          }}
        />
      </div>

      {/* Step content */}
      <div className="flex flex-1 flex-col items-center justify-center px-8 py-10 text-center">
        <p className="mb-6 text-5xl font-bold leading-tight tracking-tight text-white sm:text-6xl">
          {title}
        </p>
        {body ? (
          <p className="max-w-2xl text-xl leading-8 text-white/60">{body}</p>
        ) : null}

        {stepIngredients.length > 0 ? (
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {stepIngredients.map((ing, i) => (
              <span
                key={i}
                className="rounded-full bg-amber-400/15 px-4 py-1.5 text-sm text-amber-200/80"
              >
                {ing.amount} {ing.unit}{" "}
                {ing.display_ingredient ?? ing.canonical_ingredient}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {/* Voice feedback toast */}
      {voiceFeedback ? (
        <div className="pointer-events-none absolute left-1/2 top-24 -translate-x-1/2 whitespace-nowrap rounded-2xl bg-amber-400/20 px-6 py-3 text-sm font-medium text-amber-300 backdrop-blur-sm">
          {voiceFeedback}
        </div>
      ) : null}

      {/* Bottom navigation */}
      <div className="flex items-center justify-between gap-4 px-8 pb-10 pt-4">
        <button
          type="button"
          onClick={() => setActiveStep((s) => Math.max(0, s - 1))}
          disabled={activeStep === 0}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-30"
          aria-label="Previous step"
        >
          <span className="material-symbols-outlined text-[28px]">
            arrow_back
          </span>
        </button>

        <div className="flex flex-col items-center gap-2">
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-full transition-colors ${
              isListening
                ? "animate-pulse bg-amber-400/30 text-amber-300"
                : "bg-white/10 text-white/40"
            }`}
          >
            <span className="material-symbols-outlined text-[28px]">mic</span>
          </div>

          {voiceSupported ? (
            <p className="text-center text-[11px] text-white/40">
              {lastHeard ? (
                <span className="text-amber-300/70">
                  &ldquo;{lastHeard}&rdquo;
                </span>
              ) : isListening ? (
                "Listening..."
              ) : (
                'Say "next", "back", "repeat"'
              )}
            </p>
          ) : (
            <p className="text-[11px] text-white/40">
              Voice unavailable — use buttons
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() =>
            setActiveStep((s) => Math.min(recipe.steps.length - 1, s + 1))
          }
          disabled={activeStep >= recipe.steps.length - 1}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-400/20 text-amber-300 transition-colors hover:bg-amber-400/30 disabled:opacity-30"
          aria-label="Next step"
        >
          <span className="material-symbols-outlined text-[28px]">
            arrow_forward
          </span>
        </button>
      </div>
    </div>
  );
}
