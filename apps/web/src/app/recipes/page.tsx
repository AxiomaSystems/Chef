import { fetchAuthedCollection, fetchCollection } from "@/lib/api";
import type { BaseRecipe, Cuisine, Tag } from "@cart/shared";
import { RecipesClient } from "./recipes-client";

export default async function RecipesPage({
  searchParams,
}: {
  searchParams?: Promise<{ import?: string; capture?: string; new?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const [cuisinesResult, tagsResult, recipesResult] = await Promise.all([
    fetchCollection<Cuisine>("/cuisines"),
    fetchAuthedCollection<Tag>("/tags"),
    fetchAuthedCollection<BaseRecipe>("/recipes"),
  ]);

  return (
    <RecipesClient
      cuisines={cuisinesResult.data}
      tags={tagsResult.data}
      recipes={recipesResult.data}
      openImportOnLoad={
        resolvedSearchParams?.import === "1" ||
        resolvedSearchParams?.capture === "1"
      }
    />
  );
}
