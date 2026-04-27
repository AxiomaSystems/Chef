import { fetchAuthedResource, fetchAuthedCollection } from "@/lib/api";
import type { User, Cart, BaseRecipe, ShoppingCart } from "@cart/shared";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const [userResult, recipesResult, cartsResult, shoppingCartsResult] = await Promise.all([
    fetchAuthedResource<User>("/me"),
    fetchAuthedCollection<BaseRecipe>("/recipes"),
    fetchAuthedCollection<Cart>("/carts"),
    fetchAuthedCollection<ShoppingCart>("/shopping-carts"),
  ]);

  return (
    <DashboardClient
      user={userResult.data}
      recipes={recipesResult.data}  
      carts={cartsResult.data}
      shoppingCarts={shoppingCartsResult.data}
    />
  );
}
