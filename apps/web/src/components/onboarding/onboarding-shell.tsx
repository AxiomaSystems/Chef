"use client";

import type { ReactNode } from "react";

const STEP_META = [
  { label: "Who", icon: "groups" },
  { label: "Cuisines", icon: "restaurant" },
  { label: "Favorites", icon: "favorite" },
  { label: "Avoids", icon: "block" },
  { label: "Kitchen", icon: "kitchen" },
  { label: "Inventory", icon: "inventory_2" },
  { label: "Goals", icon: "flag" },
  { label: "Shopping", icon: "shopping_cart" },
  { label: "Discovery", icon: "auto_stories" },
  { label: "Location", icon: "location_on" },
] as const;

type Props = {
  currentStep: number;
  title: string;
  subtitle: string;
  memoryItems: string[];
  onBack: (() => void) | null;
  onSkip: () => void;
  onNext: () => void;
  nextLabel: string;
  isPending: boolean;
  error: string | null;
  layout?: "card" | "workspace";
  children: ReactNode;
};

export function OnboardingShell({
  currentStep,
  title,
  subtitle,
  memoryItems,
  onBack,
  onSkip,
  onNext,
  nextLabel,
  isPending,
  error,
  layout = "card",
  children,
}: Props) {
  const total = STEP_META.length;
  const progress = (currentStep / total) * 100;
  const activeStep = STEP_META[currentStep - 1]!;

  if (layout === "workspace") {
    return (
      <main className="min-h-screen bg-[#fff8ef]">
        <header className="sticky top-0 z-50 border-b border-[#c0dedf]/60 bg-[#fff8ef]/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f4790d] text-white">
                  <span className="material-symbols-outlined text-[18px]">
                    {activeStep.icon}
                  </span>
                </span>
                <p className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f4790d]">
                  {activeStep.label} setup
                </p>
              </div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#c0dedf]">
                <div
                  className="h-full rounded-full bg-[#f4790d] transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <p className="hidden shrink-0 text-[11px] text-[#5f8689] sm:block">
              Step {currentStep} of {total}
            </p>
          </div>
        </header>

        <section className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
          <div className="rounded-2xl border border-[#c0dedf] bg-white/90 p-4 shadow-[0_18px_55px_-42px_rgba(53,24,0,0.8)] backdrop-blur sm:flex sm:items-start sm:justify-between sm:gap-6">
            <div className="min-w-0">
              <h2 className="text-headline-sm font-extrabold text-[#132326]">
                {title}
              </h2>
              {subtitle ? (
                <p className="mt-1 max-w-3xl text-body-sm text-[#315f62]">
                  {subtitle}
                </p>
              ) : null}
            </div>
            <p className="mt-3 text-body-sm text-[#5f8689] sm:mt-1 sm:max-w-xs sm:text-right">
              Add what you know now. You can keep this rough and update it later
              from Inventory.
            </p>
          </div>
        </section>

        <section className="onboarding-step-panel px-4 py-4 sm:px-6">
          {children}
        </section>

        {error ? (
          <p className="fixed bottom-24 left-4 right-4 z-[65] mx-auto max-w-xl rounded-2xl border border-[#ba1a1a]/20 bg-[#fff8ef] px-4 py-3 text-body-sm text-[#ba1a1a] shadow-xl">
            {error}
          </p>
        ) : null}

        <nav className="fixed inset-x-0 bottom-0 z-[60] border-t border-[#c0dedf]/70 bg-white/95 px-4 py-3 shadow-[0_-18px_45px_-28px_rgba(53,24,0,0.75)] backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                disabled={isPending}
                className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-label-md text-[#315f62] transition-all hover:bg-[#fff2e3] hover:text-[#132326] active:scale-[0.98] disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">
                  arrow_back
                </span>
                Back
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onSkip}
                disabled={isPending}
                className="hidden min-h-11 rounded-full px-3 text-label-md text-[#5f8689] transition-all hover:bg-[#fff2e3] hover:text-[#315f62] active:scale-[0.98] disabled:opacity-50 sm:inline-flex sm:items-center"
              >
                Not sure yet
              </button>
              <button
                type="button"
                onClick={onNext}
                disabled={isPending}
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#f4790d] px-5 text-label-lg text-white shadow-[0_14px_28px_-16px_rgba(60,154,158,0.8)] transition-all hover:-translate-y-0.5 hover:bg-[#351800] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:px-6"
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
                    {nextLabel === "Finish" || nextLabel === "Save memory" ? (
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
        </nav>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen overflow-hidden bg-[#fff8ef] px-4 py-6 sm:px-6 lg:px-10">
      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-8 lg:grid-cols-[0.86fr_1.14fr]">
        <aside className="hidden lg:block">
          <div className="max-w-sm">
            <p className="text-[13px] font-black uppercase tracking-[0.22em] text-[#f4790d]">
              Butter Me
            </p>
            <h1 className="mt-4 text-[48px] font-black leading-[0.98] text-[#132326]">
              Build your Butter Me memory.
            </h1>
            <p className="mt-5 max-w-xs text-body-md text-[#315f62]">
              Teach Chef how to plan meals, groceries, and cooking help around
              you.
            </p>

            <div className="mt-8 grid gap-2.5">
              {STEP_META.map((item, index) => {
                const stepNumber = index + 1;
                const isActive = stepNumber === currentStep;
                const isDone = stepNumber < currentStep;

                return (
                  <div
                    key={item.label}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all ${
                      isActive
                        ? "border-[#f4790d]/35 bg-white/[0.78] shadow-[0_14px_40px_-28px_rgba(53,24,0,0.65)]"
                        : isDone
                          ? "border-[#c0dedf] bg-[#fff8ef]/75"
                          : "border-transparent bg-white/[0.38]"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        isDone || isActive ? "bg-[#f4790d]" : "bg-[#c0dedf]"
                      }`}
                    >
                      <span
                        className={`material-symbols-outlined text-[18px] ${
                          isDone || isActive ? "text-white" : "text-[#5f8689]"
                        }`}
                      >
                        {isDone ? "check" : item.icon}
                      </span>
                    </span>
                    <span
                      className={`text-label-lg ${
                        isActive ? "text-[#132326]" : "text-[#315f62]"
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 overflow-hidden rounded-[1.6rem] border border-[#c0dedf] bg-white/70 p-4 shadow-[0_24px_70px_-48px_rgba(53,24,0,0.75)]">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#f4790d]">
                  Butter Me knows
                </p>
                <span className="material-symbols-outlined text-[18px] text-[#f4790d]">
                  auto_awesome
                </span>
              </div>
              {memoryItems.length > 0 ? (
                <ul className="mt-3 grid gap-2">
                  {memoryItems.slice(0, 5).map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-body-sm text-[#315f62]"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f4790d]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-body-sm text-[#5f8689]">
                  Your answers will appear here as Chef learns your defaults.
                </p>
              )}
            </div>
          </div>
        </aside>

        <div className="w-full">
          <div className="mb-6 text-center lg:hidden">
            <p className="font-black tracking-tight text-headline-sm text-[#f4790d]">
              Butter Me memory
            </p>
            <p className="mt-1 text-body-md text-[#315f62]">
              Teach Chef your defaults
            </p>
          </div>

          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f4790d]">
                <span className="material-symbols-outlined text-[18px] text-white">
                  {activeStep.icon}
                </span>
              </span>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f4790d]">
                {activeStep.label}
              </p>
            </div>
            <p className="text-[11px] text-[#5f8689]">
              Profile setup · about 5 min
            </p>
          </div>

          <div className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-[#c0dedf]">
            <div
              className="h-full rounded-full bg-[#f4790d] transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="rounded-[2rem] border border-white/80 bg-white/[0.86] p-5 shadow-[0_24px_80px_-45px_rgba(53,24,0,0.78)] backdrop-blur sm:p-8">
            <div className="onboarding-step-panel" key={currentStep}>
              <h2 className="text-headline-sm font-extrabold text-[#132326] sm:text-headline-md">
                {title}
              </h2>
              {subtitle ? (
                <p className="mt-2 max-w-xl text-body-sm text-[#315f62]">
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
                    className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-label-md text-[#315f62] transition-all hover:bg-[#fff2e3] hover:text-[#132326] active:scale-[0.98] disabled:opacity-50"
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
                  className="min-h-10 rounded-full px-3 text-label-md text-[#5f8689] transition-all hover:bg-[#fff2e3] hover:text-[#315f62] active:scale-[0.98] disabled:opacity-50"
                >
                  Not sure yet
                </button>
                <button
                  type="button"
                  onClick={onNext}
                  disabled={isPending}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#f4790d] px-5 text-label-lg text-white shadow-[0_14px_28px_-16px_rgba(60,154,158,0.8)] transition-all hover:-translate-y-0.5 hover:bg-[#351800] hover:shadow-[0_18px_34px_-18px_rgba(60,154,158,0.9)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:px-6"
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
                      {nextLabel === "Finish" || nextLabel === "Save memory" ? (
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

          <p className="mt-4 text-center text-body-sm text-[#5f8689]">
            You can update these any time in your account settings.
          </p>
        </div>
      </div>
    </main>
  );
}
