import { fetchAuthedResource, fetchCollection } from "@/lib/api";
import type { Cuisine, RecipeListPage, Tag } from "@cart/shared";
import { RecipesClient } from "./recipes-client";

export default async function RecipesPage({
  searchParams,
}: {
  searchParams?: Promise<{ import?: string; capture?: string; new?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const [cuisinesResult, tagsResult, recipesResult] = await Promise.all([
    fetchCollection<Cuisine>("/cuisines"),
    fetchAuthedResource<Tag[]>("/tags"),
    fetchAuthedResource<RecipeListPage>("/recipes?limit=24&owner=public"),
  ]);

  return (
    <RecipesClient
      cuisines={cuisinesResult.data}
      tags={tagsResult.data ?? []}
      recipes={recipesResult.data?.items ?? []}
      nextCursor={recipesResult.data?.next_cursor}
      openImportOnLoad={
        resolvedSearchParams?.import === "1" ||
        resolvedSearchParams?.capture === "1"
      }
    />
  );
}
