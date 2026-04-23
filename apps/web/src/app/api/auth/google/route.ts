import { NextResponse } from "next/server";
import {
  applyAuthCookies,
  buildApiUrl,
  type AuthTokens,
} from "@/lib/auth";

type RouteBody = {
  id_token?: unknown;
};

type GoogleAuthTokens = AuthTokens & {
  onboarding_completed_at?: string;
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

  const tokens = (await authResponse.json()) as GoogleAuthTokens;
  const response = NextResponse.json({
    redirectTo: tokens.onboarding_completed_at ? "/dashboard" : "/onboarding",
  });

  applyAuthCookies(response.cookies, tokens);
  return response;
}
