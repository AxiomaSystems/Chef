import type { Cuisine, Tag } from "@cart/shared";
import { fetchAuthedCollection, fetchCollection } from "@/lib/api";
import { NewRecipeClient } from "./new-recipe-client";

export default async function NewRecipePage({
  searchParams,
}: {
  searchParams?: Promise<{ draft?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const [cuisinesResult, tagsResult] = await Promise.all([
    fetchCollection<Cuisine>("/cuisines"),
    fetchAuthedCollection<Tag>("/tags"),
  ]);

  return (
    <NewRecipeClient
      cuisines={cuisinesResult.data}
      tags={tagsResult.data}
      loadImportedDraft={resolvedSearchParams?.draft === "import"}
    />
  );
}
