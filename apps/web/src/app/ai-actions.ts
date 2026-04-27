"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_TOKEN_COOKIE, buildApiUrl } from "@/lib/auth";

export type ChefChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ChefChatActionState = {
  error?: string;
  message?: string;
  followUpPrompts?: string[];
  safetyNotes?: string[];
};

async function readErrorMessage(response: Response | null, fallback: string) {
  if (!response) return fallback;

  try {
    const payload = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(payload.message)) return payload.message[0] ?? fallback;
    if (typeof payload.message === "string") return payload.message;
  } catch {
    // Use fallback below.
  }

  return fallback;
}

export async function askChefAction(input: {
  message: string;
  history: ChefChatMessage[];
  context?: Record<string, unknown>;
}): Promise<ChefChatActionState> {
  const message = input.message.trim();

  if (!message) {
    return { error: "Ask Chef something first." };
  }

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!accessToken) {
    redirect("/login");
  }

  const response = await fetch(buildApiUrl("/ai/chat"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      history: input.history.slice(-8),
      context: input.context ?? {},
    }),
    cache: "no-store",
  }).catch(() => null);

  if (!response?.ok) {
    return {
      error: await readErrorMessage(response, "Chef is unavailable right now."),
    };
  }

  const payload = (await response.json()) as {
    message?: string;
    follow_up_prompts?: string[];
    safety_notes?: string[];
  };

  return {
    message: payload.message ?? "",
    followUpPrompts: payload.follow_up_prompts ?? [],
    safetyNotes: payload.safety_notes ?? [],
  };
}

