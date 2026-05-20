"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { Cart, Retailer } from "@cart/shared";
import {
  deletePlanningResourceAction,
  updateCartDetailsAction,
} from "@/app/home-actions";

const retailerOptions: { value: Retailer; label: string }[] = [
  { value: "walmart", label: "Walmart" },
  { value: "kroger", label: "Kroger" },
  { value: "instacart", label: "Instacart" },
];

function formatDate(iso?: string) {
  if (!iso) return "Recently";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function fallbackCartName(cart: Cart) {
  return cart.name?.trim() || "Cart";
}

export function CartsListClient({ carts }: { carts: Cart[] }) {
  const [items, setItems] = useState(carts);
  const [editingCart, setEditingCart] = useState<Cart | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sortedCarts = useMemo(
    () =>
      [...items].sort((left, right) =>
        (right.updated_at ?? right.created_at ?? "").localeCompare(
          left.updated_at ?? left.created_at ?? "",
        ),
      ),
    [items],
  );

  function updateCartInList(cart: Cart) {
    setItems((current) =>
      current.map((item) => (item.id === cart.id ? cart : item)),
    );
  }

  function deleteCart(cart: Cart) {
    if (!cart.id) return;

    const confirmed = window.confirm(`Delete ${fallbackCartName(cart)}?`);
    if (!confirmed) return;

    setDeletingId(cart.id);
    setError(null);

    void deletePlanningResourceAction("cart", cart.id).then((result) => {
      setDeletingId(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      setItems((current) => current.filter((item) => item.id !== cart.id));
    });
  }

  return (
    <>
      {error ? (
        <div className="rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-body-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {sortedCarts.length > 0 ? (
        <section className="grid gap-3">
          {sortedCarts.map((cart) => (
            <article
              key={cart.id}
              className={`rounded-[1.4rem] border border-[#c0dedf] bg-white p-4 shadow-sm transition-opacity ${
                deletingId === cart.id ? "opacity-50" : ""
              }`}
            >
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0 overflow-hidden">
                  <h2 className="max-w-full truncate text-label-lg font-black text-[#132326]">
                    {fallbackCartName(cart)}
                  </h2>
                  <p className="mt-1 text-body-sm text-[#5f8689]">
                    {cart.dishes.length} recipe
                    {cart.dishes.length === 1 ? "" : "s"} &middot;{" "}
                    {cart.overview.length} ingredient
                    {cart.overview.length === 1 ? "" : "s"}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-[#fff2e3] px-3 py-1 text-label-sm font-semibold text-[#f4790d]">
                  {formatDate(cart.updated_at ?? cart.created_at)}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-[1fr_auto_auto] items-center gap-2">
                <Link
                  href={`/carts/${cart.id}`}
                  className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#f4790d] px-4 py-2 text-label-md font-black text-[#f4790d] transition-colors hover:bg-[#fff8ef]"
                >
                  Open
                </Link>
                <button
                  type="button"
                  onClick={() => setEditingCart(cart)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[#c0dedf] text-[#5f8689] transition-colors hover:bg-[#fff8ef]"
                  aria-label={`Edit ${fallbackCartName(cart)}`}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    edit
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => deleteCart(cart)}
                  disabled={deletingId === cart.id}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-red-200 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-40"
                  aria-label={`Delete ${fallbackCartName(cart)}`}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    delete
                  </span>
                </button>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="rounded-[1.5rem] border border-dashed border-[#c0dedf] bg-white/70 p-6 text-center">
          <span className="material-symbols-outlined text-[42px] text-[#5f8689]">
            shopping_cart
          </span>
          <h2 className="mt-3 text-label-lg font-black text-[#132326]">
            No carts yet
          </h2>
          <p className="mt-1 text-body-sm text-[#5f8689]">
            Add recipes to cart first, then they will appear here.
          </p>
        </section>
      )}

      {editingCart ? (
        <EditCartDialog
          cart={editingCart}
          onClose={() => setEditingCart(null)}
          onSaved={(cart) => {
            updateCartInList(cart);
            setEditingCart(null);
          }}
          onError={setError}
        />
      ) : null}
    </>
  );
}

function EditCartDialog({
  cart,
  onClose,
  onSaved,
  onError,
}: {
  cart: Cart;
  onClose: () => void;
  onSaved: (cart: Cart) => void;
  onError: (message: string | null) => void;
}) {
  const [name, setName] = useState(fallbackCartName(cart));
  const [retailer, setRetailer] = useState<Retailer>(cart.retailer);
  const [isPending, startTransition] = useTransition();

  function saveCart() {
    if (!cart.id) return;
    onError(null);

    startTransition(async () => {
      const result = await updateCartDetailsAction(cart.id!, {
        name,
        retailer,
      });

      if (result.error || !result.cart) {
        onError(result.error ?? "Unable to update this cart right now.");
        return;
      }

      onSaved(result.cart);
    });
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end bg-black/35 sm:items-center sm:justify-center sm:p-5">
      <div className="flex max-h-[calc(100dvh-2rem)] w-screen flex-col rounded-t-[1.75rem] bg-white p-5 shadow-2xl sm:h-auto sm:max-h-[90vh] sm:max-w-md sm:rounded-[1.75rem]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#f4790d]">
              Cart
            </p>
            <h2 className="mt-1 text-headline-sm text-[#132326]">Edit cart</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#c0dedf] text-[#5f8689]"
            aria-label="Close edit cart"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pt-5">
          <label className="block text-label-sm font-bold uppercase tracking-wide text-[#5f8689]">
            Cart name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 min-h-12 w-full rounded-full border border-[#c0dedf] bg-white px-4 text-body-md font-semibold normal-case tracking-normal text-[#132326] outline-none focus:border-[#f4790d]"
            />
          </label>

          <label className="mt-4 block text-label-sm font-bold uppercase tracking-wide text-[#5f8689]">
            Store
            <select
              value={retailer}
              onChange={(event) => setRetailer(event.target.value as Retailer)}
              className="mt-2 min-h-12 w-full rounded-full border border-[#c0dedf] bg-white px-4 text-body-md font-semibold normal-case tracking-normal text-[#132326] outline-none focus:border-[#f4790d]"
            >
              {retailerOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-5">
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 rounded-full border border-[#c0dedf] px-4 text-label-lg font-black text-[#5f8689]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={saveCart}
            disabled={isPending}
            className="min-h-12 rounded-full bg-[#f4790d] px-4 text-label-lg font-black text-white disabled:opacity-60"
          >
            {isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
