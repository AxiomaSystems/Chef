import type {
  BaseRecipe,
  KitchenInventoryItem,
  UserProfileMemory,
} from "@cart/shared";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { fetchAuthedCollection, fetchAuthedResource } from "@/lib/api";
import { buildCookingContext } from "@/lib/cooking-context";
import { RecipeDetailPageClient } from "./recipe-detail-page-client";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [recipeResult, profileMemoryResult, inventoryResult] =
    await Promise.all([
      fetchAuthedResource<BaseRecipe>(`/recipes/${id}`),
      fetchAuthedResource<UserProfileMemory>("/me/profile-memory"),
      fetchAuthedCollection<KitchenInventoryItem>("/me/kitchen-inventory"),
    ]);

  if (!recipeResult.data) {
    redirect("/dashboard");
  }

  return (
    <AppShell showBack>
      <RecipeDetailPageClient
        recipe={recipeResult.data}
        inventory={inventoryResult.data}
        cookingContext={buildCookingContext(
          profileMemoryResult.data,
          inventoryResult.data,
        )}
      />
    </AppShell>
  );
}
