const LOCAL_API_BASE_URL = "http://localhost:3001/api/v1";

function normalizeUrl(value: string, variableName: string) {
  const normalized = value.trim().replace(/\/$/, "");

  try {
    const url = new URL(normalized);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("unsupported protocol");
    }
  } catch {
    throw new Error(`[ENV] ${variableName} must be a valid HTTP(S) URL.`);
  }

  return normalized;
}

export function resolveApiBaseUrl(
  env: Record<string, string | undefined> = process.env,
) {
  const configured = env.API_BASE_URL?.trim();
  const vercelEnvironment = env.VERCEL_ENV?.trim().toLowerCase();
  const isVercelDeployment = env.VERCEL === "1" || Boolean(vercelEnvironment);

  if (!configured) {
    if (isVercelDeployment) {
      throw new Error(
        "[ENV] API_BASE_URL is required for every Vercel deployment. Localhost fallback is local-development only.",
      );
    }

    return LOCAL_API_BASE_URL;
  }

  const apiBaseUrl = normalizeUrl(configured, "API_BASE_URL");

  if (vercelEnvironment === "preview") {
    const productionValue = env.PRODUCTION_API_BASE_URL?.trim();

    if (!productionValue) {
      throw new Error(
        "[ENV] PRODUCTION_API_BASE_URL is required in Vercel Preview to verify API isolation.",
      );
    }

    const productionApiBaseUrl = normalizeUrl(
      productionValue,
      "PRODUCTION_API_BASE_URL",
    );

    if (new URL(apiBaseUrl).origin === new URL(productionApiBaseUrl).origin) {
      throw new Error(
        "[ENV] Vercel Preview cannot use the production API origin.",
      );
    }
  }

  return apiBaseUrl;
}
