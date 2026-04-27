import { Skeleton } from "@/components/ui/skeleton";

export default function DraftDetailLoading() {
  return (
    <main className="min-h-screen px-5 py-6 sm:px-8 lg:px-12">
      <div className="mx-auto grid max-w-6xl gap-6">
        {/* Header card */}
        <div className="rounded-[2rem] border border-outline-variant bg-white/58 px-6 py-6 shadow-sm sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="grid gap-3">
              <Skeleton className="h-3 w-32" />
              <div className="space-y-3">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-12 w-80" />
                <Skeleton className="h-4 w-96" />
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-outline-variant bg-surface p-4 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
        </div>

        {/* Recipe cards section */}
        <div className="rounded-[2rem] border border-outline-variant bg-white/60 p-6 shadow-sm space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-80" />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-[1.45rem] border border-outline-variant"
              >
                <Skeleton className="h-28 rounded-none" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-10 w-3/4" />
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
