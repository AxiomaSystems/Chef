"use server";

import type {
  CreateMealEventRequest,
  GenerateMealPlanCartRequest,
  GenerateMealPlanCartResponse,
  MealEvent,
  MealPlanRange,
  UpdateMealEventRequest,
} from "@cart/shared";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_TOKEN_COOKIE, buildApiUrl } from "@/lib/auth";

type MealPlanRangeActionState = {
  error?: string;
  mealPlan?: MealPlanRange;
};

type MealEventActionState = {
  error?: string;
  event?: MealEvent;
};

type MealPlanCartActionState = {
  error?: string;
  cartId?: string;
};

async function readErrorMessage(response: Response | null, fallback: string) {
  if (!response) return fallback;

  try {
    const payload = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(payload.message)) return payload.message[0] ?? fallback;
    if (typeof payload.message === "string" && payload.message.trim()) {
      return payload.message.trim();
    }
  } catch {
    // Fall back below.
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
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
}

export async function getMealPlanRangeAction(
  from: string,
  to: string,
): Promise<MealPlanRangeActionState> {
  const params = new URLSearchParams({ from: from.trim(), to: to.trim() });
  const response = await callAuthedJson(
    `/meal-plans?${params.toString()}`,
  ).catch(() => null);

  if (!response?.ok) {
    return {
      error: await readErrorMessage(
        response,
        "Unable to load this meal plan right now.",
      ),
    };
  }

  return {
    mealPlan: (await response.json()) as MealPlanRange,
  };
}

export async function createMealEventAction(
  input: CreateMealEventRequest,
): Promise<MealEventActionState> {
  const response = await callAuthedJson("/meal-events", {
    method: "POST",
    body: JSON.stringify(input),
  }).catch(() => null);

  if (!response?.ok) {
    return {
      error: await readErrorMessage(
        response,
        "Unable to add that meal right now.",
      ),
    };
  }

  revalidatePath("/meal-plan");

  return {
    event: (await response.json()) as MealEvent,
  };
}

export async function updateMealEventAction(
  eventId: string,
  input: UpdateMealEventRequest,
): Promise<MealEventActionState> {
  const response = await callAuthedJson(`/meal-events/${eventId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  }).catch(() => null);

  if (!response?.ok) {
    return {
      error: await readErrorMessage(
        response,
        "Unable to update that meal right now.",
      ),
    };
  }

  revalidatePath("/meal-plan");

  return {
    event: (await response.json()) as MealEvent,
  };
}

export async function deleteMealEventAction(
  eventId: string,
): Promise<{ error?: string }> {
  const response = await callAuthedJson(`/meal-events/${eventId}`, {
    method: "DELETE",
  }).catch(() => null);

  if (!response?.ok) {
    return {
      error: await readErrorMessage(
        response,
        "Unable to delete that meal right now.",
      ),
    };
  }

  revalidatePath("/meal-plan");

  return {};
}

export async function generateMealPlanCartAction(
  input: GenerateMealPlanCartRequest,
): Promise<MealPlanCartActionState> {
  const response = await callAuthedJson("/meal-plans/cart", {
    method: "POST",
    body: JSON.stringify(input),
  }).catch(() => null);

  if (!response?.ok) {
    return {
      error: await readErrorMessage(
        response,
        "Unable to create a cart from this plan.",
      ),
    };
  }

  revalidatePath("/meal-plan");
  revalidatePath("/carts");

  const payload = (await response.json()) as GenerateMealPlanCartResponse;
  return {
    cartId: payload.cart_id ?? payload.resource_id ?? payload.id,
  };
}
