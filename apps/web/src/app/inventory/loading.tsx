import { LoadingState } from "@/components/ui/loading-state";

export default function InventoryLoading() {
  return (
    <LoadingState
      topBarTitle="Inventory"
      title="Loading your kitchen inventory"
      detail="Checking saved pantry items and restock suggestions."
      steps={[
        "Loading kitchen items",
        "Grouping pantry categories",
        "Preparing restock actions",
      ]}
    />
  );
}
