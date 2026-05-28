import {
  fetchAuthedCollection,
  fetchAuthedResource,
  fetchCollection,
} from "@/lib/api";
import type {
  Cuisine,
  KitchenInventoryItem,
  Tag,
  UserPreferences,
} from "@cart/shared";
import { OnboardingClient } from "./onboarding-client";

export default async function OnboardingPage() {
  const [cuisinesResult, tagsResult, preferencesResult, inventoryResult] =
    await Promise.all([
      fetchCollection<Cuisine>("/cuisines"),
      fetchAuthedCollection<Tag>("/tags"),
      fetchAuthedResource<UserPreferences>("/me/preferences"),
      fetchAuthedCollection<KitchenInventoryItem>("/me/kitchen-inventory"),
    ]);

  const dietaryTags = tagsResult.data.filter(
    (t) => t.kind === "dietary_badge" && t.scope === "system",
  );

  return (
    <OnboardingClient
      cuisines={cuisinesResult.data}
      dietaryTags={dietaryTags}
      existingPreferences={preferencesResult.data}
      existingInventory={inventoryResult.data}
    />
  );
}
