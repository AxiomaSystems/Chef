import { LoadingState } from "@/components/ui/loading-state";

export default function RecipesLoading() {
  return (
    <LoadingState
      topBarTitle="Recipes"
      title="Loading your recipe shelf"
      detail="Fetching saved recipes, public recipes, cuisines, and dietary tags."
      steps={[
        "Loading recipe collection",
        "Checking saved copies",
        "Preparing filters",
      ]}
    />
  );
}
