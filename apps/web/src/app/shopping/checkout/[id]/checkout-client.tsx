"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type {
  CheckoutProfile,
  MatchedIngredientProduct,
  ShoppingCart,
} from "@cart/shared";
import { Button } from "@/components/ui/button";

function fmt$(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function retailerLabel(retailer: string) {
  const map: Record<string, string> = {
    kroger: "Kroger",
    walmart: "Walmart",
    instacart: "Instacart",
  };
  return map[retailer] ?? retailer;
}

function buildInitialQuantities(items: MatchedIngredientProduct[]) {
  return items.map((item) => Math.max(1, item.selected_quantity ?? 1));
}

function getUnitPrice(item: MatchedIngredientProduct) {
  if (item.selected_product?.price !== undefined) {
    return item.selected_product.price;
  }

  if (item.estimated_line_total !== undefined) {
    return (
      item.estimated_line_total / Math.max(item.selected_quantity ?? 1, 1)
    );
  }

  return 0;
}

function subtotalForItems(
  items: MatchedIngredientProduct[],
  quantities: number[],
) {
  return Number(
    items
      .reduce((sum, item, index) => {
        const quantity = quantities[index] ?? 1;
        return sum + getUnitPrice(item) * quantity;
      }, 0)
      .toFixed(2),
  );
}

function lineTitle(item: MatchedIngredientProduct) {
  return (
    item.selected_product?.title ??
    item.manual_label ??
    item.canonical_ingredient
  );
}

function lineSubtitle(item: MatchedIngredientProduct) {
  if (item.selected_product?.brand && item.selected_product.quantity_text) {
    return `${item.selected_product.brand} - ${item.selected_product.quantity_text}`;
  }

  if (item.selected_product?.quantity_text) {
    return item.selected_product.quantity_text;
  }

  if (item.selected_product?.brand) {
    return item.selected_product.brand;
  }

  return `${item.needed_amount} ${item.needed_unit}`;
}

export function CheckoutClient({
  shoppingCart,
  cartName,
  checkoutProfile,
}: {
  shoppingCart: ShoppingCart;
  cartName: string;
  checkoutProfile: CheckoutProfile;
}) {
  const [quantities, setQuantities] = useState(() =>
    buildInitialQuantities(shoppingCart.matched_items),
  );
  const [placed, setPlaced] = useState(false);

  const addresses = checkoutProfile.saved_addresses;
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    () =>
      (addresses.find((address) => address.isDefault) ??
        addresses[0] ??
        null)?.id ?? null,
  );
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const selectedAddress =
    addresses.find((address) => address.id === selectedAddressId) ?? null;

  const cards = checkoutProfile.payment_cards;
  const [selectedCardId, setSelectedCardId] = useState<string | null>(
    () =>
      (cards.find((card) => card.isDefault) ?? cards[0] ?? null)?.id ?? null,
  );
  const [showCardPicker, setShowCardPicker] = useState(false);
  const selectedCard = cards.find((card) => card.id === selectedCardId) ?? null;

  const subtotal = useMemo(
    () => subtotalForItems(shoppingCart.matched_items, quantities),
    [shoppingCart.matched_items, quantities],
  );
  const deliveryFee = subtotal >= 35 ? 0 : 5.99;
  const estimatedTax = Number((subtotal * 0.0825).toFixed(2));
  const total = Number((subtotal + deliveryFee + estimatedTax).toFixed(2));
  const itemCount = quantities.reduce((sum, quantity) => sum + quantity, 0);

  function adjustQuantity(index: number, delta: number) {
    setQuantities((current) =>
      current.map((quantity, currentIndex) =>
        currentIndex === index ? Math.max(1, quantity + delta) : quantity,
      ),
    );
  }

  function completeCheckout() {
    setPlaced(true);
    if (shoppingCart.external_url) {
      window.open(shoppingCart.external_url, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="inline-flex w-fit items-center gap-2 rounded-full bg-secondary-container px-4 py-1.5 text-label-md text-on-secondary-container">
              <span className="material-symbols-outlined text-[16px]">
                shoppingmode
              </span>
              Checkout
            </p>
            <h1 className="mt-4 text-headline-lg text-on-surface">{cartName}</h1>
            <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
              Review your grocery list, make last-minute quantity changes, and
              finish your order with {retailerLabel(shoppingCart.retailer)}.
            </p>
          </div>
          <Link
            href="/shopping"
            className="inline-flex items-center gap-2 rounded-full border border-outline-variant bg-white px-4 py-2 text-label-md text-on-surface-variant transition-colors hover:bg-surface-container-low"
          >
            <span className="material-symbols-outlined text-[18px]">
              arrow_back
            </span>
            Back to carts
          </Link>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_380px]">
          <section className="space-y-6">
            <div className="rounded-[28px] border border-outline-variant/30 bg-white p-4 shadow-[0_10px_45px_-18px_rgba(137,80,50,0.18)] sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-headline-sm text-on-surface">
                    Your Grocery List
                  </p>
                  <p className="mt-1 text-body-sm text-outline">
                    Fresh from your saved shopping cart.
                  </p>
                </div>
                <span className="rounded-full bg-secondary-container px-3 py-1 text-label-md text-on-secondary-container">
                  {itemCount} items
                </span>
              </div>

              <div className="space-y-4">
                {shoppingCart.matched_items.map((item, index) => {
                  const product = item.selected_product;
                  const quantity = quantities[index];
                  const unitPrice = getUnitPrice(item);
                  const lineTotal = Number((unitPrice * quantity).toFixed(2));

                  return (
                    <div
                      key={`${item.canonical_ingredient}-${index}`}
                      className="flex flex-col gap-4 rounded-[24px] border border-outline-variant/20 bg-[#fffdfa] p-4 sm:flex-row sm:items-center"
                    >
                      <div className="flex items-center gap-4 sm:min-w-0 sm:flex-1">
                        <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-[20px] bg-primary-surface">
                          {product?.image_url ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={product.image_url}
                              alt={lineTitle(item)}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="material-symbols-outlined text-[28px] text-primary">
                              grocery
                            </span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="text-body-lg font-semibold text-on-surface">
                            {lineTitle(item)}
                          </p>
                          <p className="mt-1 text-body-sm text-outline">
                            {lineSubtitle(item)}
                          </p>
                          {item.kind === "manual_item" && (
                            <span className="mt-2 inline-flex rounded-full bg-tertiary-container/30 px-2.5 py-1 text-label-sm text-on-tertiary-container">
                              Manual item
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 sm:justify-end">
                        <div className="flex items-center gap-3 rounded-full border border-outline-variant/40 bg-white px-3 py-2">
                          <button
                            onClick={() => adjustQuantity(index, -1)}
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant/40 text-on-surface-variant transition-colors hover:bg-surface-container-low"
                            aria-label={`Decrease ${lineTitle(item)} quantity`}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              remove
                            </span>
                          </button>
                          <span className="w-4 text-center text-body-md text-on-surface">
                            {quantity}
                          </span>
                          <button
                            onClick={() => adjustQuantity(index, 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant/40 text-on-surface-variant transition-colors hover:bg-surface-container-low"
                            aria-label={`Increase ${lineTitle(item)} quantity`}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              add
                            </span>
                          </button>
                        </div>
                        <div className="min-w-20 text-right">
                          <p className="text-body-lg font-semibold text-primary">
                            {fmt$(lineTotal)}
                          </p>
                          {unitPrice > 0 ? (
                            <p className="text-label-md text-outline">
                              {fmt$(unitPrice)} each
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {[
                {
                  name: "Whole Foods",
                  price: subtotal + 5.54,
                  note: "Premium selection",
                  icon: "storefront",
                },
                {
                  name: retailerLabel(shoppingCart.retailer),
                  price: subtotal,
                  note: "Best value",
                  icon: "local_mall",
                  featured: true,
                },
                {
                  name: "Sprouts",
                  price: Math.max(subtotal - 1.27, 0),
                  note: "Organic focus",
                  icon: "eco",
                },
              ].map((store) => (
                <div
                  key={store.name}
                  className={`rounded-[24px] border p-5 shadow-sm ${
                    store.featured
                      ? "border-primary/60 bg-primary-surface"
                      : "border-outline-variant/25 bg-white"
                  }`}
                >
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
                    <span className="material-symbols-outlined text-[22px]">
                      {store.icon}
                    </span>
                  </div>
                  <p className="text-body-lg font-semibold text-on-surface">
                    {store.name}
                  </p>
                  <p className="mt-2 text-headline-sm text-primary">
                    {fmt$(store.price)}
                  </p>
                  <p className="mt-2 text-label-md uppercase tracking-[0.18em] text-outline">
                    {store.note}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <aside className="space-y-5">
            <div className="rounded-[28px] border border-outline-variant/25 bg-surface-container-low p-6 shadow-[0_12px_40px_-20px_rgba(137,80,50,0.18)]">
              <h2 className="text-headline-sm text-on-surface">Order Summary</h2>

              <div className="mt-6 space-y-3 border-b border-outline-variant/25 pb-5">
                <div className="flex items-center justify-between text-body-md text-on-surface-variant">
                  <span>Subtotal ({itemCount} items)</span>
                  <span>{fmt$(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-body-md text-on-surface-variant">
                  <span>Delivery Fee</span>
                  <span className={deliveryFee === 0 ? "text-primary" : ""}>
                    {deliveryFee === 0 ? "FREE" : fmt$(deliveryFee)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-body-md text-on-surface-variant">
                  <span>Estimated Tax</span>
                  <span>{fmt$(estimatedTax)}</span>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between">
                <span className="text-headline-sm text-on-surface">Total</span>
                <span className="text-headline-sm text-primary">
                  {fmt$(total)}
                </span>
              </div>

              <div className="mt-7 space-y-5">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-label-lg text-on-surface">
                      Delivery Address
                    </p>
                    {addresses.length > 0 && (
                      <button
                        onClick={() => setShowAddressPicker((value) => !value)}
                        className="text-label-md text-primary hover:underline"
                      >
                        {showAddressPicker ? "Cancel" : "Change"}
                      </button>
                    )}
                  </div>

                  {addresses.length === 0 ? (
                    <div className="flex items-center gap-3 rounded-[20px] bg-white p-4">
                      <span className="material-symbols-outlined text-outline-variant">
                        location_off
                      </span>
                      <div className="flex-1">
                        <p className="text-body-sm text-on-surface-variant">
                          No delivery address saved.
                        </p>
                      </div>
                      <Link
                        href="/account/settings/payment"
                        className="shrink-0 text-label-sm font-semibold text-primary hover:underline"
                      >
                        Add address
                      </Link>
                    </div>
                  ) : showAddressPicker ? (
                    <div className="space-y-2 rounded-[20px] bg-white p-4">
                      {addresses.map((address) => (
                        <label
                          key={address.id}
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${
                            selectedAddressId === address.id
                              ? "border-primary bg-primary/5"
                              : "border-outline-variant/30 hover:bg-surface-container-low"
                          }`}
                        >
                          <input
                            type="radio"
                            name="delivery-address"
                            checked={selectedAddressId === address.id}
                            onChange={() => {
                              setSelectedAddressId(address.id);
                              setShowAddressPicker(false);
                            }}
                            className="accent-primary"
                          />
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-container">
                            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
                              location_on
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-body-sm font-semibold text-on-surface">
                              {address.label}
                              {address.isDefault && (
                                <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-primary">
                                  Default
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-outline">
                              {address.street}, {address.city}
                              {address.state ? `, ${address.state}` : ""}{" "}
                              {address.zip}
                            </p>
                          </div>
                        </label>
                      ))}
                      <Link
                        href="/account/settings/payment"
                        className="mt-1 flex items-center gap-1.5 text-label-sm text-primary hover:underline"
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          add
                        </span>
                        Manage addresses
                      </Link>
                    </div>
                  ) : selectedAddress ? (
                    <div className="rounded-[20px] bg-white p-4">
                      <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-primary">
                          location_on
                        </span>
                        <div>
                          <p className="text-body-md text-on-surface">
                            {selectedAddress.label}
                          </p>
                          <p className="mt-0.5 text-body-sm text-outline">
                            {selectedAddress.street}, {selectedAddress.city}
                            {selectedAddress.state
                              ? `, ${selectedAddress.state}`
                              : ""}{" "}
                            {selectedAddress.zip}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-label-lg text-on-surface">
                      Payment Method
                    </p>
                    {cards.length > 0 && (
                      <button
                        onClick={() => setShowCardPicker((value) => !value)}
                        className="text-label-md text-primary hover:underline"
                      >
                        {showCardPicker ? "Cancel" : "Change"}
                      </button>
                    )}
                  </div>

                  {cards.length === 0 ? (
                    <div className="flex items-center gap-3 rounded-[20px] bg-white p-4">
                      <span className="material-symbols-outlined text-outline-variant">
                        credit_card_off
                      </span>
                      <div className="flex-1">
                        <p className="text-body-sm text-on-surface-variant">
                          No payment method saved.
                        </p>
                      </div>
                      <Link
                        href="/account/settings/payment"
                        className="shrink-0 text-label-sm font-semibold text-primary hover:underline"
                      >
                        Add card
                      </Link>
                    </div>
                  ) : showCardPicker ? (
                    <div className="space-y-2 rounded-[20px] bg-white p-4">
                      {cards.map((card) => (
                        <label
                          key={card.id}
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${
                            selectedCardId === card.id
                              ? "border-primary bg-primary/5"
                              : "border-outline-variant/30 hover:bg-surface-container-low"
                          }`}
                        >
                          <input
                            type="radio"
                            name="payment-card"
                            checked={selectedCardId === card.id}
                            onChange={() => {
                              setSelectedCardId(card.id);
                              setShowCardPicker(false);
                            }}
                            className="accent-primary"
                          />
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-container">
                            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
                              credit_card
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-body-sm font-semibold text-on-surface">
                              {card.cardType} ending in {card.lastFour}
                              {card.isDefault && (
                                <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-primary">
                                  Default
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-outline">
                              {card.name} | Exp {card.expiry}
                            </p>
                          </div>
                        </label>
                      ))}
                      <Link
                        href="/account/settings/payment"
                        className="mt-1 flex items-center gap-1.5 text-label-sm text-primary hover:underline"
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          add
                        </span>
                        Manage cards
                      </Link>
                    </div>
                  ) : selectedCard ? (
                    <div className="flex items-center justify-between rounded-[20px] bg-white p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container">
                          <span className="material-symbols-outlined text-on-surface-variant">
                            credit_card
                          </span>
                        </div>
                        <div>
                          <p className="text-body-md text-on-surface">
                            {selectedCard.cardType} ending in {selectedCard.lastFour}
                          </p>
                          <p className="text-body-sm text-outline">
                            {selectedCard.name} | Exp {selectedCard.expiry}
                          </p>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-outline">
                        chevron_right
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-7">
                <Button
                  fullWidth
                  size="lg"
                  icon="arrow_forward"
                  iconPosition="right"
                  onClick={completeCheckout}
                  className="rounded-[22px] bg-[#ffb38e] text-[#6d391d] hover:bg-[#ffcfb6]"
                >
                  {shoppingCart.external_url
                    ? "Complete Checkout"
                    : "Place Demo Order"}
                </Button>
                <p className="mt-4 text-center text-body-sm text-outline">
                  {shoppingCart.external_url
                    ? `You will continue to ${retailerLabel(shoppingCart.retailer)} to finalize the order.`
                    : "This checkout is a frontend prototype for your in-app flow."}
                </p>
                {placed && (
                  <div className="mt-4 rounded-[20px] bg-secondary-container px-4 py-3 text-body-sm text-on-secondary-container">
                    {shoppingCart.external_url
                      ? "Retailer handoff opened in a new tab."
                      : "Order placed in demo mode. Next step would be backend payment or retailer handoff."}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[24px] border border-secondary-container/60 bg-[#f7f1d9] p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
                  <span className="material-symbols-outlined text-[20px]">
                    redeem
                  </span>
                </div>
                <div>
                  <p className="text-body-lg font-semibold text-on-surface">
                    Refer a Friend
                  </p>
                  <p className="mt-1 text-body-sm text-on-surface-variant">
                    Give $10, get $10 on your next grocery run.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
