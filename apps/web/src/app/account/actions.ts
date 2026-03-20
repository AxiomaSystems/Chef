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

  const response = await callAuthedJson("/me/preferences", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      preferred_cuisine_ids: preferredCuisineIds,
      preferred_tag_ids: preferredTagIds,
    }),
  }).catch(() => null);

  if (!response?.ok) {
    return {
      error: "Unable to update your preferences right now.",
    };
  }

  revalidatePath("/");
  revalidatePath("/account");

  return {
    success: "Preferences updated.",
  };
}
