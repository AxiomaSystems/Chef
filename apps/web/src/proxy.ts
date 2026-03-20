import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  ACCESS_TOKEN_COOKIE,
  applyAuthCookies,
  clearAuthCookies,
  fetchSessionProfile,
  REFRESH_TOKEN_COOKIE,
  refreshSession,
} from "./lib/auth";

const HOME_PATH = "/";
const LOGIN_PATH = "/login";
const SIGNUP_PATH = "/signup";
const ONBOARDING_PATH = "/onboarding";
const ACCOUNT_PATH = "/account";

async function hasValidSession(accessToken?: string) {
  if (!accessToken) {
    return false;
  }

  const response = await fetchSessionProfile(accessToken).catch(() => null);
  return response?.ok ?? false;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname !== HOME_PATH &&
    pathname !== LOGIN_PATH &&
    pathname !== SIGNUP_PATH &&
    pathname !== ONBOARDING_PATH &&
    pathname !== ACCOUNT_PATH
  ) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  const sessionIsValid = await hasValidSession(accessToken);

  if (pathname === LOGIN_PATH || pathname === SIGNUP_PATH) {
    if (sessionIsValid) {
      return NextResponse.redirect(new URL(HOME_PATH, request.url));
    }

    if (refreshToken) {
      const tokens = await refreshSession(refreshToken);

      if (tokens) {
        const response = NextResponse.redirect(new URL(HOME_PATH, request.url));
        applyAuthCookies(response.cookies, tokens);
        return response;
      }
    }

    const response = NextResponse.next();

    if (accessToken || refreshToken) {
      clearAuthCookies(response.cookies);
    }

    return response;
  }

  if (sessionIsValid) {
    return NextResponse.next();
  }

  if (refreshToken) {
    const tokens = await refreshSession(refreshToken);

    if (tokens) {
      const response = NextResponse.next();
      applyAuthCookies(response.cookies, tokens);
      return response;
    }
  }

  const response = NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  clearAuthCookies(response.cookies);
  return response;
}

export const config = {
  matcher: ["/", "/login", "/signup", "/onboarding", "/account"],
};
