import { LoadingState } from "@/components/ui/loading-state";

export default function ChefAiLoading() {
  return (
    <LoadingState
      topBarTitle="Preppie AI"
      title="Starting Preppie AI"
      detail="Loading your recipes and preparing the cooking assistant."
      steps={[
        "Checking recipe context",
        "Preparing chat tools",
        "Opening assistant workspace",
      ]}
    />
  );
}
