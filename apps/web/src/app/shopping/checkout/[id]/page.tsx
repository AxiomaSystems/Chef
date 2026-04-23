import type { Cart, ShoppingCart, UserPreferences } from "@cart/shared";
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

  const [cartResult, preferencesResult] = await Promise.all([
    fetchAuthedResource<Cart>(`/carts/${shoppingCartResult.data.cart_id}`),
    fetchAuthedResource<UserPreferences>("/me/preferences"),
  ]);

  const cartName = cartResult.data?.name?.trim() || "Shopping Cart Checkout";

  const preferences =
    preferencesResult.data ?? {
      preferred_cuisine_ids: [],
      preferred_cuisines: [],
      preferred_tag_ids: [],
      preferred_tags: [],
    };

  return (
    <AppShell topBarTitle="Checkout" showBack>
      <CheckoutClient
        shoppingCart={shoppingCartResult.data}
        cartName={cartName}
        preferences={preferences}
      />
    </AppShell>
  );
}
