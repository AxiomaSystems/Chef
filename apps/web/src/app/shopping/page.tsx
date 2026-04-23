import { fetchAuthedCollection } from "@/lib/api";
import type { ShoppingCart, Cart } from "@cart/shared";
import { ShoppingClient } from "./shopping-client";

export default async function ShoppingPage() {
  const [shoppingCartsResult, cartsResult] = await Promise.all([
    fetchAuthedCollection<ShoppingCart>("/shopping-carts"),
    fetchAuthedCollection<Cart>("/carts"),
  ]);

  const cartNames: Record<string, string> = {};
  for (const cart of cartsResult.data) {
    if (cart.id && cart.name) {
      cartNames[cart.id] = cart.name;
    }
  }

  return (
    <ShoppingClient
      shoppingCarts={shoppingCartsResult.data}
      cartNames={cartNames}
    />
  );
}
