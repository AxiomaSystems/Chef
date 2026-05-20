import { LoadingState } from "@/components/ui/loading-state";

export default function ShoppingLoading() {
  return (
    <LoadingState
      topBarTitle="Shopping List"
      title="Loading shopping lists"
      detail="Getting your generated shopping lists and retailer handoff details."
      steps={[
        "Loading cart history",
        "Checking retailer data",
        "Preparing editable items",
      ]}
    />
  );
}
