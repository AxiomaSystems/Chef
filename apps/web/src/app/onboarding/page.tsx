import { fetchAuthedCollection, fetchCollection } from "@/lib/api";
import type { Cuisine, Tag } from "@cart/shared";
import { OnboardingClient } from "./onboarding-client";

export default async function OnboardingPage() {
  const [cuisinesResult, tagsResult] = await Promise.all([
    fetchCollection<Cuisine>("/cuisines"),
    fetchAuthedCollection<Tag>("/tags"),
  ]);

  const dietaryTags = tagsResult.data.filter(
    (t) => t.kind === "dietary_badge" && t.scope === "system",
  );

  return (
    <OnboardingClient
      cuisines={cuisinesResult.data}
      dietaryTags={dietaryTags}
    />
  );
}
