import { Skeleton } from "@/components/ui/skeleton";

export default function AccountSettingsLoading() {
  return (
    <div className="space-y-8 p-6">
      {/* Section title */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Form fields */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      ))}

      {/* Save button */}
      <Skeleton className="h-10 w-28 rounded-xl" />
    </div>
  );
}
