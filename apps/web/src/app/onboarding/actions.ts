"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_TOKEN_COOKIE, buildApiUrl } from "@/lib/auth";

export type OnboardingActionState = {
  error?: string;
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

export async function savePreferencesAndCompleteAction(
  _previousState: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const preferredCuisineIds = formData
    .getAll("preferred_cuisine_ids")
    .map((value) => String(value));
  const preferredTagIds = formData
    .getAll("preferred_tag_ids")
    .map((value) => String(value));

  const preferencesResponse = await callAuthedJson("/me/preferences", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      preferred_cuisine_ids: preferredCuisineIds,
      preferred_tag_ids: preferredTagIds,
    }),
  }).catch(() => null);

  if (!preferencesResponse?.ok) {
    return {
      error: "Unable to save your preferences right now.",
    };
  }

  const completionResponse = await callAuthedJson("/me/onboarding/complete", {
    method: "POST",
  }).catch(() => null);

  if (!completionResponse?.ok) {
    return {
      error: "Preferences were saved, but onboarding could not be completed.",
    };
  }

  redirect("/");
}

export async function skipOnboardingAction() {
  const completionResponse = await callAuthedJson("/me/onboarding/complete", {
    method: "POST",
  }).catch(() => null);

  if (!completionResponse?.ok) {
    redirect("/onboarding?error=skip-failed");
  }

  redirect("/");
}
