"use client";

import { useMemo, useState } from "react";
import type { BaseRecipe } from "@cart/shared";
import type {
  HandsFreeGuidanceStyle,
  HandsFreeSessionContext,
  HandsFreeVoiceActivationMode,
} from "./hands-free-mode-types";

type Props = {
  recipe: BaseRecipe;
  onCancel: () => void;
  onStart: (context: HandsFreeSessionContext) => void;
};

const GUIDANCE_OPTIONS: Array<{
  value: HandsFreeGuidanceStyle;
  label: string;
  detail: string;
}> = [
  {
    value: "on_demand",
    label: "Only when I ask",
    detail: "Quiet by default, short answers.",
  },
  {
    value: "close",
    label: "Guide me closely",
    detail: "More proactive step support.",
  },
  {
    value: "brief",
    label: "Extra short",
    detail: "Fast, spoken-friendly replies.",
  },
  {
    value: "beginner",
    label: "Beginner mode",
    detail: "Explain kitchen terms simply.",
  },
];

const VOICE_ACTIVATION_STORAGE_KEY = "chef:hands-free:voice-activation-mode";

const VOICE_ACTIVATION_OPTIONS: Array<{
  value: HandsFreeVoiceActivationMode;
  label: string;
  detail: string;
}> = [
  {
    value: "wake_word",
    label: "Say Preppie",
    detail: "Also recognizes Prep and Preppie before each command.",
  },
  {
    value: "tap_to_talk",
    label: "Tap to talk",
    detail: "Most reliable across Safari, Firefox, Brave, and mobile.",
  },
  {
    value: "always_listening",
    label: "Wake listening",
    detail: "Listens for Preppie or Prep while cook mode is active.",
  },
];

function readSavedVoiceActivationMode(): HandsFreeVoiceActivationMode {
  if (typeof window === "undefined") return "wake_word";
  const saved = window.localStorage.getItem(VOICE_ACTIVATION_STORAGE_KEY);
  if (
    saved === "wake_word" ||
    saved === "tap_to_talk" ||
    saved === "always_listening"
  ) {
    return saved;
  }
  return "SpeechRecognition" in window || "webkitSpeechRecognition" in window
    ? "wake_word"
    : "tap_to_talk";
}

export function HandsFreeSetupModal({ recipe, onCancel, onStart }: Props) {
  const [notes, setNotes] = useState("");
  const [ingredientChanges, setIngredientChanges] = useState("");
  const [equipmentNotes, setEquipmentNotes] = useState("");
  const [guidanceStyle, setGuidanceStyle] =
    useState<HandsFreeGuidanceStyle>("on_demand");
  const [startingStep, setStartingStep] = useState(1);
  const [voiceActivationMode, setVoiceActivationMode] =
    useState<HandsFreeVoiceActivationMode>(readSavedVoiceActivationMode);

  const boundedStartingStep = useMemo(
    () => Math.max(1, Math.min(recipe.steps.length || 1, startingStep)),
    [recipe.steps.length, startingStep],
  );

  function selectVoiceActivationMode(mode: HandsFreeVoiceActivationMode) {
    setVoiceActivationMode(mode);
    window.localStorage.setItem(VOICE_ACTIVATION_STORAGE_KEY, mode);
  }

  function start() {
    onStart({
      notes: notes.trim(),
      ingredientChanges: ingredientChanges.trim(),
      equipmentNotes: equipmentNotes.trim(),
      guidanceStyle,
      startingStep: boundedStartingStep,
      voiceActivationMode,
    });
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[78] bg-black/45 backdrop-blur-sm"
        onClick={onCancel}
      />
      <section className="fixed left-1/2 top-1/2 z-[79] flex max-h-[min(760px,calc(100vh-2rem))] w-[min(680px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[28px] bg-[#fffdfa] shadow-[0_32px_110px_rgba(40,24,12,0.28)]">
        <header className="border-b border-outline-variant/25 px-5 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary-fixed-dim">
                Before cooking
              </p>
              <h2 className="mt-2 text-2xl font-black leading-tight text-on-surface">
                Set Preppie up for this session
              </h2>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                Add anything temporary Preppie should know. This does not change
                the saved recipe.
              </p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              aria-label="Close hands-free setup"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container text-outline hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-[20px]">
                close
              </span>
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="space-y-5">
            <label className="block">
              <span className="text-sm font-black text-on-surface">
                Anything Preppie should know?
              </span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder="I already started cooking, I only have 30 minutes, cooking for kids..."
                className="mt-2 w-full resize-none rounded-2xl border border-outline-variant/50 bg-white px-4 py-3 text-sm leading-6 text-on-surface outline-none focus:border-primary-fixed-dim"
              />
            </label>

            <label className="block">
              <span className="text-sm font-black text-on-surface">
                Ingredient changes
              </span>
              <textarea
                value={ingredientChanges}
                onChange={(event) => setIngredientChanges(event.target.value)}
                rows={2}
                placeholder="No chicken, using chickpeas. Out of cilantro. Already chopped onions."
                className="mt-2 w-full resize-none rounded-2xl border border-outline-variant/50 bg-white px-4 py-3 text-sm leading-6 text-on-surface outline-none focus:border-primary-fixed-dim"
              />
            </label>

            <label className="block">
              <span className="text-sm font-black text-on-surface">
                Equipment situation
              </span>
              <textarea
                value={equipmentNotes}
                onChange={(event) => setEquipmentNotes(event.target.value)}
                rows={2}
                placeholder="No oven, one burner, small pan, air fryer only..."
                className="mt-2 w-full resize-none rounded-2xl border border-outline-variant/50 bg-white px-4 py-3 text-sm leading-6 text-on-surface outline-none focus:border-primary-fixed-dim"
              />
            </label>

            <div>
              <p className="text-sm font-black text-on-surface">
                Guidance style
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {GUIDANCE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setGuidanceStyle(option.value)}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      guidanceStyle === option.value
                        ? "border-primary-fixed-dim bg-[#fff2e3]"
                        : "border-outline-variant/40 bg-white hover:border-primary-fixed-dim/50"
                    }`}
                  >
                    <span className="block text-sm font-black text-on-surface">
                      {option.label}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-on-surface-variant">
                      {option.detail}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="text-sm font-black text-on-surface">
                Start from step
              </span>
              <select
                value={boundedStartingStep}
                onChange={(event) =>
                  setStartingStep(Number(event.target.value))
                }
                className="mt-2 w-full rounded-2xl border border-outline-variant/50 bg-white px-4 py-3 text-sm text-on-surface outline-none focus:border-primary-fixed-dim"
              >
                {recipe.steps.map((step, index) => (
                  <option key={step.step} value={index + 1}>
                    Step {index + 1}: {step.what_to_do.slice(0, 72)}
                    {step.what_to_do.length > 72 ? "..." : ""}
                  </option>
                ))}
              </select>
            </label>

            <div>
              <p className="text-sm font-black text-on-surface">
                Voice activation
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {VOICE_ACTIVATION_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => selectVoiceActivationMode(option.value)}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      voiceActivationMode === option.value
                        ? "border-primary-fixed-dim bg-[#fff2e3]"
                        : "border-outline-variant/40 bg-white hover:border-primary-fixed-dim/50"
                    }`}
                  >
                    <span className="block text-sm font-black text-on-surface">
                      {option.label}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-on-surface-variant">
                      {option.detail}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <footer className="flex flex-col-reverse gap-3 border-t border-outline-variant/25 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-outline-variant bg-white px-5 py-3 text-sm font-black text-on-surface"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={start}
            className="rounded-full bg-primary-fixed-dim px-6 py-3 text-sm font-black text-on-primary-fixed shadow-[0_12px_28px_rgba(244,121,13,0.22)]"
          >
            Start with Preppie
          </button>
        </footer>
      </section>
    </>
  );
}
