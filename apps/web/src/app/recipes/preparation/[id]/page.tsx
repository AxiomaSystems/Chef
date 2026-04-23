import type { BaseRecipe } from "@cart/shared";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { fetchAuthedResource } from "@/lib/api";
import { RecipePreparationClient } from "./preparation-client";

export default async function RecipePreparationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recipeResult = await fetchAuthedResource<BaseRecipe>(`/recipes/${id}`);

  if (!recipeResult.data) {
    redirect("/recipes");
  }

  return (
    <AppShell topBarTitle="Preparation" showBack>
      <RecipePreparationClient recipe={recipeResult.data} />
    </AppShell>
  );
}
