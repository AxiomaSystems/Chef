import type { Cart } from "@cart/shared";
import { CartSubNav } from "@/components/cart/cart-sub-nav";
import { AppShell } from "@/components/layout/app-shell";
import { fetchAuthedCollection } from "@/lib/api";
import { CartDetailClient } from "./[id]/cart-detail-client";

export default async function CartsPage() {
  const cartsResult = await fetchAuthedCollection<Cart>("/carts");
  const carts = [...cartsResult.data].sort((left, right) =>
    (right.updated_at ?? right.created_at ?? "").localeCompare(
      left.updated_at ?? left.created_at ?? "",
    ),
  );
  const activeCart =
    carts.find((cart) => cart.status === "active" || !cart.status) ?? null;

  return (
    <AppShell topBarTitle="Cart">
      <main className="mx-auto grid max-w-4xl gap-5 px-4 pb-36 pt-5 sm:px-6 lg:pb-10">
        <header>
          <h1 className="text-headline-lg font-bold text-on-surface">Cart</h1>
          <p className="mt-1 max-w-xl text-body-md text-outline">
            Open a cart to check it against inventory, cross off items you
            already have, then create a shopping list.
          </p>
        </header>

        <CartSubNav />

        {activeCart ? (
          <CartDetailClient cart={activeCart} />
        ) : (
          <section className="rounded-[1.5rem] border border-dashed border-[#c0dedf] bg-white/70 p-6 text-center">
            <span className="material-symbols-outlined text-[42px] text-[#5f8689]">
              shopping_cart
            </span>
            <h2 className="mt-3 text-label-lg font-black text-[#132326]">
              No cart yet
            </h2>
            <p className="mt-1 text-body-sm text-[#5f8689]">
              Add recipes to cart first, then they will appear here.
            </p>
          </section>
        )}
      </main>
    </AppShell>
  );
}
