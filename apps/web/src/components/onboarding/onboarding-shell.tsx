"use client";

import type { ReactNode } from "react";

const STEP_LABELS = [
  "Household",
  "Cuisine & Dietary",
  "Taste",
  "Kitchen",
  "Goals",
  "Shopping",
  "Discovery",
  "Location",
];

type Props = {
  currentStep: number;
  title: string;
  subtitle: string;
  onBack: (() => void) | null;
  onSkip: () => void;
  onNext: () => void;
  nextLabel: string;
  isPending: boolean;
  error: string | null;
  children: ReactNode;
};

export function OnboardingShell({
  currentStep,
  title,
  subtitle,
  onBack,
  onSkip,
  onNext,
  nextLabel,
  isPending,
  error,
  children,
}: Props) {
  const total = STEP_LABELS.length;
  const progress = ((currentStep) / total) * 100;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#faf9f6] p-6">
      <div className="w-full max-w-lg">
        {/* Brand */}
        <div className="mb-8 text-center">
          <p className="font-black tracking-tight text-headline-sm text-[#ffb38e]">
            Chef
          </p>
          <p className="mt-1 text-body-md text-[#52443d]">
            Let&apos;s set up your experience
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#895032]">
            {STEP_LABELS[currentStep - 1]}
          </p>
          <p className="text-[11px] text-[#85736c]">
            {currentStep} of {total}
          </p>
        </div>
        <div className="mb-8 h-1.5 w-full overflow-hidden rounded-full bg-[#e8ddd7]">
          <div
            className="h-full rounded-full bg-[#895032] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white p-8 shadow-[0_4px_20px_-4px_rgba(137,80,50,0.12)]">
          <h2 className="text-headline-sm font-bold text-[#1a1c1a]">{title}</h2>
          <p className="mt-1 text-body-sm text-[#85736c]">{subtitle}</p>

          <div className="mt-6">{children}</div>

          {error ? (
            <p className="mt-4 rounded-xl border border-[#ba1a1a]/20 bg-[#ba1a1a]/10 px-4 py-3 text-body-sm text-[#ba1a1a]">
              {error}
            </p>
          ) : null}

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between">
            <div>
              {onBack ? (
                <button
                  type="button"
                  onClick={onBack}
                  disabled={isPending}
                  className="flex items-center gap-1 text-label-md text-[#52443d] transition-all hover:text-[#1a1c1a] active:scale-[0.98] disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    arrow_back
                  </span>
                  Back
                </button>
              ) : (
                <div />
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onSkip}
                disabled={isPending}
                className="text-label-md text-[#85736c] transition-all hover:text-[#52443d] active:scale-[0.98] disabled:opacity-50"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={onNext}
                disabled={isPending}
                className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#895032] px-6 text-label-lg text-white transition-all hover:bg-[#6e3d22] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[18px]">
                      refresh
                    </span>
                    Saving…
                  </>
                ) : (
                  <>
                    {nextLabel}
                    {nextLabel === "Finish" ? (
                      <span className="material-symbols-outlined text-[18px]">
                        check
                      </span>
                    ) : (
                      <span className="material-symbols-outlined text-[18px]">
                        arrow_forward
                      </span>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-body-sm text-[#85736c]">
          You can update these any time in your account settings.
        </p>
      </div>
    </main>
  );
}
