"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { buildApiUrl, ACCESS_TOKEN_COOKIE } from "@/lib/auth";
import type {
  AddVisionObservationToInventoryRequest,
  CreateVisionObservationRequest,
  KitchenInventoryItem,
  ShoppingCart,
  VisionObservation,
} from "@cart/shared";

export type RestockCartItemInput = {
  name: string;
  amount: number;
  unit: string;
};

export async function createRestockCartAction(
  items: RestockCartItemInput[],
  retailer = "kroger",
): Promise<{ data?: ShoppingCart; error?: string }> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return { error: "Not authenticated" };

  const res = await fetch(buildApiUrl("/carts/restock"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ retailer, items }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { error: body.message ?? "Failed to create restock cart" };
  }

  revalidatePath("/shopping");
  return { data: await res.json() };
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

export async function createVisionObservationAction(
  input: CreateVisionObservationRequest,
): Promise<{ data?: VisionObservation; error?: string }> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return { error: "Not authenticated" };

  const res = await fetch(buildApiUrl("/vision/observations"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { error: body.message ?? "Failed to save vision observation" };
  }

  return { data: await res.json() };
}

export async function addVisionObservationToInventoryAction(
  observationId: string,
  input: AddVisionObservationToInventoryRequest,
): Promise<{ data?: KitchenInventoryItem; error?: string }> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return { error: "Not authenticated" };

  const res = await fetch(
    buildApiUrl(`/vision/observations/${observationId}/add-to-inventory`),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(input),
      cache: "no-store",
    },
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { error: body.message ?? "Failed to add vision item" };
  }

  const observation = (await res.json()) as VisionObservation;
  const inventoryItemId = observation.inventory_item_id;

  if (!inventoryItemId) {
    return { error: "Vision observation did not create inventory" };
  }

  const inventoryRes = await fetch(buildApiUrl("/me/kitchen-inventory"), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!inventoryRes.ok) {
    const body = await inventoryRes.json().catch(() => ({}));
    return { error: body.message ?? "Failed to load created inventory item" };
  }

  const items = (await inventoryRes.json()) as KitchenInventoryItem[];
  const item = items.find((candidate) => candidate.id === inventoryItemId);

  if (!item) {
    return { error: "Created inventory item was not returned by inventory" };
  }

  revalidatePath("/inventory");
  return { data: item };
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
