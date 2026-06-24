# Preppie Brand Transition Notes

Preppie is now the product-facing brand. `business_plan.pdf` is the source of truth for product positioning, pricing, go-to-market, and roadmap.

The codebase still contains internal Chef naming in routes, DTOs, packages, copy, docs, and deployment references. Do not rename those casually. Product-facing docs and public-facing copy should use Preppie, while internal technical names should remain stable until a coordinated migration is planned.

## Use Preppie Now

- README and product-facing docs.
- Website/app copy intended for screenshots or customer demos.
- Business, GTM, pricing, roadmap, and customer-facing feature descriptions.
- Brand references such as the AI sous chef and parrot mascot.

## Keep Existing Internal Names For Now

- Backend/API public strings that are tied to existing contracts.
- Routes such as `/chef-ai` until redirects, navigation, analytics, screenshots, and docs are updated.
- Shared types such as Chef memory DTOs unless frontend/backend code changes together.
- Lab packages such as `chef_llm` and `chef_vision`.
- Hosting/repository references such as `AxiomaSystems/Chef` until deploy settings are ready.
- App/PWA/mobile icons, manifests, service-worker names, and deployed asset paths until cache and platform behavior are checked.

## Migration Rule

When a doc describes the product, say Preppie.

When a doc describes current code, routes, DTOs, database fields, package names, or deployment settings, use the current technical name and explain that it is an internal legacy name when needed.

## Later Coordinated Rename

A deeper rename should include:

- API routes and Swagger copy audit
- frontend route/nav redirect plan
- shared DTO/type rename plan
- deployment and environment variable review
- app metadata, manifest, icon, and service-worker cache review
- search pass through docs, code, screenshots, and seeded data
