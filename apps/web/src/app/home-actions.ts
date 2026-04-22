"use server";

import type {
  CartSelection,
  MatchedIngredientProduct,
  ProductCandidate,
  Retailer,
  RetailerProductSearchResponse,
  ShoppingCart,
} from "@cart/shared";
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

export type DeletePlanningResourceActionState = {
  error?: string;
  success?: string;
  resourceType?: "draft" | "cart";
  resourceId?: string;
};

export type CreateShoppingCartActionState = {
  error?: string;
  success?: string;
  shoppingCart?: ShoppingCart;
};

export type SearchRetailerProductsActionState = {
  error?: string;
  results?: ProductCandidate[];
};

export type UpdateShoppingCartActionState = {
  error?: string;
  success?: string;
  shoppingCart?: ShoppingCart;
};

async function readErrorMessage(
  response: Response | null,
  fallback: string,
) {
  if (!response) {
    return fallback;
  }

  try {
    const payload = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(payload.message)) {
      return payload.message[0] ?? fallback;
    }
    if (typeof payload.message === "string" && payload.message.trim()) {
      return payload.message.trim();
    }
  } catch {
    // Ignore parse failures and use fallback below.
  }

  return fallback;
}

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
  const selectionsJson = String(formData.get("selections_json") ?? "").trim();
  let selections: CartSelection[] = [];

  if (selectionsJson) {
    try {
      const parsed = JSON.parse(selectionsJson) as Array<{
        recipe_id?: string;
        quantity?: number;
      }>;
      selections = parsed
        .map((selection) => ({
          recipe_id: String(selection.recipe_id ?? "").trim(),
          recipe_type: "base" as const,
          quantity: Math.max(1, Number(selection.quantity ?? 1)),
        }))
        .filter((selection) => selection.recipe_id);
    } catch {
      selections = [];
    }
  }

  if (selections.length === 0) {
    return {
      error: "Select at least one recipe first.",
    };
  }

  const customName = String(formData.get("name") ?? "").trim();
  const fallbackName = `Planning run - ${selections.length} recipe${selections.length === 1 ? "" : "s"}`;
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

  if (
    resourceType === "draft" &&
    resourceId &&
    intent === "generate"
  ) {
    await callAuthedJson(`/cart-drafts/${resourceId}`, {
      method: "DELETE",
    }).catch(() => null);
  }

  revalidatePath("/");
  revalidatePath("/recipes");
  revalidatePath("/shopping");

  return {
    success,
    intent,
    resourceType: nextResourceType,
    resourceId: String(createdResource.id ?? resourceId),
  };
}

export async function deletePlanningResourceAction(
  resourceType: "draft" | "cart",
  resourceId: string,
): Promise<DeletePlanningResourceActionState> {
  const normalizedResourceId = String(resourceId).trim();

  if (!resourceType || !normalizedResourceId) {
    return {
      error: "Planning resource not found for deletion.",
    };
  }

  const path =
    resourceType === "draft"
      ? `/cart-drafts/${normalizedResourceId}`
      : `/carts/${normalizedResourceId}`;

  const response = await callAuthedJson(path, {
    method: "DELETE",
  }).catch(() => null);

  if (!response?.ok) {
    return {
      error:
        resourceType === "draft"
          ? "Unable to delete this draft right now."
          : "Unable to delete this cart right now.",
    };
  }

  revalidatePath("/");
  revalidatePath("/recipes");
  revalidatePath("/shopping");

  return {
    success: resourceType === "draft" ? "Draft deleted." : "Cart deleted.",
    resourceType,
    resourceId: normalizedResourceId,
  };
}

export async function createShoppingCartAction(
  cartId: string,
  retailer: Retailer,
): Promise<CreateShoppingCartActionState> {
  const normalizedCartId = String(cartId).trim();

  if (!normalizedCartId) {
    return {
      error: "Cart not found for shopping-cart generation.",
    };
  }

  const response = await callAuthedJson(
    `/carts/${normalizedCartId}/shopping-carts`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ retailer }),
    },
  ).catch(() => null);

  if (!response?.ok) {
    return {
      error: await readErrorMessage(
        response,
        "Unable to generate this shopping cart right now.",
      ),
    };
  }

  const shoppingCart = (await response.json()) as ShoppingCart;

  revalidatePath("/");
  revalidatePath("/recipes");
  revalidatePath("/shopping");

  return {
    success: "Shopping cart generated.",
    shoppingCart,
  };
}

export async function searchRetailerProductsAction(
  retailer: Retailer,
  query: string,
): Promise<SearchRetailerProductsActionState> {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return {
      results: [],
    };
  }

  const params = new URLSearchParams({ query: normalizedQuery });
  const response = await callAuthedJson(
    `/retailers/${retailer}/products/search?${params.toString()}`,
  ).catch(() => null);

  if (!response?.ok) {
    return {
      error: await readErrorMessage(
        response,
        "Unable to search retailer products right now.",
      ),
    };
  }

  const payload = (await response.json()) as RetailerProductSearchResponse;

  return {
    results: payload.candidates,
  };
}

export async function updateShoppingCartAction(
  shoppingCartId: string,
  matchedItems: MatchedIngredientProduct[],
): Promise<UpdateShoppingCartActionState> {
  const normalizedShoppingCartId = String(shoppingCartId).trim();

  if (!normalizedShoppingCartId) {
    return {
      error: "Shopping cart not found for update.",
    };
  }

  const response = await callAuthedJson(
    `/shopping-carts/${normalizedShoppingCartId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        matched_items: matchedItems,
      }),
    },
  ).catch(() => null);

  if (!response?.ok) {
    return {
      error: "Unable to update this shopping cart right now.",
    };
  }

  const shoppingCart = (await response.json()) as ShoppingCart;

  revalidatePath("/");
  revalidatePath("/recipes");

  return {
    success: "Shopping cart updated.",
    shoppingCart,
  };
}
