"use server";

import type {
  BaseRecipe,
  Cart,
  CartSelection,
  IngredientReview,
  MatchedIngredientProduct,
  ProductCandidate,
  RecipeListPage,
  Retailer,
  RetailerProductSearchResponse,
  ShoppingCart,
  Tag,
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

export type UpdateIngredientReviewActionState = {
  error?: string;
  success?: string;
  review?: IngredientReview;
};

export type UpdateCartDetailsActionState = {
  error?: string;
  success?: string;
  cart?: Cart;
};

export type GetShoppingCartActionState = {
  error?: string;
  shoppingCart?: ShoppingCart;
};

export type LoadRecipesPageActionState = {
  error?: string;
  page?: RecipeListPage;
};

export type LoadRecipesPageInput = {
  cursor?: string;
  q?: string;
  cuisine_id?: string;
  tag_id?: string;
  owner?: "public" | "mine" | "saved";
};

async function readErrorMessage(response: Response | null, fallback: string) {
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

function mergeCartSelections(
  existingSelections: CartSelection[],
  incomingSelections: CartSelection[],
) {
  const merged = new Map<string, CartSelection>();

  for (const selection of [...existingSelections, ...incomingSelections]) {
    const key = [
      selection.recipe_type,
      selection.recipe_id,
      selection.servings_override ?? "",
    ].join(":");
    const current = merged.get(key);

    merged.set(key, {
      ...selection,
      quantity: (current?.quantity ?? 0) + selection.quantity,
    });
  }

  return Array.from(merged.values());
}

function buildCartName(recipeNames: string[], fallbackCount: number) {
  const uniqueNames = Array.from(
    new Set(recipeNames.map((name) => name.trim()).filter(Boolean)),
  );

  if (uniqueNames.length === 1) return uniqueNames[0];
  if (uniqueNames.length === 2) return `${uniqueNames[0]} + ${uniqueNames[1]}`;
  if (uniqueNames.length > 2) {
    return `${uniqueNames[0]}, ${uniqueNames[1]} + ${uniqueNames.length - 2} more`;
  }

  return `${fallbackCount} recipe cart`;
}

async function findActiveCart() {
  const response = await callAuthedJson("/carts").catch(() => null);
  if (!response?.ok) return null;
  const carts = (await response.json()) as Cart[];

  return (
    [...carts].sort((left, right) =>
      (right.updated_at ?? right.created_at ?? "").localeCompare(
        left.updated_at ?? left.created_at ?? "",
      ),
    )[0] ?? null
  );
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
        recipe_name?: string;
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
  let recipeNames: string[] = [];
  if (selectionsJson) {
    try {
      const parsed = JSON.parse(selectionsJson) as Array<{
        recipe_name?: string;
      }>;
      recipeNames = Array.from(
        new Set(
          parsed
            .map((selection) => String(selection.recipe_name ?? "").trim())
            .filter(Boolean),
        ),
      );
    } catch {
      recipeNames = [];
    }
  }

  const fallbackName = buildCartName(recipeNames, selections.length);
  const name = customName || fallbackName;
  const retailer = (String(formData.get("retailer") ?? "walmart").trim() ||
    "walmart") as Retailer;
  const resourceType = String(formData.get("resource_type") ?? "").trim();
  const resourceId = String(formData.get("resource_id") ?? "").trim();

  let path = intent === "save" ? "/cart-drafts" : "/carts";
  let method: "POST" | "PATCH" = "POST";
  let success = intent === "save" ? "Draft saved." : "Cart generated.";
  let nextResourceType: "draft" | "cart" = intent === "save" ? "draft" : "cart";
  let requestName = name;
  let requestSelections = selections;

  if (resourceType === "draft" && resourceId) {
    if (intent === "save") {
      path = `/cart-drafts/${resourceId}`;
      method = "PATCH";
      success = "Draft updated.";
      nextResourceType = "draft";
    } else {
      const activeCart = await findActiveCart();
      if (activeCart?.id) {
        const existingNames = activeCart.dishes.map((dish) => dish.name);
        path = `/carts/${activeCart.id}`;
        method = "PATCH";
        requestSelections = mergeCartSelections(
          activeCart.selections,
          selections,
        );
        requestName =
          customName ||
          buildCartName(
            [...existingNames, ...recipeNames],
            requestSelections.length,
          );
        success = "Cart updated.";
      } else {
        path = "/carts";
        method = "POST";
        success = "Cart generated.";
      }
      nextResourceType = "cart";
    }
  } else if (resourceType === "cart" && resourceId) {
    path = `/carts/${resourceId}`;
    method = "PATCH";
    success = "Cart updated.";
    nextResourceType = "cart";
  } else if (intent === "generate") {
    const activeCart = await findActiveCart();
    if (activeCart?.id) {
      const existingNames = activeCart.dishes.map((dish) => dish.name);
      path = `/carts/${activeCart.id}`;
      method = "PATCH";
      requestSelections = mergeCartSelections(
        activeCart.selections,
        selections,
      );
      requestName =
        customName ||
        buildCartName(
          [...existingNames, ...recipeNames],
          requestSelections.length,
        );
      success = "Cart updated.";
    }
  }

  const response = await callAuthedJson(path, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: requestName,
      retailer,
      selections: requestSelections,
    }),
  }).catch(() => null);

  if (!response?.ok) {
    return {
      error: await readErrorMessage(
        response,
        nextResourceType === "draft"
          ? "Unable to save this draft right now."
          : "Unable to save this cart right now.",
      ),
    };
  }

  const createdResource = (await response.json()) as { id?: string };

  if (resourceType === "draft" && resourceId && intent === "generate") {
    await callAuthedJson(`/cart-drafts/${resourceId}`, {
      method: "DELETE",
    }).catch(() => null);
  }

  revalidatePath("/dashboard");
  revalidatePath("/recipes");
  revalidatePath("/carts");
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

  revalidatePath("/dashboard");
  revalidatePath("/recipes");
  revalidatePath("/carts");
  revalidatePath("/shopping");

  return {
    success: resourceType === "draft" ? "Draft deleted." : "Cart deleted.",
    resourceType,
    resourceId: normalizedResourceId,
  };
}

export async function updateCartDetailsAction(
  cartId: string,
  input: {
    name?: string;
    retailer?: Retailer;
    selections?: CartSelection[];
    dishes?: Cart["dishes"];
  },
): Promise<UpdateCartDetailsActionState> {
  const normalizedCartId = String(cartId).trim();

  if (!normalizedCartId) {
    return { error: "Cart not found for update." };
  }

  const name = input.name?.trim();
  const response = await callAuthedJson(`/carts/${normalizedCartId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: name || undefined,
      retailer: input.retailer,
      selections: input.selections,
      dishes: input.dishes,
    }),
  }).catch(() => null);

  if (!response?.ok) {
    return {
      error: await readErrorMessage(
        response,
        "Unable to update this cart right now.",
      ),
    };
  }

  const cart = (await response.json()) as Cart;

  revalidatePath("/dashboard");
  revalidatePath("/recipes");
  revalidatePath("/carts");
  revalidatePath(`/carts/${normalizedCartId}`);
  revalidatePath("/shopping");

  return {
    success: "Cart updated.",
    cart,
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

  revalidatePath("/dashboard");
  revalidatePath("/recipes");
  revalidatePath("/shopping");

  return {
    success: "Shopping cart generated.",
    shoppingCart,
  };
}

export async function updateIngredientReviewAction(
  cartId: string,
  items: IngredientReview["items"],
): Promise<UpdateIngredientReviewActionState> {
  const normalizedCartId = String(cartId).trim();

  if (!normalizedCartId) {
    return { error: "Cart not found for inventory review." };
  }

  const response = await callAuthedJson(
    `/carts/${normalizedCartId}/ingredient-review`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: items.map((item) => ({
          ingredient_id: item.ingredient_id,
          canonical_ingredient: item.canonical_ingredient,
          unit: item.unit,
          action: item.action,
          adjusted_amount: item.adjusted_amount,
          adjusted_unit: item.adjusted_unit,
        })),
      }),
    },
  ).catch(() => null);

  if (!response?.ok) {
    return {
      error: await readErrorMessage(
        response,
        "Unable to save this cart review right now.",
      ),
    };
  }

  const review = (await response.json()) as IngredientReview;

  revalidatePath(`/carts/${normalizedCartId}`);
  revalidatePath("/shopping");

  return {
    success: "Cart review saved.",
    review,
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

export type ForkRecipeActionState = { error?: string; recipe?: BaseRecipe };

export async function forkRecipeAction(
  sourceRecipeId: string,
): Promise<ForkRecipeActionState> {
  const id = String(sourceRecipeId).trim();
  if (!id) return { error: "Recipe not found." };

  const response = await callAuthedJson("/recipe-forks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source_recipe_id: id }),
  }).catch(() => null);

  if (!response?.ok) {
    return {
      error: await readErrorMessage(
        response,
        "Unable to save this recipe right now.",
      ),
    };
  }

  const recipe = (await response.json()) as BaseRecipe;
  revalidatePath("/recipes");
  return { recipe };
}

export type CreateRecipePayload = {
  name: string;
  cuisine_id: string;
  servings: number;
  description?: string;
  cover_image_url?: string;
  tag_ids?: string[];
  custom_tag_names?: string[];
  ingredients: {
    canonical_ingredient: string;
    amount: number;
    unit: string;
    preparation?: string;
    optional?: boolean;
  }[];
  steps: { step: number; what_to_do: string }[];
  nutrition_data?: {
    calories?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
    fiber_g?: number;
    sugar_g?: number;
    sodium_mg?: number;
  };
};

export type CreateRecipeActionState = { error?: string; recipe?: BaseRecipe };

function normalizeTagName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function normalizeTagSlug(name: string) {
  return normalizeTagName(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function listVisibleTags() {
  const response = await callAuthedJson("/tags").catch(() => null);
  if (!response?.ok) return [];
  return (await response.json()) as Tag[];
}

async function createUserTag(name: string) {
  const response = await callAuthedJson("/tags", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, kind: "dietary_badge" }),
  }).catch(() => null);

  if (!response?.ok) return null;
  return (await response.json()) as Tag;
}

async function resolveRecipeTagIds(payload: CreateRecipePayload) {
  const existingIds = payload.tag_ids ?? [];
  const customNames = Array.from(
    new Map(
      (payload.custom_tag_names ?? [])
        .map(normalizeTagName)
        .filter(Boolean)
        .map((name) => [normalizeTagSlug(name), name]),
    ).values(),
  );

  if (customNames.length === 0) {
    return existingIds;
  }

  const visibleTags = await listVisibleTags();
  const tagsBySlug = new Map(
    visibleTags.map((tag) => [normalizeTagSlug(tag.name || tag.slug), tag]),
  );
  const resolvedIds = [...existingIds];

  for (const name of customNames) {
    const slug = normalizeTagSlug(name);
    const existingTag = tagsBySlug.get(slug);

    if (existingTag) {
      resolvedIds.push(existingTag.id);
      continue;
    }

    const createdTag = await createUserTag(name);
    if (createdTag) {
      tagsBySlug.set(slug, createdTag);
      resolvedIds.push(createdTag.id);
      continue;
    }

    const refreshedTags = await listVisibleTags();
    const refreshedTag = refreshedTags.find(
      (tag) => normalizeTagSlug(tag.name || tag.slug) === slug,
    );
    if (!refreshedTag) {
      throw new Error(`Unable to save tag "${name}".`);
    }
    resolvedIds.push(refreshedTag.id);
  }

  return Array.from(new Set(resolvedIds));
}

async function buildRecipeRequestPayload(payload: CreateRecipePayload) {
  const tagIds = await resolveRecipeTagIds(payload);
  const { custom_tag_names: _customTagNames, ...recipePayload } = payload;

  return {
    ...recipePayload,
    tag_ids: tagIds.length > 0 ? tagIds : undefined,
  };
}

export async function createRecipeAction(
  payload: CreateRecipePayload,
): Promise<CreateRecipeActionState> {
  let recipePayload: Omit<CreateRecipePayload, "custom_tag_names">;
  try {
    recipePayload = await buildRecipeRequestPayload(payload);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to save recipe tags right now.",
    };
  }

  const response = await callAuthedJson("/recipes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(recipePayload),
  }).catch(() => null);

  if (!response?.ok) {
    return {
      error: await readErrorMessage(
        response,
        "Unable to create recipe right now.",
      ),
    };
  }

  const recipe = (await response.json()) as BaseRecipe;
  revalidatePath("/recipes");
  return { recipe };
}

export async function loadRecipesPageAction(
  input: LoadRecipesPageInput = {},
): Promise<LoadRecipesPageActionState> {
  const params = new URLSearchParams({ limit: "24" });
  if (input.cursor) params.set("cursor", input.cursor);
  if (input.q?.trim()) params.set("q", input.q.trim());
  if (input.cuisine_id) params.set("cuisine_id", input.cuisine_id);
  if (input.tag_id) params.set("tag_id", input.tag_id);
  if (input.owner) params.set("owner", input.owner);

  const response = await callAuthedJson(`/recipes?${params.toString()}`).catch(
    () => null,
  );

  if (!response?.ok) {
    return {
      error: await readErrorMessage(
        response,
        "Unable to load more recipes right now.",
      ),
    };
  }

  const page = (await response
    .json()
    .catch(() => null)) as RecipeListPage | null;

  if (!page) {
    return { error: "Unable to load more recipes right now." };
  }

  return { page };
}

export type UpdateRecipeActionState = { error?: string; recipe?: BaseRecipe };

export async function updateRecipeAction(
  recipeId: string,
  payload: CreateRecipePayload,
): Promise<UpdateRecipeActionState> {
  const id = String(recipeId).trim();
  if (!id) {
    return { error: "Recipe not found." };
  }

  let recipePayload: Omit<CreateRecipePayload, "custom_tag_names">;
  try {
    recipePayload = await buildRecipeRequestPayload(payload);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to save recipe tags right now.",
    };
  }

  const response = await callAuthedJson(`/recipes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(recipePayload),
  }).catch(() => null);

  if (!response?.ok) {
    return {
      error: await readErrorMessage(
        response,
        "Unable to update recipe right now.",
      ),
    };
  }

  const recipe = (await response.json()) as BaseRecipe;
  revalidatePath("/recipes");
  return { recipe };
}

export async function deleteRecipeAction(
  recipeId: string,
): Promise<{ error?: string }> {
  const id = String(recipeId).trim();
  if (!id) return { error: "Recipe not found." };

  const response = await callAuthedJson(`/recipes/${id}`, {
    method: "DELETE",
  }).catch(() => null);

  if (!response?.ok) {
    return {
      error: await readErrorMessage(
        response,
        "Unable to delete recipe right now.",
      ),
    };
  }

  revalidatePath("/recipes");
  return {};
}

export async function deleteShoppingCartAction(
  shoppingCartId: string,
): Promise<{ error?: string }> {
  const id = String(shoppingCartId).trim();
  if (!id) return { error: "Shopping cart not found." };

  const response = await callAuthedJson(`/shopping-carts/${id}`, {
    method: "DELETE",
  }).catch(() => null);

  if (!response?.ok) {
    return { error: "Unable to delete this shopping cart right now." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/shopping");
  return {};
}

export async function getShoppingCartAction(
  shoppingCartId: string,
): Promise<GetShoppingCartActionState> {
  const id = String(shoppingCartId).trim();
  if (!id) return { error: "Shopping cart not found." };

  const response = await callAuthedJson(`/shopping-carts/${id}`).catch(
    () => null,
  );

  if (!response?.ok) {
    return {
      error: await readErrorMessage(
        response,
        "Unable to open this shopping cart right now.",
      ),
    };
  }

  return {
    shoppingCart: (await response.json()) as ShoppingCart,
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

export async function updateShoppingCartCheckoutStateAction(
  shoppingCartId: string,
  checkedOutAt: string | null,
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
        checked_out_at: checkedOutAt,
      }),
    },
  ).catch(() => null);

  if (!response?.ok) {
    return {
      error: "Unable to update this shopping cart right now.",
    };
  }

  const shoppingCart = (await response.json()) as ShoppingCart;

  revalidatePath("/shopping");
  revalidatePath(`/shopping/checkout/${normalizedShoppingCartId}`);

  return {
    success: "Shopping cart updated.",
    shoppingCart,
  };
}
