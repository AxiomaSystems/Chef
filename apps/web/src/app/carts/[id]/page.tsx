import type { Cart } from "@cart/shared";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { fetchAuthedResource } from "@/lib/api";
import { CartDetailClient } from "./cart-detail-client";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default async function CartDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const cart = await fetchAuthedResource<Cart>(`/carts/${id}`);

  if (!cart.data) {
    notFound();
  }

  return (
    <AppShell topBarTitle="Cart" showBack>
      <main className="mx-auto grid max-w-4xl gap-5 px-4 pb-36 pt-5 sm:px-6 lg:pb-10">
        <header className="rounded-[1.75rem] border border-[#c0dedf] bg-white p-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#f4790d]">
            Cart
          </p>
          <h1 className="mt-2 text-[2.2rem] font-black leading-[0.96] text-[#132326]">
            {cart.data.name ?? "Cart"}
          </h1>
          <p className="mt-3 text-body-sm leading-6 text-[#5f8689]">
            Ingredients stay grouped by recipe here. Create the shopping list
            when you are ready to aggregate totals and match retailer products.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-label-sm text-[#5f8689]">
            <span className="rounded-full bg-[#fff2e3] px-3 py-1">
              {cart.data.dishes.length} recipe
              {cart.data.dishes.length === 1 ? "" : "s"}
            </span>
            <span className="rounded-full bg-[#fff2e3] px-3 py-1">
              {cart.data.overview.length} aggregated item
              {cart.data.overview.length === 1 ? "" : "s"}
            </span>
            <span className="rounded-full bg-[#fff2e3] px-3 py-1">
              Updated{" "}
              {formatDate(
                cart.data.updated_at ??
                  cart.data.created_at ??
                  new Date().toISOString(),
              )}
            </span>
          </div>
        </header>

        <CartDetailClient cart={cart.data} />
      </main>
    </AppShell>
  );
}
