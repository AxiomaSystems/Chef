"use server";

import { buildApiUrl } from "@/lib/auth";

export type ForgotPasswordState = { submitted?: boolean; error?: string };

export async function requestPasswordResetAction(
  _state: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email) return { error: "Enter your email address." };

  const response = await fetch(buildApiUrl("/auth/password-reset-requests"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
    cache: "no-store",
  }).catch(() => null);

  if (!response?.ok) {
    return { error: "Unable to request a reset right now." };
  }

  return { submitted: true };
}
