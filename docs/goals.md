# Goals - Preppie

Preppie is being shaped as a campus-first AI cooking companion for young adults.

The definitive product direction is [business_plan.pdf](business_plan.pdf). This document translates that plan into product and engineering goals.

## Product Thesis

Young adults do not struggle because recipes are unavailable. They struggle because cooking requires too much operational work:

```text
find inspiration -> choose a meal -> check pantry -> plan groceries -> cook without getting stuck
```

Preppie should own the connected workflow:

```text
Plan -> Shop -> Cook
```

The product should feel like a personalized AI sous chef that helps users build confidence, not like a static recipe database or generic chatbot.

## Product Definition

Preppie helps college students and young professionals plan, shop, and cook with confidence.

Users should be able to:

- set dietary, preference, household, cooking ability, and shopping context
- save, generate, and import recipes
- organize meals into a plan
- manage pantry and inventory context with low-friction inputs
- identify missing ingredients
- generate grocery/cart support
- cook with contextual, hands-free assistance
- ask for substitutions, repeated steps, timers, and recipe-specific help

## Product Principles

- Protect the Plan -> Shop -> Cook loop.
- Keep the product beginner-friendly for first-time and developing cooks.
- Treat pantry and inventory as useful context, not perfect accounting.
- Make AI outputs editable and reviewable.
- Control AI, voice, and vision costs before scaling premium usage.
- Avoid feature sprawl that does not improve planning, shopping, or cooking confidence.

## Initial Target

Primary audience:

- Gen Z college students and young professionals, ages 18-28
- students in dorms, apartments, and shared housing
- young professionals learning independent meal routines
- beginner and intermediate cooks
- health-conscious users who want structure
- busy users who rely on takeout because cooking feels overwhelming

Launch environment:

- college campuses and nearby student communities
- shared kitchens and roommate contexts
- student organizations, ambassador loops, and live demos

## Current Product Priorities

### 1. PWA Beta Readiness

Preppie should first work as a mobile-friendly Progressive Web App so the team can test quickly without waiting for native app store deployment.

Priority outcomes:

- smooth onboarding
- clear home/navigation model
- fast meal planning flow
- reliable recipe save/import/generation paths
- functional cart and grocery-support flows
- controlled Knox College beta readiness

### 2. Pantry And Inventory Friction

Pantry context is valuable only if updates are easy.

Near-term inputs:

- manual inventory
- voice-to-text pantry capture
- barcode intake
- image/camera-assisted review
- cart-based updates after shopping

Inventory should remain reviewable and forgiving. Exact quantity accounting is not required for early success.

### 3. Hands-Free Cooking

Hands-free cooking is a flagship differentiator, not a distant side quest.

The experience should support:

- asking contextual questions
- repeating steps
- moving between steps
- setting and checking timers
- finding substitutions
- receiving real-time help without touching the phone

### 4. Recipe Import And Generation

Preppie should help users turn scattered inspiration into usable meals.

Important sources:

- text
- URLs
- screenshots/images
- menus
- social-platform content
- creator recipes

Imported/generated content should begin as a reviewable draft, not final truth.

### 5. Usage Limits And Premium Readiness

Before scaling premium, the app needs explicit controls for:

- AI recipe generation
- recipe imports
- voice pantry usage
- hands-free AI cooking
- vision/image flows

Fair-use controls should be product-facing enough to protect margins without making the app feel punitive.

## Roadmap

| Track              | Now: May                                                                                             | Beta Launch: Jun                                       | Growth: Jul                                                    | Expansion: Aug                                                  |
| ------------------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------- | --------------------------------------------------------------- |
| Product            | PWA foundations, onboarding, inventory, recipe generation, cart, meal planning, hands-free base flow | beta testing, tighter UX, feedback loops, bug fixes    | improve meal planning, refine import flows, retention features | native app planning, deeper personalization, community features |
| AI / Vision        | AI generation/import, voice pantry, hands-free assistant, camera scanning prototype                  | cost limits, better prompts, faster hands-free support | vision intake, smarter pantry suggestions                      | advanced contextual agent and vision workflows                  |
| Commerce / Revenue | premium logic, usage limits, pricing model                                                           | Stripe/billing readiness, fair-use rules               | referral rewards, creator recipe packs, partner testing        | grocery partnership exploration and scalable monetization       |
| Operations         | hosting, APIs, database, analytics, admin basics                                                     | monitoring, feedback tools, campus support process     | ambassador playbook, content engine, customer support basics   | campus expansion playbook, stronger analytics and operations    |

## Success Criteria

Preppie is on the right path if:

- users understand the Plan -> Shop -> Cook promise quickly
- beta users can create a meal plan and grocery support without handholding
- users trust pantry/inventory suggestions because they remain editable
- hands-free cooking feels useful during real cooking, not just impressive in a demo
- campus testing produces repeated usage and clear feedback loops
- AI/voice/vision costs stay within controlled usage assumptions
- premium value is understandable at `$7.99/month` or `$59.99/year`

## Not The Goal Right Now

Avoid spending near-term effort on:

- broad social networking
- native app store launch before PWA validation
- direct checkout as the primary product promise
- perfect pantry quantity accounting
- unreviewed automatic pantry mutation from vision
- unlimited AI/voice/vision without cost controls
- internal code renames that risk breaking routes, DTOs, hosting, or analytics before the brand migration is planned
