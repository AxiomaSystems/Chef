import type { Cart, CheckoutProfile, ShoppingCart } from "@cart/shared";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { fetchAuthedResource } from "@/lib/api";
import { CheckoutClient } from "./checkout-client";

export default async function ShoppingCartCheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const shoppingCartResult = await fetchAuthedResource<ShoppingCart>(
    `/shopping-carts/${id}`,
  );

  if (!shoppingCartResult.data) {
    redirect("/shopping");
  }

  const [cartResult, checkoutProfileResult] = await Promise.all([
    fetchAuthedResource<Cart>(`/carts/${shoppingCartResult.data.cart_id}`),
    fetchAuthedResource<CheckoutProfile>("/me/checkout-profile"),
  ]);

  const cartName = cartResult.data?.name?.trim() || "Shopping Cart Checkout";
  const checkoutProfile = checkoutProfileResult.data ?? {
    saved_addresses: [],
    payment_cards: [],
  };

  return (
    <AppShell topBarTitle="Checkout" showBack>
      <CheckoutClient
        shoppingCart={shoppingCartResult.data}
        cartName={cartName}
        checkoutProfile={checkoutProfile}
      />
    </AppShell>
  );
}
