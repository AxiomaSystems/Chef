import { fetchAuthedCollection, fetchAuthedResource } from "@/lib/api";
import type {
  User,
  Cart,
  HomeRecipeRecommendations,
  RecipeListPage,
  ShoppingCart,
} from "@cart/shared";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const [
    userResult,
    recommendationsResult,
    recipesResult,
    cartsResult,
    shoppingCartsResult,
  ] = await Promise.all([
    fetchAuthedResource<User>("/me"),
    fetchAuthedResource<HomeRecipeRecommendations>(
      "/recipes/recommendations/home",
    ),
    fetchAuthedResource<RecipeListPage>("/recipes?limit=12&owner=public"),
    fetchAuthedCollection<Cart>("/carts"),
    fetchAuthedCollection<ShoppingCart>("/shopping-carts"),
  ]);

  return (
    <DashboardClient
      user={userResult.data}
      recommendations={recommendationsResult.data}
      recipes={recipesResult.data?.items ?? []}
      carts={cartsResult.data}
      shoppingCarts={shoppingCartsResult.data}
    />
  );
}
