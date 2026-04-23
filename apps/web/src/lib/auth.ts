export type AuthTokens = {
  access_token: string;
  refresh_token: string;
  expires_in: string;
};

export const API_BASE_URL =
  process.env.API_BASE_URL ?? "http://localhost:3001/api/v1";

export const ACCESS_TOKEN_COOKIE = "cg_access_token";
export const REFRESH_TOKEN_COOKIE = "cg_refresh_token";

const REFRESH_TOKEN_EXPIRES_IN_DAYS = Number.parseInt(
  process.env.AUTH_REFRESH_TOKEN_EXPIRES_IN_DAYS ?? "30",
  10,
);

const IS_PRODUCTION = process.env.NODE_ENV === "production";

type CookieStoreLike = {
  set: (name: string, value: string, options?: CookieOptions) => void;
  delete: (name: string) => void;
};

type CookieOptions = {
  httpOnly?: boolean;
  sameSite?: "lax" | "strict" | "none";
  secure?: boolean;
  path?: string;
  maxAge?: number;
};

export function buildApiUrl(path: string) {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function parseExpiresInSeconds(value: string) {
  const match = /^(\d+)([smhd])$/i.exec(value.trim());

  if (!match) {
    return undefined;
  }

  const amount = Number.parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case "s":
      return amount;
    case "m":
      return amount * 60;
    case "h":
      return amount * 60 * 60;
    case "d":
      return amount * 60 * 60 * 24;
    default:
      return undefined;
  }
}

function getAccessCookieOptions(expiresIn: string): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: IS_PRODUCTION,
    path: "/",
    maxAge: parseExpiresInSeconds(expiresIn),
  };
}

function getRefreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: IS_PRODUCTION,
    path: "/",
    maxAge: REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60,
  };
}

export function applyAuthCookies(store: CookieStoreLike, tokens: AuthTokens) {
  store.set(
    ACCESS_TOKEN_COOKIE,
    tokens.access_token,
    getAccessCookieOptions(tokens.expires_in),
  );
  store.set(
    REFRESH_TOKEN_COOKIE,
    tokens.refresh_token,
    getRefreshCookieOptions(),
  );
}

export function clearAuthCookies(store: CookieStoreLike) {
  store.delete(ACCESS_TOKEN_COOKIE);
  store.delete(REFRESH_TOKEN_COOKIE);
}

export async function fetchSessionProfile(accessToken: string) {
  return fetch(buildApiUrl("/me"), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });
}

export async function refreshSession(refreshToken: string) {
  try {
    const response = await fetch(buildApiUrl("/auth/refresh"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refresh_token: refreshToken,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as AuthTokens;
  } catch {
    return null;
  }
}
