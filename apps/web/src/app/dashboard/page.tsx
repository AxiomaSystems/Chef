import { fetchAuthedResource, fetchAuthedCollection } from "@/lib/api";
import type {
  User,
  Cart,
  BaseRecipe,
  HomeRecipeRecommendations,
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
    fetchAuthedCollection<BaseRecipe>("/recipes"),
    fetchAuthedCollection<Cart>("/carts"),
    fetchAuthedCollection<ShoppingCart>("/shopping-carts"),
  ]);

  return (
    <DashboardClient
      user={userResult.data}
      recommendations={recommendationsResult.data}
      recipes={recipesResult.data}
      carts={cartsResult.data}
      shoppingCarts={shoppingCartsResult.data}
    />
  );
}
