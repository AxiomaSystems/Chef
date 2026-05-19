export type AiRateLimitScope = "user" | "ip";

export type AiRateLimitSnapshot = {
  scope: AiRateLimitScope;
  window_ms: number;
  max_requests: number;
  used: number;
  remaining: number;
  reset_at: string | null;
  reset_in_seconds: number | null;
};

export type AiLimitsStatus = {
  provider: string;
  model: string | null;
  openai_configured: boolean;
  rate_limit: AiRateLimitSnapshot;
};
