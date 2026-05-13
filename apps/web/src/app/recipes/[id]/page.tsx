import type { BaseRecipe } from "@cart/shared";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { fetchAuthedResource } from "@/lib/api";
import { RecipeDetailPageClient } from "./recipe-detail-page-client";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recipeResult = await fetchAuthedResource<BaseRecipe>(`/recipes/${id}`);

  if (!recipeResult.data) {
    redirect("/dashboard");
  }

  return (
    <AppShell showBack>
      <RecipeDetailPageClient recipe={recipeResult.data} />
    </AppShell>
  );
}
