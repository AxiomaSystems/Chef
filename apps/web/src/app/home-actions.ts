"use server";

import type { CartSelection, Retailer } from "@cart/shared";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ACCESS_TOKEN_COOKIE, buildApiUrl } from "@/lib/auth";

export type DraftFlowActionState = {
  error?: string;
  success?: string;
  intent?: "save" | "generate";
  resourceType?: "draft" | "cart";
  resourceId?: string;
};

async function callAuthedJson(path: string, init?: RequestInit) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!accessToken) {
    redirect("/login");
  }

  return fetch(buildApiUrl(path), {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
}

export async function submitDraftFlowAction(
  _previousState: DraftFlowActionState,
  formData: FormData,
): Promise<DraftFlowActionState> {
  const intentValue = String(formData.get("intent") ?? "");
  const intent = intentValue === "generate" ? "generate" : "save";
  const recipeIds = formData
    .getAll("recipe_ids")
    .map((value) => String(value))
    .filter(Boolean);

  if (recipeIds.length === 0) {
    return {
      error: "Select at least one recipe first.",
    };
  }

  const selections: CartSelection[] = recipeIds.map((recipeId) => ({
    recipe_id: recipeId,
    recipe_type: "base",
    quantity: 1,
  }));

  const customName = String(formData.get("name") ?? "").trim();
  const fallbackName = `Planning run - ${recipeIds.length} recipe${recipeIds.length === 1 ? "" : "s"}`;
  const name = customName || fallbackName;
  const retailer = (String(formData.get("retailer") ?? "walmart").trim() ||
    "walmart") as Retailer;
  const resourceType = String(formData.get("resource_type") ?? "").trim();
  const resourceId = String(formData.get("resource_id") ?? "").trim();

  let path = intent === "save" ? "/cart-drafts" : "/carts";
  let method: "POST" | "PATCH" = "POST";
  let success =
    intent === "save" ? "Draft saved." : "Cart generated.";
  let nextResourceType: "draft" | "cart" =
    intent === "save" ? "draft" : "cart";

  if (resourceType === "draft" && resourceId) {
    if (intent === "save") {
      path = `/cart-drafts/${resourceId}`;
      method = "PATCH";
      success = "Draft updated.";
      nextResourceType = "draft";
    } else {
      path = "/carts";
      method = "POST";
      success = "Cart generated.";
      nextResourceType = "cart";
    }
  } else if (resourceType === "cart" && resourceId) {
    path = `/carts/${resourceId}`;
    method = "PATCH";
    success = "Cart updated.";
    nextResourceType = "cart";
  }

  const response = await callAuthedJson(path, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      retailer,
      selections,
    }),
  }).catch(() => null);

  if (!response?.ok) {
    return {
      error:
        nextResourceType === "draft"
          ? "Unable to save this draft right now."
          : "Unable to save this cart right now.",
    };
  }

  const createdResource = (await response.json()) as { id?: string };

  revalidatePath("/");
  revalidatePath("/recipes");

  return {
    success,
    intent,
    resourceType: nextResourceType,
    resourceId: String(createdResource.id ?? resourceId),
  };
}
