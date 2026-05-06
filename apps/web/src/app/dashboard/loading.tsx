import { LoadingState } from "@/components/ui/loading-state";

export default function DashboardLoading() {
  return (
    <LoadingState
      title="Preparing your dashboard"
      detail="Loading your recipes, carts, shopping history, and account context."
      steps={[
        "Checking your session",
        "Loading recent kitchen activity",
        "Preparing quick actions",
      ]}
    />
  );
}
