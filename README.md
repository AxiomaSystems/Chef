# Preppie

Preppie helps young adults plan, shop, and cook with confidence through a personalized AI sous chef.

The product connects the everyday cooking loop:

```text
food inspiration -> meal plan -> pantry context -> grocery support -> hands-free cooking help
```

Preppie is built for college students and young professionals who want to cook more often but get stuck between scattered recipe ideas, grocery planning, pantry uncertainty, and cooking anxiety. The repo is still named `cart-generator`, and some internal code/routes still use the earlier Chef name, but product-facing docs should now treat **Preppie** as the source-of-truth brand.

> [!NOTE]
> The definitive product and business source is [docs/business_plan.pdf](docs/business_plan.pdf).

## What Preppie Does

- **Plan**: capture preferences, goals, dietary needs, household context, recipes, and meal plans.
- **Shop**: compare recipes against pantry/inventory context, generate missing-ingredient support, and create grocery/cart workflows.
- **Cook**: guide users through recipes with contextual AI and hands-free cooking support.

Preppie is not just a recipe generator, grocery list, pantry tracker, or generic chatbot. The product promise is the full beginner-friendly Plan -> Shop -> Cook workflow.

## Current Product Foundations

The app already has working foundations for:

- email/password auth and Google login support
- required onboarding and account preferences
- profile memory for cuisines, dietary filters, household size, goals, shopping behavior, and kitchen defaults
- recipe browsing, private recipe creation, and editable saved copies
- recipe capture/import from text and URLs as reviewable drafts
- AI meal generation, recipe structuring, ingredient swaps, and contextual cooking chat
- flexible meal planning with user-owned meal events
- pantry/inventory management with manual, voice, barcode, and camera-oriented foundations
- recipe-to-cart planning and ingredient aggregation
- grocery support through provider boundaries such as Kroger and Instacart handoff
- hands-free cooking mode with voice-oriented cooking support foundations
- shared TypeScript contracts between the web app and NestJS API

Some AI, voice, vision, retailer, and checkout-adjacent flows are still beta/provider-dependent and should not be oversold as final customer-ready behavior.

## Target Market

Preppie’s first users are Gen Z college students and young professionals, roughly ages 18-28.

They are digitally native, comfortable with AI, and already discover food through TikTok, Instagram, screenshots, websites, and notes. They want to eat better, save money, and cook more often, but planning and grocery organization make cooking feel harder than ordering takeout.

Initial launch focus:

- college students in dorms, apartments, and shared kitchens
- young professionals building independent meal routines
- beginner and intermediate cooks
- health-conscious users who want structure
- busy users who need convenience without losing confidence

## Business Model

Preppie uses a freemium model.

Free tier:

- recipe saving
- basic explore/feed behavior
- basic cart generation
- limited AI recipe generation and imports
- limited voice-to-text pantry actions
- guided hands-free trials

Premium tier:

- `$7.99/month` or `$59.99/year`
- advanced planning and personalization
- expanded AI recipe generation/imports with fair-use limits
- full hands-free AI cooking mode
- broader voice, AI, and personalization usage

“Unlimited” features should always be presented with fair-use controls so AI, voice, and vision costs stay predictable.

## Go-To-Market

Preppie launches campus-first because campuses create dense feedback loops, shared kitchens, roommate word-of-mouth, student organizations, and repeat cooking contexts.

Growth phases:

| Phase                       | Focus                                                                       | Goal                                    |
| --------------------------- | --------------------------------------------------------------------------- | --------------------------------------- |
| College campus beta         | QR onboarding, live demos, dorm/apartment cooking sessions, interviews      | Validate product and messaging          |
| Campus growth               | ambassadors, food sampling, org partnerships, referrals, cooking challenges | Improve retention and proof points      |
| Social expansion            | TikTok, Instagram Reels, YouTube Shorts                                     | Scale awareness                         |
| Creator partnerships and PR | micro-influencers, interactive PR boxes, creator recipe challenges          | Build trust and Gen Z adoption          |
| Paid support                | targeted TikTok, Instagram, Google, and recipe-site ads                     | Reach 5,000 active users by end of 2026 |

## Roadmap

Near-term priorities:

- protect the Plan -> Shop -> Cook loop
- prepare the PWA for a controlled Knox College beta launch
- make pantry updates faster through voice, barcode, image, and cart-based updates
- refine hands-free cooking for questions, repeated steps, timers, substitutions, and contextual help
- improve recipe imports from images, links, menus, and social platforms
- add usage limits and fair-use controls before scaling premium AI usage

Development tracks:

| Track              | Now                                                                                   | Beta                                                   | Growth                                       | Expansion                                      |
| ------------------ | ------------------------------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------- | ---------------------------------------------- |
| Product            | PWA foundations, onboarding, inventory, recipes, cart, meal planning, hands-free flow | beta testing, UX fixes, feedback loops                 | improve meal planning and imports            | deeper personalization and community features  |
| AI / Vision        | AI generation/import, voice pantry, hands-free assistant, camera prototype            | cost limits, prompt quality, faster hands-free support | vision intake and smarter pantry suggestions | advanced contextual agent and vision workflows |
| Commerce / Revenue | premium logic, usage limits, pricing model                                            | Stripe/billing readiness and fair-use rules            | referral rewards and creator recipe packs    | grocery partnerships and scalable monetization |
| Operations         | hosting, APIs, database, analytics, admin basics                                      | monitoring, feedback tools, campus support             | ambassador playbook and content engine       | stronger analytics and customer operations     |

## Tech Stack

- **Web**: Next.js, React, TypeScript
- **API**: NestJS, Prisma, PostgreSQL
- **Shared contracts**: workspace package `@cart/shared`
- **AI/provider boundaries**: OpenAI-capable AI provider, retailer providers, cart export providers, vision sidecar support
- **Local infra**: Docker Postgres
- **Deployment path**: Vercel web, Railway/API-oriented backend setup

## Repository Layout

```text
cart-generator/
|-- apps/
|   |-- api/
|   |-- web/
|   |-- mobile/
|   |-- vision-lab/
|   `-- llm-testing/
|-- docs/
|-- infra/
|   `-- docker/
|-- packages/
|   `-- shared/
|-- package.json
|-- pnpm-lock.yaml
`-- pnpm-workspace.yaml
```

## Local Development

Prerequisites:

- Node 22+
- pnpm version from the root `packageManager`
- Docker Desktop for local Postgres
- Python 3.11+ only for optional vision work

First-time setup for web + API:

```powershell
pnpm setup:main
pnpm dev:main
```

Useful commands:

```powershell
pnpm --filter api test -- --runInBand
pnpm -r build
pnpm --filter web lint
pnpm --filter api prisma:generate
pnpm --dir apps/api exec prisma migrate deploy
```

Local URLs:

- Web: `http://localhost:3000`
- API: `http://localhost:3001`
- Swagger: `http://localhost:3001/docs`

See [local-dev-setup.md](local-dev-setup.md) for env and database details.

## Documentation

Start here:

- [docs/business_plan.pdf](docs/business_plan.pdf) - definitive product and business plan
- [docs/business.md](docs/business.md) - Markdown business summary derived from the plan
- [docs/goals.md](docs/goals.md) - current product goals and roadmap
- [docs/FEATURES.md](docs/FEATURES.md) - customer-facing feature inventory
- [docs/architecture.md](docs/architecture.md) - technical system architecture
- [docs/models.md](docs/models.md) - shared/API domain model map
- [docs/future-preppie-brand-transition.md](docs/future-preppie-brand-transition.md) - naming transition notes for internal Chef references

## Current Gaps

- Full social-media ingestion is not complete.
- Vision-assisted pantry updates are still review-first and beta.
- Native app distribution is not the current launch path; the near-term product is a mobile-friendly PWA.
- Direct retailer checkout is not the primary supported flow.
- AI, voice, and vision usage need strict fair-use controls before broad premium scale.
- Internal Chef naming remains in routes, DTOs, code, and some technical docs until a coordinated rename is planned.
