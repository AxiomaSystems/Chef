# Chef Features

This is a customer-facing map of what Chef currently supports.

Chef helps people move from food ideas and recipes to actual meals, grocery carts, and kitchen context. Some features are production-facing MVP features; others are clearly marked as preview or beta where the experience still depends on provider setup, AI quality, or review flows.

## Account And Personal Setup

- **Email/password accounts**: Users can sign up, log in, stay signed in with refresh tokens, and log out.
- **Google login support**: The backend supports Google identity login.
- **Required onboarding**: New users are routed through onboarding before using the main app.
- **Chef memory setup**: Users can teach Chef household size, cuisines, dietary filters, favorite proteins, flavors, spice tolerance, dislikes, kitchen equipment, cooking time, goals, shopping behavior, discovery style, and location.
- **Account settings**: Users can update profile and preference details after onboarding.
- **Shopping location**: Users can save a ZIP/location label so Chef can build more realistic grocery carts.
- **Checkout profile foundation**: The backend supports saved addresses and payment-card-like checkout profile data for future checkout-oriented flows.

## Recipe Discovery And Library

- **Recipe browsing**: Users can browse a recipe library from the dashboard and `/recipes`.
- **Recipe detail overlays**: Users can open recipe details without losing their workspace.
- **Cuisine metadata**: Recipes are connected to curated cuisines such as Peruvian, Mexican, Mediterranean, Tex-Mex, and Other.
- **Dietary badges and tags**: Recipes can carry tags such as halal, vegan, vegetarian, gluten-free, dairy-free, high-protein, and other system/user tags.
- **Nutrition estimates**: Recipes can include nutrition metadata such as calories and macro estimates when available.
- **User-created recipes**: Authenticated users can create private recipes.
- **Editable saved recipes**: Users can save system recipes into their own library as editable personal copies.
- **Duplicate save protection**: Saving the same system recipe more than once returns the existing saved copy instead of creating duplicates.

## Chef Capture And Import

- **Capture from pasted text**: Users can paste food-related text and get a structured recipe draft.
- **Capture from URL**: Users can submit a URL and Chef attempts to structure it into a recipe draft.
- **Source attribution**: Captures keep source URL/title/creator/site metadata when available.
- **Reviewable drafts**: Captured content is treated as a draft, not final truth. Chef stores assumptions, missing info, confidence, extraction notes, and next actions.
- **Save captured drafts as recipes**: A reviewed capture can be saved into the user's normal recipe library.
- **Idempotent save**: Saving the same capture again returns the recipe already created from it.
- **Future-ready capture boundary**: The backend is designed to later support screenshots, photos, video, menus, dish photos, and ingredient photos, but those are not complete customer-facing capture inputs yet.

## AI Cooking Workspace

- **AI meal generation preview**: Users can ask Chef to generate structured meal ideas.
- **Recipe import structuring preview**: Chef can attempt to turn external recipe/creator content into a structured recipe preview.
- **Ingredient swap suggestions**: Users can ask Chef to propose ingredient replacements with tradeoffs.
- **Chef chat**: Users can ask a contextual cooking assistant for help.
- **Provider-backed AI boundary**: The backend can run with mock AI locally or OpenAI-backed behavior when configured.
- **Important limitation**: Some AI outputs still begin as previews/drafts and require user review before becoming durable recipe/cart state.

## Cart Planning

- **Recipe-to-cart planning**: Users can select one or more recipes and generate a meal-plan cart.
- **Recipe quantities**: Users can plan multiple quantities of the same recipe.
- **Cart drafts**: Users can start planning, save draft state, reopen it, edit it, or delete it.
- **Persisted carts**: Users can convert a draft into a stable cart snapshot.
- **Cart detail overlays**: Users can inspect and edit cart state without leaving the main workspace.
- **Ingredient aggregation**: Chef aggregates ingredients across selected recipes into a combined shopping overview.
- **Ingredient source tracking**: Aggregated ingredients know which recipe(s) they came from.

## Pre-Cart Ingredient Review

- **Review missing ingredients before shopping**: Before generating a shopping cart, users can review recipe ingredients.
- **Mark ingredients already in kitchen**: Users can remove or down-rank items they already have.
- **Adjust ingredient review decisions**: The review is persisted per cart and can be updated before shopping-cart generation.
- **Inventory-aware overview**: Cart overview can indicate ingredients that are already in the kitchen.

## Shopping Carts And Retailer Flow

- **Shopping-cart generation**: Users can generate a shopping cart from a planned recipe cart.
- **Retailer product matching**: Chef can match aggregated ingredients to retailer product candidates through provider boundaries.
- **Kroger path**: Kroger product search and location-aware matching are supported when provider credentials and user location are configured.
- **Instacart handoff**: Chef can create an Instacart shopping-list handoff URL when configured.
- **Walmart boundary**: Walmart exists behind the provider interface but should be treated as hidden/degraded unless configured for a real flow.
- **Retailer capability reporting**: The app can report which retailer paths are available, unavailable, degraded, or credential-gated.
- **Manual shopping-cart edits**: Users can add, replace, and delete shopping-cart line items.
- **Quantity editing**: Users can adjust selected quantities and see subtotals recalculate.
- **Shopping-cart history surface**: Users can revisit saved shopping carts from `/shopping`.
- **User-actionable errors**: Missing location or missing provider configuration is reported explicitly instead of silently failing.

## Weekly Meal Planning

- **Weekly meal-plan surface**: Users can plan meals on `/meal-plan`.
- **Breakfast/lunch/dinner slots**: Each day can reference breakfast, lunch, and dinner recipe choices.
- **Per-user weekly plans**: Meal plans are persisted per user and week start date.
- **Current limitation**: Weekly meal planning is currently an organization layer; it is not yet deeply connected to automatic cart generation.

## Kitchen Inventory

- **Manual inventory management**: Users can add items they have at home.
- **Freeform inventory items**: Users can add unresolved pantry/fridge items without needing a canonical ingredient match.
- **Canonical ingredient linking**: Inventory items can optionally link to a canonical ingredient.
- **Inventory editing**: Users can update inventory item name, amount, unit, source, confidence, and review status.
- **Inventory-aware cart behavior**: Shopping-cart generation can skip or reduce items marked as already in the kitchen.
- **Rough inventory model**: Inventory is intentionally lightweight right now: it tracks user-declared presence, not exact pantry accounting.

## Vision-Assisted Inventory

- **Kitchen scan UI**: Users can upload/select a kitchen image in the inventory flow.
- **Vision sidecar support**: A Python/FastAPI vision service can detect food objects when deployed/configured.
- **Detection review boundary**: Vision output creates observations/candidates for review; it does not automatically mutate inventory as truth.
- **Observation-to-inventory flow**: Reviewed observations can be added to kitchen inventory.
- **Model metadata tracking**: Vision observations can store detector/classifier labels, model names, confidence, image references, and bounding boxes.
- **Current limitation**: Vision is a stage-1/beta capability. It is useful for testing and demos, but not a final object identity or pantry automation system.

## Profile Memory

- **Structured food rules**: Chef can store preferences and rules such as prefer, dislike, avoid, and require.
- **Hard vs soft constraints**: Food rules can distinguish stricter rules from softer preferences.
- **Source and confidence tracking**: Memory can track whether something came from onboarding, manual edits, behavior, or inference, plus confidence.
- **Temporary memory support**: Food rules and goals can be active, start later, or expire.
- **Prioritized goals**: Users can express goals such as saving money, saving time, eating healthier, hitting protein goals, reducing waste, trying new foods, cooking more at home, and meal prep.
- **Pantry staples**: Chef can remember rough staples the user usually has.
- **Chef memory summary**: The backend can derive a summary of what Chef knows for onboarding/account experiences.

## Search And Catalog Foundations

- **Ingredient catalog**: Chef maintains canonical ingredients with aliases, categories, default units, and optional vision labels.
- **Ingredient search**: Users and flows can search ingredient records.
- **Cuisine catalog**: Cuisines are curated and stored as first-class entities.
- **Tag catalog**: Dietary and general tags are managed as reusable system/user metadata.

## Dashboard And Navigation

- **Dashboard home**: Users see recipes, carts, shopping state, and shortcuts from the dashboard.
- **Quick recipe actions**: Users can add recipes to cart planning from dashboard/recipe surfaces.
- **Dedicated app sections**: Chef currently has surfaces for dashboard, recipes, carts/drafts, shopping, meal plan, inventory, import/capture, AI workspace, onboarding, and account settings.
- **Overlay-based workflow**: Recipe, cart, draft, and shopping-cart details can open in large overlays to keep users in context.

## Reliability And Deployment Foundations

- **Documented local setup**: The repo includes local setup and integration command documentation.
- **API health/readiness support**: The backend includes health/readiness endpoints for deployment debugging.
- **Swagger/OpenAPI docs**: The API exposes Swagger documentation for live backend contracts.
- **CI baselines**: The project has GitHub Actions baselines for API, web, and vision checks.
- **Railway/Vercel deployment path**: The app is structured for Railway backend/sidecar deployment and Vercel frontend deployment.
- **Shared type contracts**: Frontend/backend contracts are shared through `@cart/shared`.

## Not Fully Customer-Ready Yet

These areas exist as foundations, previews, or provider boundaries, but should not be oversold as complete:

- Full TikTok/Instagram/Reels import through official platform ingestion.
- OCR/photo/video/menu/dish capture as polished customer flows.
- Automatic pantry mutation from computer vision.
- Exact pantry quantity accounting.
- End-to-end native retailer checkout beyond supported handoff/search flows.
- Email verification and notification infrastructure.
- CDN-backed recipe image upload/storage.
- Redis caching infrastructure.
- Admin panel and feedback floater.
- LLM task state streaming.
