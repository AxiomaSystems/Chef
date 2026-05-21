# API Security Endpoint Audit - 2026-05-21

## Executive Summary

The NestJS API has a solid base: global DTO validation is enabled, request bodies are whitelisted, AI endpoints mostly use the shared AI rate limiter, and user-owned resources generally filter by `userId` before read/update/delete.

The biggest remaining risks are operational abuse and resource exhaustion, not obvious cross-user data leaks. The main gaps are broad CORS, public Swagger in production, no visible brute-force protection on auth endpoints, permissive URL fetching in recipe capture, high upload/body limits, and several large nested DTOs without array/field caps.

## High Severity

### API-SEC-001: Auth endpoints lack visible brute-force/rate-limit protection

- Location: `apps/api/src/auth/auth.controller.ts:17`, `apps/api/src/auth/auth.controller.ts:23`, `apps/api/src/auth/auth.controller.ts:37`
- Evidence: `register`, `login`, and `refresh` are public POST endpoints with no guard/interceptor/rate limiter visible in app code.
- Impact: Attackers can brute-force passwords, enumerate existing emails through register conflict behavior, or hammer refresh-token verification.
- Fix: Add an auth-specific rate limiter keyed by IP plus normalized email where available. Use stricter limits for login/register, separate limits for refresh.
- Mitigation: If Railway/Vercel/edge already rate-limits these paths, document and verify it. App-level throttling is still recommended.

### API-SEC-002: Recipe URL import can fetch attacker-controlled URLs

- Location: `apps/api/src/capture/dto/create-capture.dto.ts:13`, `apps/api/src/ai/ai.service.ts:199`, `apps/api/src/ai/ai.service.ts:210`
- Evidence: `CreateCaptureDto.url` requires a URL, then `extractRecipeSource` directly calls `fetch(url)` and reads `response.text()`.
- Impact: SSRF-style probing of internal services is possible if deployment networking allows it. Large/slow responses can also hold API workers.
- Fix: Restrict schemes to `https`/`http`, block localhost/private/link-local IPs after DNS resolution, cap fetched bytes, enforce redirect limits, and add short fetch timeouts.
- Mitigation: Keep capture AI rate-limited, but note that AI rate limits do not fully prevent internal network probing.

### API-SEC-003: Large upload and global body limits allow resource exhaustion

- Location: `apps/api/src/main.ts:18`, `apps/api/src/main.ts:19`, `apps/api/src/vision/vision.controller.ts:94`
- Evidence: Global JSON/urlencoded limit is `20mb`; vision media upload allows `100 * 1024 * 1024`.
- Impact: Authenticated users can tie up memory, disk/temp storage, and downstream vision workers. In production this is a cheap DoS vector.
- Fix: Lower default JSON body limit, use route-specific higher limits only for image capture, lower vision media size unless truly needed, and validate MIME type before processing.
- Mitigation: Edge/body limits at Vercel/Railway can help, but app code should still reject oversized input early.

## Medium Severity

### API-SEC-004: CORS is wide open by default

- Location: `apps/api/src/app.setup.ts:14`
- Evidence: `app.enableCors()` is called without an origin allowlist.
- Impact: Any website can call authenticated bearer-token endpoints if it can obtain or trick the browser into using a token. Bearer tokens reduce CSRF risk, but broad CORS increases token exfiltration blast radius and accidental public API use.
- Fix: Configure allowed origins from env, e.g. Vercel app domains, local dev origins, and deployed frontend domain.
- Mitigation: Keep Authorization header bearer-only and avoid cookie auth until CSRF is intentionally handled.

### API-SEC-005: Swagger docs are exposed unconditionally

- Location: `apps/api/src/app.setup.ts:44`
- Evidence: `SwaggerModule.setup('docs', ...)` always runs.
- Impact: Public API shape is easy to enumerate, including beta/admin-ish surfaces. Not critical alone, but useful for attackers.
- Fix: Gate Swagger behind `NODE_ENV !== 'production'`, an env flag, or auth.
- Mitigation: If docs are intentionally public, treat this as accepted and keep examples free of sensitive data.

### API-SEC-006: Several nested write DTOs lack array size and string length caps

- Location: `apps/api/src/recipe/dto/create-recipe.dto.ts:100`, `apps/api/src/recipe/dto/create-recipe.dto.ts:131`, `apps/api/src/recipe/dto/create-recipe.dto.ts:137`
- Location: `apps/api/src/cart/dto/cart-selection.dto.ts:38`, `apps/api/src/cart/dto/update-cart.dto.ts:79`, `apps/api/src/cart/dto/update-cart.dto.ts:110`
- Location: `apps/api/src/user/dto/update-checkout-profile.dto.ts:73`, `apps/api/src/user/dto/update-checkout-profile.dto.ts:79`
- Evidence: These DTOs validate types but do not cap recipe names/descriptions/steps/ingredients, cart selections/dishes, checkout saved addresses, or payment-card arrays.
- Impact: Authenticated users can send very large nested payloads that pass validation and stress validation, serialization, DB writes, and downstream matching.
- Fix: Add `@MaxLength`, `@ArrayMaxSize`, and sensible `@Max` bounds for counts/amounts/servings. Prefer shared constants so UI/backend stay aligned.
- Mitigation: Global body limits help but are too coarse; schema-level limits give better errors and protect DB rows.

### API-SEC-007: Public and authenticated search query params lack DTO validation

- Location: `apps/api/src/ingredients/ingredients.controller.ts:28`, `apps/api/src/cart/cart.controller.ts:264`
- Evidence: `@Query('q') query?: string` and `@Query('query') query: string` are accepted directly, without `@MaxLength`, normalization, or empty-query rejection.
- Impact: Long queries can create expensive DB `contains` scans or third-party retailer API calls/log noise.
- Fix: Use query DTOs with `@MaxLength`, trim, min length where appropriate, and explicit retailer enum validation for route params.
- Mitigation: Existing DB `take: 100` limits output but not input cost.

## Low Severity / Defense In Depth

### API-SEC-008: Security headers are not visible in app setup

- Location: `apps/api/src/app.setup.ts:1`
- Evidence: No `helmet()` or equivalent response header middleware is configured in the Nest/Express app.
- Impact: API responses lack app-level clickjacking/content-sniffing/referrer protections unless the platform adds them.
- Fix: Add Helmet with conservative API-safe defaults. Keep CSP minimal if API-only.
- Mitigation: Verify Vercel/Railway/proxy headers in deployed responses.

### API-SEC-009: OpenAI and external fetches lack explicit abort timeout in provider calls

- Location: `apps/api/src/ai/providers/openai-ai.provider.ts:171`
- Evidence: OpenAI fetch does not pass an `AbortSignal`.
- Impact: Slow upstreams can hold requests for minutes, as seen in local timeout logs.
- Fix: Use `AbortController` with a per-route timeout and convert aborts into controlled 503/504 responses.
- Mitigation: Platform timeouts eventually terminate requests, but user experience and worker usage suffer.

## Existing Strengths

- Global validation uses `whitelist`, `transform`, and `forbidNonWhitelisted` in `apps/api/src/app.setup.ts:16`.
- AI endpoints mostly use `AiRateLimitGuard` and explicit `@AiUsageCategory`.
- Recipes, carts, shopping carts, captures, inventory, and user tags generally include `userId`/owner checks before reads and writes.
- Capture image uploads validate data URL media type and cap payload size at DTO level.

## Recommended Fix Order

1. Add auth rate limiting for register/login/refresh.
2. Lock down URL import fetches with SSRF protections, byte caps, redirects, and timeouts.
3. Configure CORS origins and conditionally expose Swagger.
4. Add DTO caps to recipe/cart/checkout/profile/vision DTOs.
5. Reduce global body/upload limits or make large limits route-specific.
6. Add Helmet/security headers and external fetch abort timeouts.
