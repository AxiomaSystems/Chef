import { LoadingState } from "@/components/ui/loading-state";

export default function MealPlanLoading() {
  return (
    <LoadingState
      title="Loading your meal plan"
      detail="Opening the current week and checking planned recipes."
      steps={[
        "Loading week schedule",
        "Preparing meal slots",
        "Checking saved recipes",
      ]}
    />
  );
}
