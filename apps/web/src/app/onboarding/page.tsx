import { fetchAuthedCollection, fetchAuthedResource, fetchCollection } from "@/lib/api";
import type { Cuisine, Tag, UserPreferences } from "@cart/shared";
import { OnboardingClient } from "./onboarding-client";

export default async function OnboardingPage() {
  const [cuisinesResult, tagsResult, preferencesResult] = await Promise.all([
    fetchCollection<Cuisine>("/cuisines"),
    fetchAuthedCollection<Tag>("/tags"),
    fetchAuthedResource<UserPreferences>("/me/preferences"),
  ]);

  const dietaryTags = tagsResult.data.filter(
    (t) => t.kind === "dietary_badge" && t.scope === "system",
  );

  return (
    <OnboardingClient
      cuisines={cuisinesResult.data}
      dietaryTags={dietaryTags}
      existingPreferences={preferencesResult.data}
    />
  );
}
