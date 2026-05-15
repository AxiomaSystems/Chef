"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { Capture } from "@cart/shared";
import { createCaptureAction } from "@/app/import/actions";

type CaptureMode = "url" | "text";

const THINKING_STEPS = [
  "Reading the source",
  "Finding ingredients",
  "Structuring the cooking steps",
  "Checking what needs review",
  "Preparing your draft",
];

const RESULT_LABELS: Record<string, string> = {
  exact_recipe_import: "Exact import",
  partial_recipe_import: "Partial import",
  reconstructed_recipe: "Reconstructed recipe",
  inspired_recipe: "Inspired recipe",
};

const CONFIDENCE_LABELS: Record<string, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
};

function isUsableCaptureDraft(capture: Capture) {
  const recipe = capture.recipe_preview;
  if (!recipe) return false;

  const hasIngredient = recipe.ingredients.some((ingredient) => {
    const name = (
      ingredient.display_ingredient ??
      ingredient.canonical_ingredient ??
      ""
    )
      .trim()
      .toLowerCase();
    return (
      name && !name.includes("unknown") && !name.includes("no extractable")
    );
  });
  const hasStep = recipe.steps.some((step) => {
    const text = step.what_to_do.trim().toLowerCase();
    return (
      text &&
      !text.includes("no usable") &&
      !text.includes("review the original") &&
      !text.includes("source text did not")
    );
  });
  const extractionFailed = capture.extraction_notes.some((note) =>
    /no recipe-specific|no usable|insufficient|unresolved placeholder/i.test(
      note,
    ),
  );

  return hasIngredient && hasStep && !extractionFailed;
}

export function RecipeCaptureModal({
  onClose,
  onReviewDraft,
  initialOpenMode = "url",
}: {
  onClose: () => void;
  onReviewDraft?: (capture: Capture) => void;
  initialOpenMode?: CaptureMode;
}) {
  const [mode, setMode] = useState<CaptureMode>(initialOpenMode);
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [capture, setCapture] = useState<Capture | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const [thinkingStep, setThinkingStep] = useState(0);
  const [isCapturing, startCapture] = useTransition();
  const captionInputRef = useRef<HTMLTextAreaElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);

  const recipe = capture?.recipe_preview;
  const canSubmit = mode === "url" ? !!url.trim() : !!text.trim();
  const shouldShowCoverImage =
    !!recipe?.cover_image_url && failedImageUrl !== recipe.cover_image_url;
  const sourceLabel =
    capture?.source_attribution.attribution_label ??
    capture?.source_attribution.site ??
    capture?.source_attribution.url ??
    "Chef Capture";

  useEffect(() => {
    if (!isCapturing) {
      return;
    }

    const timer = window.setInterval(() => {
      setThinkingStep((current) =>
        Math.min(current + 1, THINKING_STEPS.length - 1),
      );
    }, 850);

    return () => window.clearInterval(timer);
  }, [isCapturing]);

  function handleCapture() {
    if (!canSubmit || isCapturing) return;

    setError(undefined);
    setCapture(null);
    setFailedImageUrl(null);
    setThinkingStep(0);
    startCapture(async () => {
      const result = await createCaptureAction(
        mode === "url"
          ? {
              input_kind: "url",
              url: url.trim(),
              text: text.trim() || undefined,
            }
          : { input_kind: "text", text: text.trim() },
      );

      if (result.error || !result.capture) {
        setError(result.error ?? "Chef could not create that capture.");
        return;
      }

      if (onReviewDraft && isUsableCaptureDraft(result.capture)) {
        onReviewDraft(result.capture);
        return;
      }

      if (onReviewDraft) {
        setError(
          "Chef could not extract enough usable recipe details from that source. Paste the caption, transcript, or recipe text below and try again.",
        );
        setCapture(null);
        setFailedImageUrl(null);
        window.setTimeout(() => {
          if (mode === "url") {
            captionInputRef.current?.focus();
            return;
          }
          textInputRef.current?.focus();
        }, 0);
        return;
      }
      setFailedImageUrl(null);
      setCapture(result.capture);
    });
  }

  function handleReviewDraft() {
    if (!capture || !recipe) return;
    onReviewDraft?.(capture);
  }

  function resetDraft() {
    setCapture(null);
    setError(undefined);
    setFailedImageUrl(null);
  }

  return (
    <div className="fixed inset-0 z-[80] bg-[#fffaf0]">
      <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-[#fffaf0]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(255,185,98,0.28),transparent_32%),radial-gradient(circle_at_100%_12%,rgba(132,184,165,0.26),transparent_30%)]" />

        <div className="relative flex items-start justify-between gap-4 border-b border-[#eadfce] px-5 py-5 sm:px-7 lg:px-10">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-primary">
              Chef Capture
            </p>
            <h2 className="mt-1 text-2xl font-black leading-tight text-on-surface sm:text-3xl">
              Turn a food idea into a recipe
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-on-surface-variant">
              Paste a recipe link or raw text. If Chef finds enough detail, it
              will open an editable recipe form.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/70 text-on-surface-variant shadow-sm transition-colors hover:bg-white"
            aria-label="Close capture"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        <div className="relative min-h-0 flex-1 overflow-y-auto px-5 py-5 pb-28 sm:px-7 sm:py-6 lg:px-10">
          {!capture || onReviewDraft ? (
            <div className="mx-auto max-w-xl">
              <section className="-mx-5 border-y border-[#ecdcc8] bg-white p-5 sm:mx-0 sm:rounded-[1.7rem] sm:border sm:p-5 sm:shadow-sm">
                <div className="grid grid-cols-2 rounded-2xl bg-[#f7f0e7] p-1">
                  {(["url", "text"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setMode(option);
                        setError(undefined);
                      }}
                      className={`rounded-xl px-3 py-2 text-sm font-bold transition-all ${
                        mode === option
                          ? "bg-white text-on-surface shadow-sm"
                          : "text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      {option === "url" ? "Paste link" : "Paste text"}
                    </button>
                  ))}
                </div>

                {mode === "url" ? (
                  <div className="mt-5 space-y-4">
                    <div className="space-y-2">
                      <label
                        htmlFor="capture-url"
                        className="text-xs font-black uppercase tracking-[0.16em] text-on-surface-variant"
                      >
                        Recipe or social link
                      </label>
                      <input
                        id="capture-url"
                        type="url"
                        value={url}
                        onChange={(event) => setUrl(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !text.trim()) {
                            event.preventDefault();
                            handleCapture();
                          }
                        }}
                        placeholder="https://instagram.com/reel/..."
                        className="w-full rounded-2xl border border-outline-variant/60 bg-white px-4 py-3 text-base outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="capture-caption"
                        className="text-xs font-black uppercase tracking-[0.16em] text-on-surface-variant"
                      >
                        Caption or transcript{" "}
                        <span className="font-bold normal-case tracking-normal text-outline">
                          optional
                        </span>
                      </label>
                      <textarea
                        id="capture-caption"
                        ref={captionInputRef}
                        value={text}
                        onChange={(event) => setText(event.target.value)}
                        rows={5}
                        placeholder="If Instagram blocks the caption, paste the visible post text here. Chef will keep the original link as the source."
                        className="w-full resize-none rounded-2xl border border-outline-variant/60 bg-white px-4 py-3 text-base outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                      />
                      <p className="text-xs text-outline">
                        Instagram often blocks server-side caption reads.
                        Pasting the visible caption keeps source attribution
                        while making the import reliable.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 space-y-2">
                    <label
                      htmlFor="capture-text"
                      className="text-xs font-black uppercase tracking-[0.16em] text-on-surface-variant"
                    >
                      Recipe text, caption, or notes
                    </label>
                    <textarea
                      id="capture-text"
                      ref={textInputRef}
                      value={text}
                      onChange={(event) => setText(event.target.value)}
                      rows={8}
                      placeholder="Paste a caption, transcript, cookbook note, or recipe text..."
                      className="w-full resize-none rounded-2xl border border-outline-variant/60 bg-white px-4 py-3 text-base outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />
                  </div>
                )}

                {isCapturing && (
                  <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined animate-spin text-primary">
                        progress_activity
                      </span>
                      <div>
                        <p className="text-sm font-bold text-on-surface">
                          {THINKING_STEPS[thinkingStep]}
                        </p>
                        <p className="text-xs text-on-surface-variant">
                          Chef is turning the source into a draft you can
                          review.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <p className="mt-4 rounded-2xl border border-error/20 bg-error-container/30 px-4 py-3 text-sm text-error">
                    {error}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleCapture}
                  disabled={!canSubmit || isCapturing}
                  className="mt-5 w-full rounded-2xl bg-primary px-5 py-3.5 text-base font-black text-on-primary shadow-[0_14px_34px_rgba(255,112,0,0.24)] transition hover:translate-y-[-1px] disabled:translate-y-0 disabled:opacity-50"
                >
                  {isCapturing ? "Capturing..." : "Capture with Chef"}
                </button>
              </section>
            </div>
          ) : recipe ? (
            <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
              <section className="rounded-[1.7rem] border border-[#ecdcc8] bg-white p-5 shadow-sm">
                <div className="rounded-2xl border border-error/20 bg-error-container/30 p-4 text-sm text-error">
                  Chef could not turn this source into a usable recipe draft.
                  Start over with a clearer link, caption, transcript, or recipe
                  text.
                </div>
                {shouldShowCoverImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={recipe.cover_image_url}
                    alt=""
                    onError={() =>
                      setFailedImageUrl(recipe.cover_image_url ?? null)
                    }
                    className="mb-5 h-48 w-full rounded-[1.25rem] object-cover"
                  />
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-[#f7ead7] px-3 py-1 text-xs font-bold text-primary">
                    {RESULT_LABELS[capture.result_kind] ?? "Capture draft"}
                  </span>
                  <span className="rounded-full bg-[#f7ead7] px-3 py-1 text-xs font-bold text-primary">
                    {CONFIDENCE_LABELS[capture.confidence] ??
                      `${capture.confidence} confidence`}
                  </span>
                  <span className="rounded-full bg-[#f7ead7] px-3 py-1 text-xs font-bold text-primary">
                    {capture.status === "needs_more_info"
                      ? "Needs details"
                      : "Ready to review"}
                  </span>
                </div>
                <h3 className="mt-4 text-3xl font-black leading-tight text-on-surface">
                  {recipe.name}
                </h3>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                  {recipe.description}
                </p>

                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-[#f7f0e7] p-3">
                    <p className="text-xs text-outline">Source</p>
                    <p className="mt-1 font-bold text-on-surface">
                      {sourceLabel}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#f7f0e7] p-3">
                    <p className="text-xs text-outline">Servings</p>
                    <p className="mt-1 font-bold text-on-surface">
                      {recipe.servings}
                    </p>
                  </div>
                </div>

                {(capture.missing_info.length > 0 ||
                  capture.assumptions.length > 0) && (
                  <div className="mt-5 space-y-3">
                    {capture.missing_info.length > 0 && (
                      <InfoList
                        title="Needs review"
                        items={capture.missing_info}
                        tone="warning"
                      />
                    )}
                    {capture.assumptions.length > 0 && (
                      <InfoList
                        title="Chef assumed"
                        items={capture.assumptions}
                      />
                    )}
                    {process.env.NODE_ENV !== "production" &&
                      capture.extraction_notes.length > 0 && (
                        <InfoList
                          title="Dev extraction notes"
                          items={capture.extraction_notes}
                        />
                      )}
                  </div>
                )}
              </section>

              <section className="grid gap-5">
                <div className="rounded-[1.7rem] border border-[#ecdcc8] bg-white p-5 shadow-sm">
                  <h4 className="text-lg font-black text-on-surface">
                    Ingredients
                  </h4>
                  <ul className="mt-4 space-y-2">
                    {recipe.ingredients.map((ingredient, index) => (
                      <li
                        key={`${ingredient.canonical_ingredient}-${index}`}
                        className="flex gap-3 text-sm text-on-surface-variant"
                      >
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        <span>
                          <strong className="text-on-surface">
                            {ingredient.amount} {ingredient.unit}
                          </strong>{" "}
                          {ingredient.display_ingredient ??
                            ingredient.canonical_ingredient}
                          {ingredient.preparation
                            ? `, ${ingredient.preparation}`
                            : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-[1.7rem] border border-[#ecdcc8] bg-white p-5 shadow-sm">
                  <h4 className="text-lg font-black text-on-surface">Steps</h4>
                  <ol className="mt-4 space-y-3">
                    {recipe.steps.map((step) => (
                      <li key={step.step} className="flex gap-3 text-sm">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-black text-on-primary">
                          {step.step}
                        </span>
                        <p className="pt-1 text-on-surface-variant">
                          {step.what_to_do}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>
              </section>
            </div>
          ) : (
            <div className="rounded-[1.7rem] border border-error/20 bg-error-container/30 p-5 text-error">
              Chef created a capture, but it did not include a recipe draft.
            </div>
          )}
        </div>

        {capture && recipe && (
          <div className="relative flex flex-col gap-3 border-t border-[#eadfce] bg-[#fffaf0]/95 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <button
              type="button"
              onClick={resetDraft}
              className="rounded-full px-5 py-3 text-sm font-bold text-on-surface-variant transition-colors hover:bg-white"
            >
              Start over
            </button>
            <button
              type="button"
              onClick={handleReviewDraft}
              className="rounded-full bg-primary px-7 py-3 text-sm font-black text-on-primary shadow-[0_14px_34px_rgba(255,112,0,0.24)] transition hover:translate-y-[-1px] disabled:translate-y-0 disabled:opacity-50"
            >
              Review & edit
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoList({
  title,
  items,
  tone = "neutral",
}: {
  title: string;
  items: string[];
  tone?: "neutral" | "warning";
}) {
  return (
    <div
      className={`rounded-2xl p-4 ${
        tone === "warning"
          ? "border border-primary/20 bg-primary/5"
          : "bg-[#f7f0e7]"
      }`}
    >
      <p className="text-xs font-black uppercase tracking-[0.16em] text-on-surface-variant">
        {title}
      </p>
      <ul className="mt-2 space-y-1">
        {items.map((item, index) => (
          <li
            key={`${item}-${index}`}
            className="text-xs text-on-surface-variant"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
