import type { User } from "@cart/shared";
import { NextResponse } from "next/server";
import {
  applyAuthCookies,
  buildApiUrl,
  fetchSessionProfile,
  type AuthTokens,
} from "@/lib/auth";

type RouteBody = {
  id_token?: unknown;
};

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as RouteBody | null;
  const idToken = typeof body?.id_token === "string" ? body.id_token : "";

  if (!idToken) {
    return errorResponse("Missing Google credential.", 400);
  }

  const authResponse = await fetch(buildApiUrl("/auth/google"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id_token: idToken,
    }),
    cache: "no-store",
  }).catch(() => null);

  if (!authResponse) {
    return errorResponse("Unable to reach the API.", 502);
  }

  if (!authResponse.ok) {
    return errorResponse("Unable to continue with Google right now.", 401);
  }

  const tokens = (await authResponse.json()) as AuthTokens;
  const profileResponse = await fetchSessionProfile(tokens.access_token).catch(
    () => null,
  );

  if (!profileResponse?.ok) {
    return errorResponse("Unable to load the signed-in profile.", 502);
  }

  const me = (await profileResponse.json()) as User;
  const response = NextResponse.json({
    redirectTo: me.onboarding_completed_at ? "/" : "/onboarding",
  });

  applyAuthCookies(response.cookies, tokens);
  return response;
}
