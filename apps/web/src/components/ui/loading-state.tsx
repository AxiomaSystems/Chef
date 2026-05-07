"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";

type LoadingStateProps = {
  title: string;
  detail: string;
  steps?: string[];
  topBarTitle?: string;
  shell?: boolean;
};

function LoadingPanel({ title, detail, steps = [] }: LoadingStateProps) {
  const visibleSteps = steps.length > 0 ? steps : ["Preparing your page"];
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setActiveStep((current) => (current + 1) % visibleSteps.length);
    }, 1200);

    return () => window.clearInterval(id);
  }, [visibleSteps.length]);

  return (
    <div className="mx-auto flex min-h-[55vh] w-full max-w-3xl items-center justify-center px-6 py-12">
      <section className="w-full rounded-2xl border border-outline-variant/40 bg-white px-6 py-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-surface text-primary">
            <span className="absolute inset-1 rounded-lg border-2 border-primary/20 border-t-primary animate-spin" />
            <span className="material-symbols-outlined text-[22px]">
              progress_activity
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-label-sm font-semibold uppercase tracking-widest text-primary">
              Loading
            </p>
            <h1 className="mt-1 text-headline-sm font-bold text-on-surface">
              {title}
            </h1>
            <p className="mt-1 text-body-sm leading-6 text-outline">{detail}</p>
            <p className="mt-3 min-h-5 text-label-md font-semibold text-primary">
              {visibleSteps[activeStep]}
            </p>
          </div>
        </div>

        <div className="mt-6 h-2 overflow-hidden rounded-full bg-surface-container-low">
          <div className="loading-sweep h-full w-1/2 rounded-full bg-primary" />
        </div>

        <div className="mt-5 grid gap-2">
          {visibleSteps.map((step, index) => (
            <div
              key={step}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-body-sm transition-all duration-300 ${
                index === activeStep
                  ? "bg-primary-surface text-primary"
                  : "bg-surface-container-low text-on-surface-variant"
              }`}
            >
              <span className="material-symbols-outlined text-[16px] text-primary">
                {index === activeStep
                  ? "radio_button_checked"
                  : "radio_button_unchecked"}
              </span>
              {step}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function LoadingState(props: LoadingStateProps) {
  if (props.shell === false) {
    return <LoadingPanel {...props} />;
  }

  return (
    <AppShell topBarTitle={props.topBarTitle}>
      <LoadingPanel {...props} />
    </AppShell>
  );
}
