import { fetchAuthedCollection } from "@/lib/api";
import type { BaseRecipe } from "@cart/shared";
import { ChefAIClient } from "./chef-ai-client";

export default async function ChefAIPage() {
  const recipesResult = await fetchAuthedCollection<BaseRecipe>("/recipes");
  return <ChefAIClient recipes={recipesResult.data} />;
}
