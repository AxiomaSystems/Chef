"use server";

import { redirect } from "next/navigation";
import { buildApiUrl } from "@/lib/auth";

export type ResetPasswordState = { error?: string };

export async function resetPasswordAction(
  _state: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!token || password.length < 8) {
    return { error: "Use a password with at least 8 characters." };
  }

  const response = await fetch(buildApiUrl("/auth/password-resets"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
    cache: "no-store",
  }).catch(() => null);

  if (!response?.ok) {
    return { error: "This reset link is invalid or expired." };
  }

  redirect("/login?password-reset=complete");
}
