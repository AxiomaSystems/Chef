import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_TOKEN_COOKIE, buildApiUrl } from "./auth";

type ApiErrorBody = {
  message?: string | string[];
};

export type Loadable<T> = {
  ok: boolean;
  data: T;
  error?: string;
  status?: number;
};

async function readErrorMessage(response: Response) {
  const body = (await response.json().catch(() => null)) as ApiErrorBody | null;

  if (Array.isArray(body?.message)) {
    return body.message.join(", ");
  }

  return body?.message ?? `Request failed with ${response.status}`;
}

export async function fetchCollection<T>(
  path: string,
): Promise<Loadable<T[]>> {
  try {
    const response = await fetch(buildApiUrl(path), {
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        ok: false,
        data: [],
        error: await readErrorMessage(response),
        status: response.status,
      };
    }

    return {
      ok: true,
      data: (await response.json()) as T[],
      status: response.status,
    };
  } catch (error) {
    return {
      ok: false,
      data: [],
      error:
        error instanceof Error ? error.message : "Unknown network failure",
    };
  }
}

export async function fetchAuthedCollection<T>(
  path: string,
): Promise<Loadable<T[]>> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!accessToken) {
    redirect("/login");
  }

  try {
    const response = await fetch(buildApiUrl(path), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (response.status === 401) {
      redirect("/login");
    }

    if (!response.ok) {
      return {
        ok: false,
        data: [],
        error: await readErrorMessage(response),
        status: response.status,
      };
    }

    return {
      ok: true,
      data: (await response.json()) as T[],
      status: response.status,
    };
  } catch (error) {
    if (error instanceof Error && "digest" in error) throw error;
    return {
      ok: false,
      data: [],
      error:
        error instanceof Error ? error.message : "Unknown network failure",
    };
  }
}

export async function fetchAuthedResource<T>(
  path: string,
): Promise<Loadable<T | null>> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!accessToken) {
    redirect("/login");
  }

  try {
    const response = await fetch(buildApiUrl(path), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (response.status === 401) {
      redirect("/login");
    }

    if (!response.ok) {
      return {
        ok: false,
        data: null,
        error: await readErrorMessage(response),
        status: response.status,
      };
    }

    return {
      ok: true,
      data: (await response.json()) as T,
      status: response.status,
    };
  } catch (error) {
    if (error instanceof Error && "digest" in error) throw error;
    return {
      ok: false,
      data: null,
      error:
        error instanceof Error ? error.message : "Unknown network failure",
    };
  }
}
