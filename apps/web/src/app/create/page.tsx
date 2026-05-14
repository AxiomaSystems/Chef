import { fetchAuthedCollection, fetchCollection } from "@/lib/api";
import type { Cuisine, Tag } from "@cart/shared";
import { CreateClient } from "./create-client";

export default async function CreatePage({
  searchParams,
}: {
  searchParams?: Promise<{ capture?: string; recipe?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const [cuisinesResult, tagsResult] = await Promise.all([
    fetchCollection<Cuisine>("/cuisines"),
    fetchAuthedCollection<Tag>("/tags"),
  ]);

  return (
    <CreateClient
      cuisines={cuisinesResult.data}
      tags={tagsResult.data}
      openCaptureOnLoad={resolvedSearchParams?.capture === "1"}
      openRecipeOnLoad={resolvedSearchParams?.recipe === "1"}
    />
  );
}
