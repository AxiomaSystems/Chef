import { fetchAuthedResource, fetchAuthedCollection } from "@/lib/api";
import type {
  User,
  Cart,
  BaseRecipe,
  ShoppingCart,
  UserPreferences,
} from "@cart/shared";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const [
    userResult,
    preferencesResult,
    recipesResult,
    cartsResult,
    shoppingCartsResult,
  ] = await Promise.all([
    fetchAuthedResource<User>("/me"),
    fetchAuthedResource<UserPreferences>("/me/preferences"),
    fetchAuthedCollection<BaseRecipe>("/recipes"),
    fetchAuthedCollection<Cart>("/carts"),
    fetchAuthedCollection<ShoppingCart>("/shopping-carts"),
  ]);

  return (
    <DashboardClient
      user={userResult.data}
      preferences={preferencesResult.data}
      recipes={recipesResult.data}
      carts={cartsResult.data}
      shoppingCarts={shoppingCartsResult.data}
    />
  );
}
