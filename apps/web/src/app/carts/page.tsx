import type { Cart } from "@cart/shared";
import { AppShell } from "@/components/layout/app-shell";
import { fetchAuthedCollection } from "@/lib/api";
import { CartsListClient } from "./carts-list-client";

export default async function CartsPage() {
  const cartsResult = await fetchAuthedCollection<Cart>("/carts");
  const carts = [...cartsResult.data].sort((left, right) =>
    (right.updated_at ?? right.created_at ?? "").localeCompare(
      left.updated_at ?? left.created_at ?? "",
    ),
  );

  return (
    <AppShell topBarTitle="Cart">
      <main className="mx-auto grid max-w-4xl gap-5 px-4 pb-36 pt-5 sm:px-6 lg:pb-10">
        <header className="rounded-[1.75rem] border border-[#c0dedf] bg-white p-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#f4790d]">
            Cart
          </p>
          <h1 className="mt-2 text-[2.2rem] font-black leading-[0.96] text-[#132326]">
            Carts
          </h1>
          <p className="mt-3 text-body-sm leading-6 text-[#5f8689]">
            Open a cart to check it against inventory, cross off items you
            already have, then create a shopping list.
          </p>
        </header>

        <CartsListClient carts={carts} />
      </main>
    </AppShell>
  );
}
