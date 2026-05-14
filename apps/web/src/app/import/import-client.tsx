"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";

export function ImportClient() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/create?capture=1");
  }, [router]);

  return (
    <AppShell topBarTitle="Import Recipe">
      <main className="mx-auto flex min-h-[calc(100dvh-132px)] max-w-3xl flex-col justify-center px-5 pb-32 pt-8 sm:px-6 lg:min-h-[calc(100dvh-64px)] lg:pb-10">
        <div className="space-y-3">
          <p className="text-label-sm uppercase tracking-[0.18em] text-primary">
            Chef Capture
          </p>
          <h1 className="text-[2.4rem] font-black leading-[0.98] text-on-surface sm:text-headline-lg">
            Import is now a capture flow.
          </h1>
          <p className="max-w-xl text-body-md text-on-surface-variant">
            Chef keeps imported sources as reviewable drafts before saving them
            into your recipe library.
          </p>
        </div>
      </main>
    </AppShell>
  );
}
