"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ACCESS_TOKEN_COOKIE, buildApiUrl } from "@/lib/auth";

export type ProfileActionState = {
  error?: string;
  success?: string;
};

export type PreferencesActionState = {
  error?: string;
  success?: string;
};

export type SecurityActionState = {
  error?: string;
  success?: string;
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
  const preferredCuisineIds = formData
    .getAll("preferred_cuisine_ids")
    .map((value) => String(value));
  const preferredTagIds = formData
    .getAll("preferred_tag_ids")
    .map((value) => String(value));
  const shoppingLocationZipCode = String(
    formData.get("shopping_location_zip_code") ?? "",
  ).trim();
  const shoppingLocationLabel = String(
    formData.get("shopping_location_label") ?? "",
  ).trim();
  const shoppingLocationKrogerLocationId = String(
    formData.get("shopping_location_kroger_location_id") ?? "",
  ).trim();

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
    }),
  }).catch(() => null);

  if (!response?.ok) {
    return {
      error: "Unable to update your preferences right now.",
    };
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
