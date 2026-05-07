import { LoadingState } from "@/components/ui/loading-state";

export default function ShoppingLoading() {
  return (
    <LoadingState
      topBarTitle="Shopping"
      title="Loading shopping carts"
      detail="Getting your generated carts and retailer handoff details."
      steps={[
        "Loading cart history",
        "Checking retailer data",
        "Preparing editable items",
      ]}
    />
  );
}
