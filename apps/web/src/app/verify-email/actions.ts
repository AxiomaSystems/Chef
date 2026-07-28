"use server";

import { redirect } from "next/navigation";
import { buildApiUrl } from "@/lib/auth";

export async function verifyEmailAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  if (!token) {
    redirect("/login?verification=invalid");
  }

  const response = await fetch(buildApiUrl("/auth/email-verifications"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
    cache: "no-store",
  }).catch(() => null);

  redirect(response?.ok ? "/login?verified=1" : "/login?verification=invalid");
}
