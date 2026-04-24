import { AppShell } from "@/components/layout/app-shell";
import { Skeleton } from "@/components/ui/skeleton";

const DAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const MEAL_ROWS = 3;

export default function MealPlanLoading() {
  return (
    <AppShell>
      <div className="px-6 py-8 max-w-6xl mx-auto space-y-6">
        {/* Header row: title + week nav */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>

        {/* 7-day grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* Day headers */}
          {DAY_LABELS.map((day) => (
            <div key={day} className="space-y-1 text-center">
              <Skeleton className="h-4 w-10 mx-auto rounded-full" />
              <Skeleton className="h-3 w-6 mx-auto rounded-full" />
            </div>
          ))}

          {/* Meal cells: 3 rows × 7 days */}
          {Array.from({ length: MEAL_ROWS }).map((_, row) =>
            Array.from({ length: 7 }).map((_, col) => (
              <Skeleton key={`${row}-${col}`} className="rounded-2xl h-24" />
            ))
          )}
        </div>

        {/* Nutrition summary bar */}
        <div className="flex gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 flex-1 rounded-2xl" />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
