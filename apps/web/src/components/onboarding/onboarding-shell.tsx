"use client";

import type { ReactNode } from "react";

const STEP_META = [
  { label: "Who", icon: "groups" },
  { label: "Cuisines", icon: "restaurant" },
  { label: "Favorites", icon: "favorite" },
  { label: "Avoids", icon: "block" },
  { label: "Kitchen", icon: "kitchen" },
  { label: "Goals", icon: "flag" },
  { label: "Shopping", icon: "shopping_cart" },
  { label: "Discovery", icon: "auto_stories" },
  { label: "Location", icon: "location_on" },
] as const;

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
  const total = STEP_META.length;
  const progress = (currentStep / total) * 100;
  const activeStep = STEP_META[currentStep - 1]!;

  return (
    <main className="relative flex min-h-screen overflow-hidden bg-[#fbf7f1] px-4 py-6 sm:px-6 lg:px-10">
      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-8 lg:grid-cols-[0.86fr_1.14fr]">
        <aside className="hidden lg:block">
          <div className="max-w-sm">
            <p className="text-[13px] font-black uppercase tracking-[0.22em] text-[#895032]">
              Chef
            </p>
            <h1 className="mt-4 text-[48px] font-black leading-[0.98] text-[#1a1c1a]">
              Build your cooking profile.
            </h1>
            <p className="mt-5 max-w-xs text-body-md text-[#52443d]">
              Set the defaults Chef should remember before it plans for you.
            </p>

            <div className="mt-8 grid gap-3">
              {STEP_META.map((item, index) => {
                const stepNumber = index + 1;
                const isActive = stepNumber === currentStep;
                const isDone = stepNumber < currentStep;

                return (
                  <div
                    key={item.label}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all ${
                      isActive
                        ? "border-[#895032]/35 bg-white/[0.78] shadow-[0_14px_40px_-28px_rgba(61,30,8,0.65)]"
                        : isDone
                          ? "border-[#d6e4c1] bg-[#f4f8ec]/75"
                          : "border-transparent bg-white/[0.38]"
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined grid rounded-full text-[16px] leading-none ${
                        isDone || isActive
                          ? "bg-[#895032] text-white"
                          : "bg-[#efe7df] text-[#85736c]"
                      }`}
                    >
                      {isDone ? "check" : item.icon}
                    </span>
                    <span
                      className={`text-label-lg ${
                        isActive ? "text-[#1a1c1a]" : "text-[#52443d]"
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        <div className="w-full">
          <div className="mb-6 text-center lg:hidden">
            <p className="font-black tracking-tight text-headline-sm text-[#895032]">
              Chef
            </p>
            <p className="mt-1 text-body-md text-[#52443d]">
              Let&apos;s set up your experience
            </p>
          </div>

          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined grid place-items-center rounded-full bg-[#895032] text-[18px] text-white">
                {activeStep.icon}
              </span>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#895032]">
                {activeStep.label}
              </p>
            </div>
            <p className="text-[11px] text-[#85736c]">
              Step {currentStep} of {total}
            </p>
          </div>

          <div className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-[#eee5dc]">
            <div
              className="h-full rounded-full bg-[#895032] transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="rounded-[2rem] border border-white/80 bg-white/[0.86] p-5 shadow-[0_24px_80px_-45px_rgba(61,30,8,0.78)] backdrop-blur sm:p-8">
            <div className="onboarding-step-panel" key={currentStep}>
              <h2 className="text-headline-sm font-extrabold text-[#1a1c1a] sm:text-headline-md">
                {title}
              </h2>
              {subtitle ? (
                <p className="mt-2 max-w-xl text-body-sm text-[#675a52]">
                  {subtitle}
                </p>
              ) : null}

              <div className="mt-7">{children}</div>
            </div>

            {error ? (
              <p className="mt-5 rounded-2xl border border-[#ba1a1a]/20 bg-[#ba1a1a]/10 px-4 py-3 text-body-sm text-[#ba1a1a]">
                {error}
              </p>
            ) : null}

            <div className="mt-8 flex items-center justify-between gap-3">
              <div>
                {onBack ? (
                  <button
                    type="button"
                    onClick={onBack}
                    disabled={isPending}
                    className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-label-md text-[#52443d] transition-all hover:bg-[#f4f3f1] hover:text-[#1a1c1a] active:scale-[0.98] disabled:opacity-50"
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

              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={onSkip}
                  disabled={isPending}
                  className="min-h-10 rounded-full px-3 text-label-md text-[#85736c] transition-all hover:bg-[#f4f3f1] hover:text-[#52443d] active:scale-[0.98] disabled:opacity-50"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={onNext}
                  disabled={isPending}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#895032] px-5 text-label-lg text-white shadow-[0_14px_28px_-16px_rgba(137,80,50,0.8)] transition-all hover:-translate-y-0.5 hover:bg-[#6e3d22] hover:shadow-[0_18px_34px_-18px_rgba(137,80,50,0.9)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:px-6"
                >
                  {isPending ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[18px]">
                        refresh
                      </span>
                      Saving...
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
      </div>
    </main>
  );
}
