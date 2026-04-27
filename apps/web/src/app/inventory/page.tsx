import { fetchAuthedCollection } from "@/lib/api";
import type { KitchenInventoryItem } from "@cart/shared";
import { InventoryClient } from "./inventory-client";

export default async function InventoryPage() {
  const result = await fetchAuthedCollection<KitchenInventoryItem>(
    "/me/kitchen-inventory",
  );
  return <InventoryClient realItems={result.data} />;
}
