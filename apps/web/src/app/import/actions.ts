"use server";

import type { BaseRecipe, Capture, CreateCaptureRequest } from "@cart/shared";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_TOKEN_COOKIE, buildApiUrl } from "@/lib/auth";

type ApiErrorBody = {
  message?: string | string[];
};

async function readErrorMessage(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as ApiErrorBody | null;

  if (Array.isArray(body?.message)) {
    return body.message[0] ?? fallback;
  }

  return body?.message ?? fallback;
}

async function callAuthedJson(path: string, init?: RequestInit) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!accessToken) {
    redirect("/login");
  }

  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (response.status === 401) {
    redirect("/login");
  }

  return response;
}

export async function createCaptureAction(
  input: CreateCaptureRequest,
): Promise<{ capture?: Capture; error?: string }> {
  const response = await callAuthedJson("/captures", {
    method: "POST",
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    return {
      error: await readErrorMessage(
        response,
        "Preppie could not capture that source right now.",
      ),
    };
  }

  return { capture: (await response.json()) as Capture };
}

export async function saveCaptureAsRecipeAction(
  captureId: string,
): Promise<{ recipe?: BaseRecipe; error?: string }> {
  const response = await callAuthedJson(`/captures/${captureId}/save-recipe`, {
    method: "POST",
  });

  if (!response.ok) {
    return {
      error: await readErrorMessage(
        response,
        "Preppie could not save this capture as a recipe right now.",
      ),
    };
  }

  return { recipe: (await response.json()) as BaseRecipe };
}
