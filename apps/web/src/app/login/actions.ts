"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { applyAuthCookies, buildApiUrl } from "@/lib/auth";

export type LoginActionState = {
  error?: string;
};

export async function loginAction(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return {
      error: "Email and password are required.",
    };
  }

  try {
    const response = await fetch(buildApiUrl("/auth/login"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        code?: string;
        message?: string;
      } | null;

      if (
        response.status === 403 &&
        payload?.code === "email_verification_required"
      ) {
        return {
          error: "Verify your email before signing in.",
        };
      }

      if (response.status === 401) {
        return {
          error: "Invalid email or password.",
        };
      }

      return {
        error: "Unable to sign in right now.",
      };
    }

    const tokens = (await response.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: string;
    };

    const cookieStore = await cookies();
    applyAuthCookies(cookieStore, tokens);
  } catch {
    return {
      error: "Unable to reach the API.",
    };
  }

  redirect("/dashboard");
}
