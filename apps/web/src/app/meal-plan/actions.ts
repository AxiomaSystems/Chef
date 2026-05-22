"use server";

import type {
  CreateMealEventRequest,
  CreateMealPlanCartRequest,
  CreateMealPlanCartResponse,
  MealEventWithRecipe,
  MealPlanRange,
  UpdateMealEventRequest,
} from "@cart/shared";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_TOKEN_COOKIE, buildApiUrl } from "@/lib/auth";

type MealPlanActionState = {
  error?: string;
  mealPlan?: MealPlanRange;
};

type MealEventActionState = {
  error?: string;
  event?: MealEventWithRecipe;
};

type MealPlanCartActionState = {
  error?: string;
  result?: CreateMealPlanCartResponse;
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
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
}

export async function getMealPlanAction(
  from: string,
  to: string,
): Promise<MealPlanActionState> {
  const params = new URLSearchParams({
    from: from.trim(),
    to: to.trim(),
  });
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
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  }).catch(() => null);

  if (!response?.ok) {
    return {
      error: await readErrorMessage(response, "Unable to add this meal."),
    };
  }

  revalidatePath("/meal-plan");

  return {
    event: (await response.json()) as MealEventWithRecipe,
  };
}

export async function updateMealEventAction(
  id: string,
  input: UpdateMealEventRequest,
): Promise<MealEventActionState> {
  const response = await callAuthedJson(`/meal-events/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  }).catch(() => null);

  if (!response?.ok) {
    return {
      error: await readErrorMessage(response, "Unable to update this meal."),
    };
  }

  revalidatePath("/meal-plan");

  return {
    event: (await response.json()) as MealEventWithRecipe,
  };
}

export async function deleteMealEventAction(id: string): Promise<{
  error?: string;
}> {
  const response = await callAuthedJson(`/meal-events/${id}`, {
    method: "DELETE",
  }).catch(() => null);

  if (!response?.ok) {
    return {
      error: await readErrorMessage(response, "Unable to remove this meal."),
    };
  }

  revalidatePath("/meal-plan");

  return {};
}

export async function createMealPlanCartAction(
  input: CreateMealPlanCartRequest,
): Promise<MealPlanCartActionState> {
  const response = await callAuthedJson("/meal-plans/cart", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  }).catch(() => null);

  if (!response?.ok) {
    return {
      error: await readErrorMessage(
        response,
        "Unable to generate this cart from the meal plan.",
      ),
    };
  }

  revalidatePath("/meal-plan");
  revalidatePath("/carts");

  return {
    result: (await response.json()) as CreateMealPlanCartResponse,
  };
}
