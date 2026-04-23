import { fetchAuthedCollection, fetchCollection } from "@/lib/api";
import type { BaseRecipe, Cuisine, Tag } from "@cart/shared";
import { RecipesClient } from "./recipes-client";

export default async function RecipesPage() {
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
    />
  );
}
