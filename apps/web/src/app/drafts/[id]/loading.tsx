import { LoadingState } from "@/components/ui/loading-state";

export default function DraftDetailLoading() {
  return (
    <LoadingState
      title="Loading draft"
      detail="Opening this draft and loading the recipes attached to it."
      steps={[
        "Loading draft selections",
        "Checking recipe details",
        "Preparing cart actions",
      ]}
      shell={false}
    />
  );
}
