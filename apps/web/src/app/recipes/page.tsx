import type { BaseRecipe, Cart, User } from "@cart/shared";
import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import type { DashboardCartDraft } from "@/components/dashboard/drafts-and-carts-section";
import { RecipeLibrary } from "@/components/recipes/recipe-library";
import {
  fetchAuthedCollection,
  fetchAuthedResource,
  fetchCollection,
} from "@/lib/api";

export default async function RecipesPage() {
  const [me, recipes, drafts, carts] = await Promise.all([
    fetchAuthedResource<User>("/me"),
    fetchCollection<BaseRecipe>("/recipes"),
    fetchAuthedCollection<DashboardCartDraft>("/cart-drafts"),
    fetchAuthedCollection<Cart>("/carts"),
  ]);

  if (!me.data) {
    redirect("/login");
  }

  if (!me.data.onboarding_completed_at) {
    redirect("/onboarding");
  }

  return (
    <main className="min-h-screen px-5 py-6 sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <DashboardHeader user={me.data} />
        <RecipeLibrary
          recipes={recipes.data.toSorted(
            (left, right) =>
              new Date(right.updated_at).getTime() -
              new Date(left.updated_at).getTime(),
          )}
          drafts={drafts.data}
          carts={carts.data}
        />
      </div>
    </main>
  );
}
