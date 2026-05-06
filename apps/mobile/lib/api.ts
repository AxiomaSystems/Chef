import type {
  BaseRecipe,
  Cart,
  Cuisine,
  KitchenInventoryItem,
  MealPlan,
  ShoppingCart,
  Tag,
  User,
} from "./types";

const DEFAULT_API_BASE_URL = "http://localhost:3001/api/v1";
let accessToken = process.env.EXPO_PUBLIC_DEV_ACCESS_TOKEN ?? "";
let refreshToken = "";

export const apiConfig = {
  baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL,
};

export function getAccessToken() {
  return accessToken;
}

export function setAuthTokens(tokens: { access_token: string; refresh_token?: string }) {
  accessToken = tokens.access_token;
  refreshToken = tokens.refresh_token ?? refreshToken;
}

export function clearAuthTokens() {
  accessToken = "";
  refreshToken = "";
}

type ApiResult<T> = {
  data: T | null;
  error: string | null;
};

type ApiErrorPayload = {
  message?: string | string[];
  error?: string;
};

function authHeaders() {
  return {
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

async function readApiError(response: Response) {
  const payload = (await response.json().catch(() => null)) as ApiErrorPayload | null;
  const message = Array.isArray(payload?.message) ? payload.message[0] : payload?.message;

  return message ?? payload?.error ?? null;
}

async function requestErrorMessage(response: Response) {
  const apiMessage = await readApiError(response);

  if (response.status === 401) {
    clearAuthTokens();
    return "Your session expired. Sign in again.";
  }

  if (response.status === 403) return "You do not have access to that Chef data.";
  if (response.status === 404) return "Chef could not find that resource.";

  return apiMessage ?? "Chef API returned an unexpected error.";
}

async function authErrorMessage(response: Response) {
  const apiMessage = await readApiError(response);

  if (response.status === 400) {
    return apiMessage ?? "Check your email and password, then try again.";
  }

  if (response.status === 401) return "Invalid email or password.";
  if (response.status === 409) return "Email already registered.";

  return apiMessage ?? "Chef API returned an unexpected auth error.";
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  if (!accessToken) {
    return {
      data: null,
      error: "Sign in to load live mobile data.",
    };
  }

  const response = await fetch(`${apiConfig.baseUrl}${path}`, {
    ...init,
    headers: {
      ...authHeaders(),
      ...(init?.headers ?? {}),
    },
  }).catch(() => null);

  if (!response) {
    return { data: null, error: "Unable to reach Chef API." };
  }

  if (!response.ok) return { data: null, error: await requestErrorMessage(response) };

  if (response.status === 204) {
    return { data: null, error: null };
  }

  return { data: (await response.json()) as T, error: null };
}

async function publicRequestJson<T>(path: string, body: Record<string, unknown>): Promise<ApiResult<T>> {
  const response = await fetch(`${apiConfig.baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null);

  if (!response) {
    return { data: null, error: "Unable to reach Chef API." };
  }

  if (!response.ok) return { data: null, error: await authErrorMessage(response) };

  return { data: (await response.json()) as T, error: null };
}

function unwrapCollection<T>(payload: T[] | { data?: T[] } | null) {
  if (Array.isArray(payload)) return payload;
  return payload?.data ?? [];
}

export async function loadDashboardData() {
  const [user, recipes, carts, shoppingCarts] = await Promise.all([
    requestJson<User>("/me"),
    requestJson<BaseRecipe[] | { data?: BaseRecipe[] }>("/recipes"),
    requestJson<Cart[] | { data?: Cart[] }>("/carts"),
    requestJson<ShoppingCart[] | { data?: ShoppingCart[] }>("/shopping-carts"),
  ]);

  return {
    user: user.data,
    recipes: unwrapCollection(recipes.data),
    carts: unwrapCollection(carts.data),
    shoppingCarts: unwrapCollection(shoppingCarts.data),
    error: user.error ?? recipes.error ?? carts.error ?? shoppingCarts.error,
  };
}

export async function loadRecipesData() {
  const [user, recipes] = await Promise.all([
    requestJson<User>("/me"),
    requestJson<BaseRecipe[] | { data?: BaseRecipe[] }>("/recipes"),
  ]);

  return {
    user: user.data,
    recipes: unwrapCollection(recipes.data),
    error: user.error ?? recipes.error,
  };
}

export async function loadMealPlanData(weekStart: string) {
  const [recipes, mealPlan] = await Promise.all([
    requestJson<BaseRecipe[] | { data?: BaseRecipe[] }>("/recipes"),
    requestJson<MealPlan>(`/meal-plans?week_start=${encodeURIComponent(weekStart)}`),
  ]);

  return {
    recipes: unwrapCollection(recipes.data),
    mealPlan: mealPlan.data,
    error: recipes.error ?? mealPlan.error,
  };
}

export async function loadShoppingData() {
  const [carts, shoppingCarts] = await Promise.all([
    requestJson<Cart[] | { data?: Cart[] }>("/carts"),
    requestJson<ShoppingCart[] | { data?: ShoppingCart[] }>("/shopping-carts"),
  ]);

  return {
    carts: unwrapCollection(carts.data),
    shoppingCarts: unwrapCollection(shoppingCarts.data),
    error: carts.error ?? shoppingCarts.error,
  };
}

export async function createCartFromRecipes(recipes: BaseRecipe[]) {
  return requestJson<Cart>("/carts", {
    method: "POST",
    body: JSON.stringify({
      name:
        recipes.length === 1
          ? `${recipes[0].name} Cart`
          : `Mobile cart - ${recipes.length} recipes`,
      retailer: "kroger",
      selections: recipes.map((recipe) => ({
        recipe_id: recipe.id,
        recipe_type: "base",
        quantity: 1,
        servings_override: recipe.servings,
      })),
    }),
  });
}

export async function createShoppingCart(cartId: string, retailer = "kroger") {
  return requestJson<ShoppingCart>(`/carts/${cartId}/shopping-carts`, {
    method: "POST",
    body: JSON.stringify({ retailer }),
  });
}

export async function deleteShoppingCart(id: string) {
  return requestJson<null>(`/shopping-carts/${id}`, {
    method: "DELETE",
  });
}

export async function loadInventoryData() {
  const result = await requestJson<KitchenInventoryItem[] | { data?: KitchenInventoryItem[] }>(
    "/me/kitchen-inventory",
  );

  return {
    items: unwrapCollection(result.data),
    error: result.error,
  };
}

export async function addInventoryItem(canonicalName: string) {
  return requestJson<KitchenInventoryItem>("/me/kitchen-inventory", {
    method: "POST",
    body: JSON.stringify({ canonical_name: canonicalName, label: canonicalName }),
  });
}

export async function deleteInventoryItem(id: string) {
  return requestJson<null>(`/me/kitchen-inventory/${id}`, {
    method: "DELETE",
  });
}

export async function loadCurrentUser() {
  return requestJson<User>("/me");
}

export async function login(input: { email: string; password: string }) {
  const result = await publicRequestJson<{
    access_token: string;
    refresh_token: string;
    expires_in: string;
  }>("/auth/login", input);

  if (result.data) setAuthTokens(result.data);
  return result;
}

export async function signup(input: { name: string; email: string; password: string }) {
  const result = await publicRequestJson<{
    access_token: string;
    refresh_token: string;
    expires_in: string;
  }>("/auth/register", input);

  if (result.data) setAuthTokens(result.data);
  return result;
}

export async function loadOnboardingLookups() {
  const [cuisines, tags, preferences] = await Promise.all([
    requestJson<Cuisine[] | { data?: Cuisine[] }>("/cuisines"),
    requestJson<Tag[] | { data?: Tag[] }>("/tags"),
    requestJson<Record<string, unknown>>("/me/preferences"),
  ]);

  return {
    cuisines: unwrapCollection(cuisines.data),
    tags: unwrapCollection(tags.data),
    preferences: preferences.data,
    error: cuisines.error ?? tags.error ?? preferences.error,
  };
}

export type ImportedRecipeResult = {
  source_url: string;
  platform: string;
  source_title: string;
  source_creator: string | null;
  imported_recipe: {
    name: string;
    cuisine: string;
    description: string;
    servings: number;
    ingredients: Array<{
      canonical_ingredient: string;
      display_ingredient?: string | null;
      amount: number;
      unit: string;
      preparation?: string | null;
      optional?: boolean;
    }>;
    steps: Array<{ step: number; what_to_do: string }>;
    tags?: string[];
    nutrition_estimate?: BaseRecipe["nutrition_data"];
  };
  extraction_notes: string[];
};

export async function importRecipeFromUrl(input: { url: string; supplementalText?: string }) {
  return requestJson<ImportedRecipeResult>("/ai/recipe-imports/structure", {
    method: "POST",
    body: JSON.stringify({
      url: input.url,
      supplemental_text: input.supplementalText,
    }),
  });
}

export async function saveImportedRecipe(imported: ImportedRecipeResult, cuisines: Cuisine[]) {
  const recipe = imported.imported_recipe;
  const matched =
    cuisines.find((cuisine) => cuisine.label.toLowerCase() === recipe.cuisine.toLowerCase()) ??
    cuisines[0];

  if (!matched) {
    return { data: null, error: "No cuisines available to save the recipe." };
  }

  return requestJson<BaseRecipe>("/recipes", {
    method: "POST",
    body: JSON.stringify({
      name: recipe.name,
      cuisine_id: matched.id,
      description: recipe.description,
      servings: recipe.servings,
      ingredients: recipe.ingredients.map((ingredient) => ({
        canonical_ingredient: ingredient.canonical_ingredient,
        display_ingredient: ingredient.display_ingredient,
        amount: ingredient.amount,
        unit: ingredient.unit,
        preparation: ingredient.preparation,
        optional: ingredient.optional,
      })),
      steps: recipe.steps,
      nutrition_data: recipe.nutrition_estimate,
    }),
  });
}

export async function saveOnboarding(input: Record<string, unknown>) {
  const response = await requestJson("/me/profile-memory", {
    method: "PATCH",
    body: JSON.stringify(input),
  });

  if (response.error) return response;

  return requestJson("/me/onboarding/complete", {
    method: "POST",
  });
}
