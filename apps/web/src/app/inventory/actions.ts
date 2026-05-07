"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { buildApiUrl, ACCESS_TOKEN_COOKIE } from "@/lib/auth";
import type { KitchenInventoryItem } from "@cart/shared";

export async function createRestockCartAction(
  itemNames: string[],
  retailer = "kroger",
): Promise<{ error?: string }> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return { error: "Not authenticated" };

  const res = await fetch(buildApiUrl("/carts/restock"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ retailer, items: itemNames }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { error: body.message ?? "Failed to create restock cart" };
  }

  revalidatePath("/shopping");
  redirect("/shopping");
}

export async function addInventoryItemAction(
  canonicalName: string,
  options: { estimatedAmount?: number; unit?: string; label?: string } = {},
): Promise<{ data?: KitchenInventoryItem; error?: string }> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return { error: "Not authenticated" };

  const res = await fetch(buildApiUrl("/me/kitchen-inventory"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      canonical_name: canonicalName.trim(),
      label: options.label,
      estimated_amount: options.estimatedAmount,
      unit: options.unit,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (res.status === 409) return { error: "Already in your kitchen" };
    return { error: body.message ?? "Failed to add item" };
  }

  revalidatePath("/inventory");
  return { data: await res.json() };
}

export async function updateInventoryItemAction(
  id: string,
  options: {
    estimatedAmount?: number | null;
    unit?: string | null;
    label?: string | null;
  },
): Promise<{ data?: KitchenInventoryItem; error?: string }> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return { error: "Not authenticated" };

  const res = await fetch(buildApiUrl(`/me/kitchen-inventory/${id}`), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      label: options.label,
      estimated_amount: options.estimatedAmount,
      unit: options.unit,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { error: body.message ?? "Failed to update item" };
  }

  revalidatePath("/inventory");
  return { data: await res.json() };
}

export async function removeInventoryItemAction(
  id: string,
): Promise<{ error?: string }> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return { error: "Not authenticated" };

  const res = await fetch(buildApiUrl(`/me/kitchen-inventory/${id}`), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) return { error: "Failed to remove item" };
  revalidatePath("/inventory");
  return {};
}
