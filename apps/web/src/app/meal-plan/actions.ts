"use server";

import type { MealPlan, MealPlanDay } from "@cart/shared";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_TOKEN_COOKIE, buildApiUrl } from "@/lib/auth";

type MealPlanActionState = {
  error?: string;
  mealPlan?: MealPlan;
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
  weekStart: string,
): Promise<MealPlanActionState> {
  const params = new URLSearchParams({ week_start: weekStart.trim() });
  const response = await callAuthedJson(`/meal-plans?${params.toString()}`).catch(
    () => null,
  );

  if (!response?.ok) {
    return {
      error: await readErrorMessage(
        response,
        "Unable to load this meal plan right now.",
      ),
    };
  }

  return {
    mealPlan: (await response.json()) as MealPlan,
  };
}

export async function saveMealPlanAction(
  weekStart: string,
  days: MealPlanDay[],
): Promise<MealPlanActionState> {
  const params = new URLSearchParams({ week_start: weekStart.trim() });
  const response = await callAuthedJson(`/meal-plans?${params.toString()}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ days }),
  }).catch(() => null);

  if (!response?.ok) {
    return {
      error: await readErrorMessage(
        response,
        "Unable to save this meal plan right now.",
      ),
    };
  }

  revalidatePath("/meal-plan");

  return {
    mealPlan: (await response.json()) as MealPlan,
  };
}
