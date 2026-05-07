import { AppShell } from "@/components/layout/app-shell";

type LoadingStateProps = {
  title: string;
  detail: string;
  steps?: string[];
  topBarTitle?: string;
  shell?: boolean;
};

function SkeletonBlock({ className }: { className: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-surface-container-low ${className}`}
    >
      <div className="loading-sweep absolute inset-y-0 left-0 w-1/2 bg-white/70" />
    </div>
  );
}

function PageHeaderSkeleton() {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-3">
        <SkeletonBlock className="h-4 w-24" />
        <SkeletonBlock className="h-9 w-64 max-w-[70vw]" />
        <SkeletonBlock className="h-4 w-80 max-w-[82vw]" />
      </div>
      <SkeletonBlock className="h-11 w-36" />
    </div>
  );
}

function RecipeShelfSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex w-full max-w-md rounded-full bg-surface-container-low p-1">
        {Array.from({ length: 3 }).map((_, index) => (
          <SkeletonBlock key={index} className="mx-1 h-9 flex-1 rounded-full" />
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 9 }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-xl border border-outline-variant/35 bg-white"
          >
            <SkeletonBlock className="h-40 w-full rounded-none" />
            <div className="space-y-3 p-4">
              <SkeletonBlock className="h-5 w-4/5" />
              <SkeletonBlock className="h-4 w-full" />
              <SkeletonBlock className="h-4 w-2/3" />
              <div className="flex gap-2 pt-2">
                <SkeletonBlock className="h-7 w-20 rounded-full" />
                <SkeletonBlock className="h-7 w-24 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MealPlanSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <SkeletonBlock className="h-8 w-56" />
          <SkeletonBlock className="h-9 w-44 rounded-full" />
        </div>
        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-9 w-28 rounded-full" />
          <SkeletonBlock className="h-9 w-9 rounded-full" />
          <SkeletonBlock className="h-9 w-20 rounded-full" />
          <SkeletonBlock className="h-9 w-9 rounded-full" />
        </div>
      </div>

      <section className="overflow-hidden rounded-[28px] border border-outline-variant/25 bg-white shadow-sm">
        <div className="grid min-w-[640px] grid-cols-[80px_repeat(7,1fr)] border-b border-outline-variant/20 bg-surface-container-low/40">
          <div />
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="space-y-2 px-3 py-4">
              <SkeletonBlock className="mx-auto h-3 w-8" />
              <SkeletonBlock className="mx-auto h-6 w-6 rounded-full" />
            </div>
          ))}
        </div>

        {Array.from({ length: 3 }).map((_, mealIndex) => (
          <div
            key={mealIndex}
            className="grid min-w-[640px] grid-cols-[80px_repeat(7,1fr)] border-b border-outline-variant/15 last:border-b-0"
          >
            <div className="flex flex-col items-center justify-center gap-2 border-r border-outline-variant/15 bg-surface-container-low/20 py-4">
              <SkeletonBlock className="h-6 w-6 rounded-full" />
              <SkeletonBlock className="h-3 w-12" />
            </div>
            {Array.from({ length: 7 }).map((_, dayIndex) => (
              <div
                key={dayIndex}
                className="border-r border-outline-variant/10 p-1.5 last:border-r-0"
              >
                <SkeletonBlock className="h-24 w-full rounded-2xl" />
              </div>
            ))}
          </div>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <SkeletonBlock className="h-48 rounded-[24px]" />
        <SkeletonBlock className="h-48 rounded-[24px]" />
        <SkeletonBlock className="h-48 rounded-[24px]" />
      </div>
    </div>
  );
}

function InventorySkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        <SkeletonBlock className="h-11 w-48" />
        <SkeletonBlock className="h-11 w-36" />
        <SkeletonBlock className="h-11 w-36" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 12 }).map((_, index) => (
          <div
            key={index}
            className="rounded-xl border border-outline-variant/35 bg-white p-4"
          >
            <div className="mb-4 flex items-center gap-3">
              <SkeletonBlock className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <SkeletonBlock className="h-4 w-4/5" />
                <SkeletonBlock className="h-3 w-1/2" />
              </div>
            </div>
            <SkeletonBlock className="h-8 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <PageHeaderSkeleton />
      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="space-y-2 rounded-xl border border-outline-variant/35 bg-white p-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-11 w-full" />
          ))}
        </aside>
        <section className="space-y-4 rounded-xl border border-outline-variant/35 bg-white p-5">
          <SkeletonBlock className="h-7 w-44" />
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <SkeletonBlock className="h-4 w-24" />
                <SkeletonBlock className="h-12 w-full" />
              </div>
            ))}
          </div>
          <SkeletonBlock className="h-11 w-32" />
        </section>
      </div>
    </div>
  );
}

function DefaultSkeleton({ steps = [] }: LoadingStateProps) {
  const rowCount = Math.max(3, steps.length);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeaderSkeleton />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <section className="space-y-4">
          <SkeletonBlock className="h-52 w-full sm:h-64" />

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="rounded-xl border border-outline-variant/35 bg-white p-4"
              >
                <SkeletonBlock className="mb-4 h-28 w-full" />
                <SkeletonBlock className="mb-2 h-5 w-3/4" />
                <SkeletonBlock className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </section>

        <aside className="space-y-4 rounded-xl border border-outline-variant/35 bg-white p-4">
          <div className="flex items-center justify-between gap-4">
            <SkeletonBlock className="h-6 w-32" />
            <SkeletonBlock className="h-9 w-9 rounded-full" />
          </div>

          <div className="space-y-3">
            {Array.from({ length: rowCount }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-3 rounded-xl bg-surface-container-lowest p-3"
              >
                <SkeletonBlock className="h-10 w-10 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <SkeletonBlock className="h-4 w-full" />
                  <SkeletonBlock className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function LoadingPanel(props: LoadingStateProps) {
  const key = `${props.topBarTitle ?? ""} ${props.title}`.toLowerCase();

  if (key.includes("account")) {
    return <SettingsSkeleton />;
  }

  if (
    !key.includes("meal plan") &&
    !key.includes("recipe") &&
    !key.includes("inventory")
  ) {
    return <DefaultSkeleton {...props} />;
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeaderSkeleton />
      {key.includes("meal plan") ? (
        <MealPlanSkeleton />
      ) : key.includes("recipe") ? (
        <RecipeShelfSkeleton />
      ) : (
        <InventorySkeleton />
      )}
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
