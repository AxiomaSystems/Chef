import { LoadingState } from "@/components/ui/loading-state";

export default function CartDetailLoading() {
  return (
    <LoadingState
      title="Loading cart details"
      detail="Fetching selected recipes, aggregated ingredients, and retailer context."
      steps={[
        "Loading cart",
        "Preparing ingredient review",
        "Preparing shopping list options",
      ]}
      shell={false}
    />
  );
}
