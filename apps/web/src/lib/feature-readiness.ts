import { resolveApiBaseUrl } from "./runtime-env.ts";

export type WebFeatureStatus = "ready" | "disabled" | "misconfigured";

export type WebCapabilityReadiness = {
  status: WebFeatureStatus;
  environment: string[];
};

export type WebFeatureReadiness = {
  environment: {
    name: string;
  };
  api: WebCapabilityReadiness;
  voice: {
    status: WebFeatureStatus;
    capabilities: {
      conversationalAgent: WebCapabilityReadiness;
      speechToText: WebCapabilityReadiness;
      textToSpeech: WebCapabilityReadiness;
    };
  };
};

function isConfigured(value: string | undefined) {
  return Boolean(value?.trim());
}

function getHostedEnvironmentName(env: NodeJS.ProcessEnv) {
  const vercelEnvironment = env.VERCEL_ENV?.trim().toLowerCase();
  if (vercelEnvironment) return vercelEnvironment;

  const deploymentEnvironment =
    env.DEPLOYMENT_ENVIRONMENT?.trim().toLowerCase();
  if (deploymentEnvironment && deploymentEnvironment !== "local") {
    return deploymentEnvironment;
  }

  return env.VERCEL === "1" ? "vercel" : undefined;
}

function isHostedDeployment(env: NodeJS.ProcessEnv) {
  return getHostedEnvironmentName(env) !== undefined;
}

function getEnvironmentName(env: NodeJS.ProcessEnv) {
  return getHostedEnvironmentName(env) ?? "local";
}

function isIpv4Loopback(hostname: string) {
  const octets = hostname.split(".");

  return (
    octets.length === 4 &&
    octets.every((octet) => /^\d{1,3}$/.test(octet)) &&
    Number(octets[0]) === 127
  );
}

function parseIpv6Segments(hostname: string) {
  const address = hostname.slice(1, -1);
  const [left, right] = address.split("::");
  const leftSegments = left ? left.split(":") : [];
  const rightSegments = right ? right.split(":") : [];
  const omittedSegments = 8 - leftSegments.length - rightSegments.length;
  const segments = [
    ...leftSegments,
    ...Array.from({ length: omittedSegments }, () => "0"),
    ...rightSegments,
  ].map((segment) => Number.parseInt(segment, 16));

  return segments.length === 8 && segments.every(Number.isInteger)
    ? segments
    : null;
}

function isIpv6Loopback(hostname: string) {
  const segments = parseIpv6Segments(hostname);

  if (!segments) return false;

  const isIpv6Loopback =
    segments.slice(0, 7).every((segment) => segment === 0) && segments[7] === 1;
  const isIpv4MappedLoopback =
    segments.slice(0, 5).every((segment) => segment === 0) &&
    segments[5] === 0xffff &&
    segments[6] >> 8 === 127;

  return isIpv6Loopback || isIpv4MappedLoopback;
}

function isHostedApiUrlSafe(apiBaseUrl: string) {
  const url = new URL(apiBaseUrl);
  const hostname = url.hostname.toLowerCase().replace(/\.+$/, "");
  const isLocalhost =
    hostname === "localhost" ||
    isIpv4Loopback(hostname) ||
    (hostname.startsWith("[") &&
      hostname.endsWith("]") &&
      isIpv6Loopback(hostname));

  return url.protocol === "https:" && !isLocalhost;
}

function getApiReadiness(env: NodeJS.ProcessEnv): WebCapabilityReadiness {
  try {
    const apiBaseUrl = resolveApiBaseUrl(env);

    return {
      status:
        isHostedDeployment(env) &&
        (!isConfigured(env.API_BASE_URL) || !isHostedApiUrlSafe(apiBaseUrl))
          ? "misconfigured"
          : "ready",
      environment: ["API_BASE_URL"],
    };
  } catch {
    return {
      status: "misconfigured",
      environment: ["API_BASE_URL"],
    };
  }
}

export function getWebFeatureReadiness(
  env: NodeJS.ProcessEnv = process.env,
): WebFeatureReadiness {
  const hasApiKey = isConfigured(env.ELEVENLABS_API_KEY);
  const hasServerAgentId = isConfigured(env.ELEVENLABS_AGENT_ID);
  const hasPublicAgentId = isConfigured(env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID);
  const hasVoiceId = isConfigured(env.ELEVENLABS_VOICE_ID);
  const conversationalAgentEnabled = hasServerAgentId || hasPublicAgentId;

  const conversationalAgent: WebCapabilityReadiness = {
    status: conversationalAgentEnabled
      ? hasServerAgentId && hasPublicAgentId && hasApiKey
        ? "ready"
        : "misconfigured"
      : "disabled",
    environment: [
      "ELEVENLABS_AGENT_ID",
      "NEXT_PUBLIC_ELEVENLABS_AGENT_ID",
      "ELEVENLABS_API_KEY",
    ],
  };
  const speechToText: WebCapabilityReadiness = {
    status: hasApiKey ? "ready" : "disabled",
    environment: ["ELEVENLABS_API_KEY"],
  };
  const textToSpeech: WebCapabilityReadiness = {
    status: hasVoiceId ? (hasApiKey ? "ready" : "misconfigured") : "disabled",
    environment: ["ELEVENLABS_API_KEY", "ELEVENLABS_VOICE_ID"],
  };
  const voiceCapabilities = [conversationalAgent, speechToText, textToSpeech];
  const voiceStatus: WebFeatureStatus = voiceCapabilities.some(
    (capability) => capability.status === "misconfigured",
  )
    ? "misconfigured"
    : voiceCapabilities.some((capability) => capability.status === "ready")
      ? "ready"
      : "disabled";

  return {
    environment: { name: getEnvironmentName(env) },
    api: getApiReadiness(env),
    voice: {
      status: voiceStatus,
      capabilities: {
        conversationalAgent,
        speechToText,
        textToSpeech,
      },
    },
  };
}

export function validateWebEnvironment(env: NodeJS.ProcessEnv = process.env) {
  const errors: string[] = [];
  let apiBaseUrl: string | undefined;

  if (isHostedDeployment(env) && !isConfigured(env.API_BASE_URL)) {
    errors.push("[ENV] API_BASE_URL is required in hosted deployments.");
  }

  try {
    apiBaseUrl = resolveApiBaseUrl(env);
  } catch (error) {
    errors.push(
      error instanceof Error ? error.message : "[ENV] Invalid API_BASE_URL.",
    );
  }

  if (
    isHostedDeployment(env) &&
    isConfigured(env.API_BASE_URL) &&
    apiBaseUrl &&
    !isHostedApiUrlSafe(apiBaseUrl)
  ) {
    errors.push(
      "[ENV] API_BASE_URL must use HTTPS and must not target loopback addresses in hosted deployments.",
    );
  }

  if (isHostedDeployment(env)) {
    const { voice } = getWebFeatureReadiness(env);

    if (voice.capabilities.conversationalAgent.status === "misconfigured") {
      errors.push(
        "[ENV] Conversational voice requires ELEVENLABS_AGENT_ID, NEXT_PUBLIC_ELEVENLABS_AGENT_ID, and ELEVENLABS_API_KEY when enabled.",
      );
    }

    if (voice.capabilities.textToSpeech.status === "misconfigured") {
      errors.push(
        "[ENV] Text-to-speech requires ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID when enabled.",
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }
}
