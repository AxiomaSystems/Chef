# Chef Demo Plan

Target window: April 24-25, 2026

This document is for the engineering team preparing the upcoming Chef demo. The goal is not to present a finished product. The goal is to show a working vertical slice, collect targeted feedback, and decide what the next sprint should harden.

## Demo Principle

Chef should be demoed as an AI-powered meal execution platform, not as a recipe catalog or generic grocery list.

The story for this demo:

```text
I want to cook something -> Chef helps me plan it -> Chef turns it into ingredients -> Chef turns those ingredients into real grocery products -> I can edit and save the result.
```

We should demo only what we want feedback on. Anything that is not part of that story should either be hidden, treated as internal plumbing, or explicitly marked as future scope.

## Team Ownership

- Galgallo Roba Waqo: Agentic AI, computer vision, AI integration, future model/tooling architecture.
- Tioluwani Enoch: Frontend engineering, future production UI direction, user-flow polish.
- Piero Postigo Rocchetti: Backend engineering, data model, API contracts, retailer providers, persistence.

## Recommended Branch Strategy

Creating a branch for the demo is a good practice if it is treated as a short-lived stabilization branch.

Recommended branch name:

```bash
demo/2026-04-chef-vertical-slice
```

Avoid a generic long-lived `demo` branch. A branch named only `demo` tends to become ambiguous over time and can collect one-off hacks. A dated demo branch makes it clear that this is a temporary integration branch for one specific demo.

Suggested rules:

- Keep `main` clean.
- Merge only demo-ready work into the demo branch.
- Use the demo branch to stabilize, seed data, fix blocking bugs, and rehearse.
- Do not use the demo branch as a dumping ground for speculative features.
- After the demo, either merge the useful changes back through normal PRs or delete the branch.

## Demo Goal

Validate whether the core Chef wedge is understandable and compelling:

```text
meal planning + ingredient aggregation + real retailer matching + editable shopping/cart handoff
```

The demo should answer:

- Does the user understand what Chef is for within 30 seconds?
- Does the recipe-to-cart flow feel useful enough to continue building?
- Does the retailer output feel real, even when product matching is imperfect?
- Does manual shopping-cart editing make matching errors acceptable?
- What should AI own next: recipe generation, recipe editing, ingredient normalization, or pantry awareness?
- Does Instacart feel smoother than Kroger as the demo-facing retailer path?

## Features To Show

### 1. Authenticated App Entry

Show that Chef is no longer a static prototype.

Demo points:

- User can log in.
- User has preferences.
- User can set shopping location.
- Shopping location matters because Kroger product availability depends on store/location context.

Do not spend much time here. This is setup, not the main show.

### 2. Recipe Library

Show `/recipes` as the current recipe discovery and selection surface.

Demo points:

- Recipes exist as structured data.
- Recipes can have cuisine, ingredients, steps, tags, dietary badges, images, and optional nutrition data.
- Recipe detail opens as an overlay.
- `Add to cart` opens the planning composer instead of immediately creating a draft.

Feedback wanted:

- Is this enough as a temporary recipe source for the demo?
- What information is actually needed before adding a recipe to a cart?

### 3. Planning Composer

Show the large overlay used to build a meal plan.

Demo points:

- User can select one or more recipes.
- User can add the same recipe more than once by increasing quantity.
- User can name the run.
- User can save incomplete work as a draft.
- User can generate a cart as the primary action.

Feedback wanted:

- Does "draft" feel like an implementation detail rather than the main product?
- Does the user understand the difference between saving incomplete work and generating a cart?
- Is quantity better handled here, in the shopping cart, or both?

### 4. Recent Work

Show the home page only as a planning dashboard.

Demo points:

- Recent work prioritizes carts.
- Drafts exist as secondary incomplete work.
- Tabs/search make recent work easier to scan.
- The `+` action opens the planning composer.
- `Browse recipes` leads to recipe selection.

Feedback wanted:

- Does the home page feel action-first enough?
- Is recent work useful, or should the next frontend rebuild rethink it completely?

### 5. Cart Detail

Show `Cart` as the stable meal-plan snapshot.

Demo points:

- A cart is not a retailer shopping basket.
- It answers: "what am I cooking?"
- It shows aggregated ingredients.
- It shows the selected recipes as compact references.
- It can generate a `ShoppingCart`.

Feedback wanted:

- Does the `Cart` vs `ShoppingCart` split make sense from a product perspective?
- Is the ingredient aggregation understandable?
- Where should pre-cart ingredient removal live?

### 6. Retailer Shopping Cart Generation

This is the most important demo moment.

Demo points:

- Chef generates a persisted shopping cart from the meal-plan cart.
- Kroger is the first live retailer provider already working in the app.
- Instacart should be integrated as the preferred demo-facing retailer path if the API/cart handoff can be made stable in time.
- Product matching uses real product search.
- Subtotal should come from selected retailer products, not AI.
- Some specialty ingredients may intentionally remain unmatched.

Recommended demo language:

```text
This is not pretending every match is perfect. The important part is that we now have a real retailer path, persisted shopping cart state, and manual correction or retailer handoff when automation is wrong.
```

Feedback wanted:

- Are imperfect matches acceptable if the user can correct them quickly?
- Which matching failures feel fatal?
- Which failures are acceptable as "needs manual review"?
- Which retailer path feels better for the first user-facing demo: Kroger search/matching or Instacart cart handoff?

### 7. Shopping Cart Editing

Show `/shopping` and the shopping-cart detail overlay.

Demo points:

- Saved shopping carts persist.
- User can reopen a previous retailer output.
- User can replace a matched product.
- User can add a manual product/item.
- User can delete lines.
- User can adjust selected quantities.
- Edited shopping carts are saved instead of regenerated from scratch.

Feedback wanted:

- Does this make the live retailer path practical?
- Is manual correction enough for MVP?
- Does the editor need a stronger "review unmatched items first" workflow?

## Features To Mention But Not Demo As Finished

These are important to the startup direction, but should not be presented as complete.

- Meal idea to structured recipe generation.
- AI recipe editing based on constraints.
- Recipe import/forking from URLs, screenshots, menus, creator posts, or plain text.
- Nutrition and macro tracking.
- Computer vision pantry/fridge awareness.
- Live cooking chatbot.
- Cart export or checkout transfer through Share-A-Cart, Walmart, Target, or future providers.
- Deep Instacart checkout behavior if the integration is only partially working by demo time.
- Creator/community layer.

The right framing:

```text
The current demo proves the execution spine. These features should attach to the same spine, not replace it.
```

## What To Keep

Keep these because they are strong foundations for the startup version:

- The internal product name `Chef`.
- The `/api/v1` resource shape.
- The split between `Recipe`, `CartDraft`, `Cart`, and `ShoppingCart`.
- Persisted shopping carts.
- Kroger as the first live retailer path.
- Instacart as the preferred smoother demo-facing retailer path if integration is stable.
- The provider boundary for retailers.
- The provider-first posture for future MCPs/tools.
- Deterministic ingredient aggregation.
- Deterministic subtotal math.
- Manual shopping-cart editing.
- Shopping location as user preference.
- Dietary badges as tag metadata.
- `nutrition_data` as optional recipe detail metadata.
- Current frontend as a validation harness.

## What To Change Before Demo

Prioritize reliability and clarity over new features.

Must-fix before demo:

- Make sure the Kroger demo location is set and stable.
- Decide whether the demo will lead with Instacart or Kroger.
- If using Instacart, prepare one known-good Instacart path with clear fallback to Kroger.
- Prepare one known-good demo account.
- Prepare one known-good demo recipe/cart flow.
- Seed or preserve recipes that produce a useful but not perfect Kroger result.
- Make sure missing Kroger/Instacart credentials or missing location produce clear errors.
- Verify that shopping-cart edits persist after closing and reopening.
- Verify that `Generate shopping cart` does not flood Kroger or Instacart.
- Verify that specialty ingredients fail honestly instead of matching nonsense products.

Should-fix if time:

- Add a lightweight pre-cart ingredient review/removal step.
- Improve copy around unmatched products.
- Add a clear "needs review" state for shopping-cart lines.
- Make saved shopping carts easier to identify without relying only on search.
- Add a provider selector or internal provider flag if needed for demo rehearsal.
- Reduce any UI elements that imply this is the final frontend.

Do not spend time on:

- Major visual redesign.
- New social features.
- Full pantry inventory.
- Voice assistant.
- Mascots.
- Direct checkout.
- Perfect product matching.

## What To Delete Or Hide

Delete or hide anything that distracts from the vertical slice.

Candidates:

- Old naming that still says `Cussien`.
- Any UI copy that makes `Draft` sound like the main product.
- Any fake stats that do not help the user act.
- Any dead buttons or nonfunctional CTA.
- Any retailer option that looks available but is not demo-ready.
- Any Instacart action that looks like checkout if it only creates a preview or handoff.
- Any UI surface that suggests AI generation is complete when it is not.

For the demo, it is better to show fewer working paths than many half-working promises.

## Demo Script

Use one clean scenario.

Suggested scenario:

```text
I want to cook two recipes for dinner. I choose them, adjust quantity, generate a cart, then Chef turns the ingredients into retailer products I can review or hand off.
```

Flow:

1. Log in as the demo user.
2. Confirm shopping location is set.
3. Open recipe library.
4. Open a recipe detail.
5. Click `Add to cart`.
6. Add another recipe or increase quantity.
7. Name the planning run.
8. Generate the cart.
9. Show aggregated ingredients.
10. Generate shopping cart.
11. Show Instacart if stable; otherwise show Kroger matched products and subtotal.
12. Replace or delete one imperfect line.
13. Add one manual item.
14. Save changes.
15. Reopen the saved shopping cart from `/shopping`.

## Feedback Questions For The Demo

Ask these explicitly.

- Would you use this flow if the first input was "I want biryani" instead of selecting from existing recipes?
- Which step felt like real value?
- Which step felt confusing?
- Did the retailer cart feel trustworthy enough if unmatched items are clearly marked?
- Did Instacart feel smoother or more user-ready than Kroger?
- Should AI recipe generation or pre-cart ingredient editing be the next sprint priority?
- What would make this useful enough to test with five real users?

## Engineering Focus For The Next 2.5 Days

### Backend

Owner: Piero

Focus:

- Stabilize Kroger location/product search.
- Add or spike Instacart integration behind the same retailer/provider boundary.
- Decide whether Instacart should be a `RetailerProductProvider`, a `CartExportProvider`, or both.
- Keep throttling/token dedupe healthy.
- Verify shopping-cart persistence and editing.
- Improve error messages for missing location, provider failure, unsupported retailer behavior, and unmatched products.
- Prepare demo seed data and test account.

### Frontend

Owner: Tioluwani

Focus:

- Make the demo path obvious.
- Avoid major redesign.
- Hide or soften non-demo surfaces.
- Make the shopping-cart editor understandable.
- Make empty/error states clean enough for live demo.

### AI / Computer Vision / Integrations

Owner: Galgallo

Focus:

- Prepare the next-step architecture proposal for meal idea -> structured recipe.
- Identify what model/tool input and output should look like.
- Evaluate whether recipe generation, recipe import, or pantry image understanding should be the first AI integration after the demo.
- Evaluate whether Instacart's smoother user handoff changes the priority of product matching vs cart export tooling.
- Do not block the current demo on computer vision.

## Demo Acceptance Checklist

The demo branch is ready when:

- A fresh user can log in.
- The demo user has shopping location configured.
- Recipe library loads.
- `Add to cart` opens the composer.
- Composer can create a cart.
- Cart detail shows aggregated ingredients.
- Cart can generate a retailer shopping cart or handoff.
- If Instacart is used, the Instacart path is stable enough to demo without manual backend intervention.
- If Kroger is used, Kroger results include at least some real matched products with prices.
- Unmatched items are clear.
- Shopping-cart edits persist.
- Saved shopping carts can be reopened.
- The team can explain what is real, what is prototype, and what is next.

## After Demo

Immediately after the demo, capture:

- top 3 product confusions
- top 3 technical risks
- top 3 features people asked for
- which feature should become the next sprint goal
- what to remove from the prototype

Likely next sprint candidates:

1. Meal idea -> structured recipe generation.
2. Pre-cart ingredient editing/removal.
3. Instacart integration hardening.
4. Better matching review workflow.
5. Recipe import/fork from pasted text or URL.
6. Basic nutrition/macros provider contract.

Recommendation:

```text
If the demo feedback says the Kroger flow is valuable, build pre-cart ingredient editing next.
If the demo feedback says recipe selection feels too artificial, build meal idea -> structured recipe next.
If the demo feedback says Instacart feels much smoother, prioritize retailer handoff/export over deep Kroger matching polish.
```
