import { AppShell } from "@/components/layout/app-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function InventoryLoading() {
  return (
    <AppShell topBarTitle="Inventory">
      <div className="px-4 py-6 max-w-6xl mx-auto space-y-6">
        {/* Hero + running low */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <Skeleton className="lg:col-span-7 h-44 rounded-3xl" />
          <Skeleton className="lg:col-span-5 h-44 rounded-3xl" />
        </div>

        {/* Tabs */}
        <div className="flex gap-6">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
        </div>

        {/* Filter chips */}
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" />
          ))}
        </div>

        {/* Item groups */}
        {Array.from({ length: 3 }).map((_, g) => (
          <div key={g} className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <div className="rounded-2xl overflow-hidden border border-outline-variant/30 divide-y divide-outline-variant/20">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 bg-white">
                  <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
