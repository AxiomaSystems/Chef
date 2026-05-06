import { fetchCollection } from "@/lib/api";
import type { Cuisine } from "@cart/shared";
import { ImportClient } from "./import-client";

export default async function ImportPage() {
  const cuisinesResult = await fetchCollection<Cuisine>("/cuisines");

  return <ImportClient cuisines={cuisinesResult.data} />;
}
