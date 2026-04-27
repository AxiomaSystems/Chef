import type { CheckoutProfile } from "@cart/shared";
import { fetchAuthedResource } from "@/lib/api";
import { CheckoutProfileSettings } from "@/components/account/payment-section";

export default async function AccountPaymentPage() {
  const checkoutProfileResult =
    await fetchAuthedResource<CheckoutProfile>("/me/checkout-profile");
  const checkoutProfile = checkoutProfileResult.data ?? {
    saved_addresses: [],
    payment_cards: [],
  };

  return (
    <CheckoutProfileSettings initialProfile={checkoutProfile} />
  );
}
