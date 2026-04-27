import { AppShell } from "@/components/layout/app-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <AppShell>
      <div className="px-6 py-8 max-w-6xl mx-auto space-y-10">
        {/* Greeting */}
        <section className="space-y-2">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-5 w-72" />
        </section>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <section className="md:col-span-8">
            <Skeleton className="rounded-4xl min-h-105" />
          </section>
          <section className="md:col-span-4 flex flex-col gap-4">
            <Skeleton className="rounded-3xl h-52" />
            <Skeleton className="rounded-3xl h-52" />
          </section>
        </div>

        {/* Quick recipes */}
        <div className="space-y-4">
          <Skeleton className="h-7 w-36" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="rounded-3xl h-44" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
