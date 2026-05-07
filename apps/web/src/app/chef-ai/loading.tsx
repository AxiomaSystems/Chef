import { LoadingState } from "@/components/ui/loading-state";

export default function ChefAiLoading() {
  return (
    <LoadingState
      topBarTitle="Butter Me AI"
      title="Starting Butter Me AI"
      detail="Loading your recipes and preparing the cooking assistant."
      steps={[
        "Checking recipe context",
        "Preparing chat tools",
        "Opening assistant workspace",
      ]}
    />
  );
}
