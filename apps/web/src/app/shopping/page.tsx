import { fetchAuthedCollection } from "@/lib/api";
import type {
  Cart,
  ShoppingCart,
  ShoppingCartHistorySummary,
} from "@cart/shared";
import { ShoppingClient } from "./shopping-client";

export default async function ShoppingPage() {
  const [shoppingCartsResult, historyResult, cartsResult] = await Promise.all([
    fetchAuthedCollection<ShoppingCart>("/shopping-carts"),
    fetchAuthedCollection<ShoppingCartHistorySummary>(
      "/shopping-carts/history",
    ),
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
      shoppingCartHistory={historyResult.data}
      cartNames={cartNames}
    />
  );
}
