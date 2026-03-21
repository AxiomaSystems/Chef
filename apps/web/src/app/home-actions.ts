"use server";

import type { CartSelection } from "@cart/shared";
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

export type CreatedDraftPayload = {
  id: string;
  user_id?: string;
  name?: string;
  selections: CartSelection[];
  retailer: string;
  created_at: string;
  updated_at: string;
};

export type CreateDraftFromRecipeActionState = {
  error?: string;
  success?: string;
  draft?: CreatedDraftPayload;
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

  const response = await callAuthedJson(
    intent === "save" ? "/cart-drafts" : "/carts",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        retailer: "walmart",
        selections,
      }),
    },
  ).catch(() => null);

  if (!response?.ok) {
    return {
      error:
        intent === "save"
          ? "Unable to save this draft right now."
          : "Unable to generate a cart right now.",
    };
  }

  const createdResource = (await response.json()) as { id?: string };

  revalidatePath("/");

  return {
    success: intent === "save" ? "Draft saved." : "Cart generated.",
    intent,
    resourceType: intent === "save" ? "draft" : "cart",
    resourceId: String(createdResource.id),
  };
}

export async function createDraftFromRecipeAction(
  _previousState: CreateDraftFromRecipeActionState,
  formData: FormData,
): Promise<CreateDraftFromRecipeActionState> {
  const recipeId = String(formData.get("recipe_id") ?? "").trim();

  if (!recipeId) {
    return {
      error: "Recipe not found for draft creation.",
    };
  }

  const recipeName = String(formData.get("recipe_name") ?? "").trim();
  const response = await callAuthedJson("/cart-drafts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: recipeName ? `${recipeName} draft` : undefined,
      retailer: "walmart",
      selections: [
        {
          recipe_id: recipeId,
          recipe_type: "base",
          quantity: 1,
        },
      ] satisfies CartSelection[],
    }),
  }).catch(() => null);

  if (!response?.ok) {
    return {
      error: "Unable to create a draft from this recipe right now.",
    };
  }

  const draft = (await response.json()) as CreatedDraftPayload;

  revalidatePath("/");
  revalidatePath("/recipes");

  return {
    success: "Draft created.",
    draft,
  };
}
