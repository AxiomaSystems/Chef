"use server";

import { redirect } from "next/navigation";
import { buildApiUrl } from "@/lib/auth";

export type SignupActionState = {
  error?: string;
};

export async function signupAction(
  _previousState: SignupActionState,
  formData: FormData,
): Promise<SignupActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || !password) {
    return {
      error: "Name, email, and password are required.",
    };
  }

  try {
    const response = await fetch(buildApiUrl("/auth/register"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        email,
        password,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        error: "Unable to create your account right now.",
      };
    }
  } catch {
    return {
      error: "Unable to reach the API.",
    };
  }

  redirect("/verify-email-sent");
}
