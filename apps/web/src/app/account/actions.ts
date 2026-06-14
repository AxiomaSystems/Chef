"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ACCESS_TOKEN_COOKIE, buildApiUrl } from "@/lib/auth";
import type { UpdateUserProfileMemoryRequest } from "@cart/shared";

export type ProfileActionState = {
  error?: string;
  success?: string;
};

export type PreferencesActionState = {
  error?: string;
  success?: string;
};

export type CheckoutProfileActionState = {
  error?: string;
  success?: string;
};

export type SecurityActionState = {
  error?: string;
  success?: string;
};

function parseOptionalNumber(formData: FormData, name: string) {
  const value = String(formData.get(name) ?? "").trim();
  if (!value) {
    return undefined;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function parseOptionalString(formData: FormData, name: string) {
  const value = String(formData.get(name) ?? "").trim();
  return value || undefined;
}

function parseStringArray(formData: FormData, name: string) {
  return formData
    .getAll(name)
    .map((value) => String(value).trim())
    .filter(Boolean);
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

export async function updateProfileAction(
  _previousState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return {
      error: "Name is required.",
    };
  }

  const response = await callAuthedJson("/me", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  }).catch(() => null);

  if (!response?.ok) {
    return {
      error: "Unable to update your profile right now.",
    };
  }

  revalidatePath("/");
  revalidatePath("/account");
  revalidatePath("/account/settings/overview");

  return {
    success: "Profile updated.",
  };
}

export async function updatePreferencesAction(
  _previousState: PreferencesActionState,
  formData: FormData,
): Promise<PreferencesActionState> {
  const preferredCuisineIds = parseStringArray(
    formData,
    "preferred_cuisine_ids",
  );
  const preferredTagIds = parseStringArray(formData, "preferred_tag_ids");
  const shoppingLocationZipCode = String(
    formData.get("shopping_location_zip_code") ?? "",
  ).trim();
  const shoppingLocationLabel = String(
    formData.get("shopping_location_label") ?? "",
  ).trim();
  const shoppingLocationKrogerLocationId = String(
    formData.get("shopping_location_kroger_location_id") ?? "",
  ).trim();
  const customCuisineLabels = parseStringArray(
    formData,
    "custom_cuisine_labels",
  );
  const customDietaryLabels = parseStringArray(
    formData,
    "custom_dietary_labels",
  );
  const weeklyNutritionTargets = {
    calories: parseOptionalNumber(formData, "weekly_target_calories"),
    protein_g: parseOptionalNumber(formData, "weekly_target_protein_g"),
    carbs_g: parseOptionalNumber(formData, "weekly_target_carbs_g"),
    fat_g: parseOptionalNumber(formData, "weekly_target_fat_g"),
  };

  const response = await callAuthedJson("/me/preferences", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      preferred_cuisine_ids: preferredCuisineIds,
      preferred_tag_ids: preferredTagIds,
      shopping_location: {
        zip_code: shoppingLocationZipCode,
        label: shoppingLocationLabel,
        kroger_location_id: shoppingLocationKrogerLocationId,
      },
      household_size: parseOptionalString(formData, "household_size"),
      kids_profile: parseOptionalString(formData, "kids_profile"),
      favorite_proteins: parseStringArray(formData, "favorite_proteins"),
      favorite_flavors: parseStringArray(formData, "favorite_flavors"),
      spice_level: parseOptionalString(formData, "spice_level"),
      disliked_ingredients: parseStringArray(formData, "disliked_ingredients"),
      disliked_textures: parseStringArray(formData, "disliked_textures"),
      cooking_skill_level: parseOptionalString(formData, "cooking_skill_level"),
      available_appliances: parseStringArray(formData, "available_appliances"),
      preferred_cooking_time: parseOptionalString(
        formData,
        "preferred_cooking_time",
      ),
      typical_meal_times: parseStringArray(formData, "typical_meal_times"),
      goal_priorities: parseStringArray(formData, "goal_priorities"),
      calorie_tracking_mode: parseOptionalString(
        formData,
        "calorie_tracking_mode",
      ),
      weekly_nutrition_targets: weeklyNutritionTargets,
      weekly_budget: parseOptionalString(formData, "weekly_budget"),
      preferred_stores: parseStringArray(formData, "preferred_stores"),
      shopping_mode: parseOptionalString(formData, "shopping_mode"),
      recipe_discovery_sources: parseStringArray(
        formData,
        "recipe_discovery_sources",
      ),
      biggest_cooking_frustration: parseOptionalString(
        formData,
        "biggest_cooking_frustration",
      ),
      ai_planning_optimization: parseOptionalString(
        formData,
        "ai_planning_optimization",
      ),
    }),
  }).catch(() => null);

  if (!response?.ok) {
    return {
      error: "Unable to update your preferences right now.",
    };
  }

  if (customCuisineLabels.length > 0 || customDietaryLabels.length > 0) {
    const uniqueCustomCuisines = Array.from(new Set(customCuisineLabels));
    const uniqueCustomDietaryLabels = Array.from(new Set(customDietaryLabels));
    const profileMemoryPayload: UpdateUserProfileMemoryRequest = {
      food_rules: [
        ...uniqueCustomCuisines.map((label) => ({
          kind: "ingredient_preference" as const,
          label: `Loves ${label} cuisine`,
          action: "prefer" as const,
          strictness: "soft" as const,
          active: true,
          source: "manual" as const,
          confidence: "high" as const,
        })),
        ...uniqueCustomDietaryLabels.map((label) => ({
          kind: "dietary_constraint" as const,
          label,
          action: "avoid" as const,
          strictness: "hard" as const,
          active: true,
          source: "manual" as const,
          confidence: "high" as const,
        })),
      ],
    };

    const profileMemoryResponse = await callAuthedJson("/me/profile-memory", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(profileMemoryPayload),
    }).catch(() => null);

    if (!profileMemoryResponse?.ok) {
      return {
        error:
          "Preferences updated, but the custom profile memory could not be saved.",
      };
    }
  }

  revalidatePath("/");
  revalidatePath("/account");
  revalidatePath("/account/settings/preferences");

  return {
    success: "Preferences updated.",
  };
}

export async function changePasswordAction(
  _previousState: SecurityActionState,
  formData: FormData,
): Promise<SecurityActionState> {
  const currentPassword = String(formData.get("current_password") ?? "");
  const newPassword = String(formData.get("new_password") ?? "");

  if (!currentPassword || !newPassword) {
    return {
      error: "Current password and new password are required.",
    };
  }

  const response = await callAuthedJson("/me/password/change", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  }).catch(() => null);

  if (!response?.ok) {
    if (response?.status === 401) {
      return {
        error: "Current password is incorrect.",
      };
    }

    return {
      error: "Unable to change your password right now.",
    };
  }

  revalidatePath("/account");
  revalidatePath("/account/settings/security");

  return {
    success: "Password updated.",
  };
}

export async function setPasswordAction(
  _previousState: SecurityActionState,
  formData: FormData,
): Promise<SecurityActionState> {
  const newPassword = String(formData.get("new_password") ?? "");

  if (!newPassword) {
    return {
      error: "A new password is required.",
    };
  }

  const response = await callAuthedJson("/me/password/set", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      new_password: newPassword,
    }),
  }).catch(() => null);

  if (!response?.ok) {
    return {
      error: "Unable to set a password right now.",
    };
  }

  revalidatePath("/account");
  revalidatePath("/account/settings/overview");
  revalidatePath("/account/settings/security");

  return {
    success: "Password added to this account.",
  };
}

export async function updateCheckoutProfileAction(payload: {
  saved_addresses: Array<{
    id: string;
    label: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    isDefault: boolean;
  }>;
  payment_cards: Array<{
    id: string;
    cardType: "Visa" | "Mastercard" | "Amex" | "Discover";
    lastFour: string;
    expiry: string;
    name: string;
    isDefault: boolean;
  }>;
}): Promise<CheckoutProfileActionState> {
  const response = await callAuthedJson("/me/checkout-profile", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }).catch(() => null);

  if (!response?.ok) {
    return {
      error: "Unable to save your checkout details right now.",
    };
  }

  revalidatePath("/account");
  revalidatePath("/account/settings/payment");
  revalidatePath("/shopping");

  return {
    success: "Checkout details updated.",
  };
}
