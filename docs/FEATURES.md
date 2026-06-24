# Preppie Features

This is a customer-facing map of what Preppie currently supports or is actively building.

Preppie helps young adults move through the complete Plan -> Shop -> Cook loop. Some features are production-facing foundations; others are beta/provider-dependent and should be described carefully.

## Account And Personal Setup

- **Email/password accounts**: Users can sign up, log in, stay signed in with refresh tokens, and log out.
- **Google login support**: The backend supports Google identity login.
- **Required onboarding**: New users are routed through onboarding before using the main app.
- **Personal cooking profile**: Users can set household size, cuisines, dietary filters, favorite proteins, flavors, spice tolerance, dislikes, equipment, cooking time, goals, shopping behavior, and location.
- **Account settings**: Users can update profile and preference details after onboarding.
- **Shopping location**: Users can save a ZIP/location label so Preppie can build more realistic grocery support.
- **Checkout profile foundation**: The backend supports saved addresses and payment-card-like checkout profile data for future checkout-oriented flows.

## Planning

- **Flexible meal planning**: Users can plan meal events on `/meal-plan`.
- **Any-date meal events**: Meal events can support breakfast, lunch, dinner, snack, prep, leftover, or custom labels.
- **Manual and recipe-backed meals**: Users can plan meals from recipes or create manual meal entries.
- **Statuses and notes**: Meal events can carry planned/cooked/eaten/skipped status, servings, locked state, notes, and custom labels.
- **Nutrition summary foundation**: Recipe-backed plans can contribute calorie and macro summaries when nutrition data exists.
- **Grocery summary foundation**: Recipe-backed plans can aggregate ingredients for cart generation.

## Recipe Discovery And Library

- **Recipe browsing**: Users can browse a recipe library from the dashboard and `/recipes`.
- **Recipe detail overlays**: Users can open recipe details without losing their workspace.
- **Cuisine metadata**: Recipes are connected to curated cuisines.
- **Dietary badges and tags**: Recipes can carry tags such as halal, vegan, vegetarian, gluten-free, dairy-free, high-protein, and other system/user tags.
- **Nutrition estimates**: Recipes can include calorie and macro metadata when available.
- **User-created recipes**: Authenticated users can create private recipes.
- **Editable saved recipes**: Users can save system recipes into their own library as editable personal copies.
- **Duplicate save protection**: Saving the same system recipe more than once returns the existing saved copy instead of creating duplicates.

## Recipe Capture And Import

- **Capture from pasted text**: Users can paste food-related text and get a structured recipe draft.
- **Capture from URL**: Users can submit a URL and Preppie attempts to structure it into a recipe draft.
- **Source attribution**: Captures keep source URL/title/creator/site metadata when available.
- **Reviewable drafts**: Captured content is treated as a draft, not final truth.
- **Save captured drafts as recipes**: A reviewed capture can be saved into the user's recipe library.
- **Future-ready capture boundary**: The backend is designed to later support screenshots, photos, video, menus, dish photos, and ingredient photos.

## AI Cooking Workspace

- **AI meal generation preview**: Users can ask Preppie to generate structured meal ideas.
- **Recipe import structuring preview**: Preppie can attempt to turn external recipe/creator content into a structured recipe preview.
- **Ingredient swap suggestions**: Users can ask for ingredient replacements with tradeoffs.
- **Contextual cooking chat**: Users can ask a cooking assistant for help.
- **Provider-backed AI boundary**: The backend can run with mock AI locally or OpenAI-backed behavior when configured.
- **Review-first behavior**: AI outputs still begin as previews/drafts where user review matters.

## Pantry And Inventory

- **Manual inventory management**: Users can add items they have at home.
- **Freeform inventory items**: Users can add unresolved pantry/fridge items without needing a canonical ingredient match.
- **Canonical ingredient linking**: Inventory items can optionally link to a canonical ingredient.
- **Inventory editing**: Users can update inventory item name, amount, unit, source, confidence, and review status.
- **Voice inventory foundation**: Voice-to-text pantry intake exists as a foundation for faster updates.
- **Barcode and camera-oriented foundations**: The product direction supports low-friction barcode/image intake.
- **Inventory-aware cart behavior**: Shopping-cart generation can skip or reduce items marked as already in the kitchen.
- **Rough inventory model**: Inventory tracks user-declared presence, not exact pantry accounting.

## Cart And Grocery Support

- **Recipe-to-cart planning**: Users can select one or more recipes and generate a planned cart.
- **Recipe quantities**: Users can plan multiple quantities of the same recipe.
- **Cart drafts**: Users can start planning, save draft state, reopen it, edit it, or delete it.
- **Persisted carts**: Users can convert a draft into a stable cart snapshot.
- **Ingredient aggregation**: Preppie aggregates ingredients across selected recipes into a combined shopping overview.
- **Review missing ingredients before shopping**: Users can review recipe ingredients before generating a shopping cart.
- **Mark ingredients already in kitchen**: Users can remove or down-rank items they already have.
- **Shopping-cart generation**: Users can generate a shopping cart from planned recipes.
- **Retailer product matching**: Provider boundaries can match ingredients to retailer product candidates.
- **Kroger path**: Kroger product search and location-aware matching are supported when provider credentials and user location are configured.
- **Instacart handoff**: Preppie can create an Instacart shopping-list handoff URL when configured.
- **Manual shopping-cart edits**: Users can add, replace, and delete shopping-cart line items.
- **Quantity editing**: Users can adjust selected quantities and see subtotals recalculate.

## Hands-Free Cooking

- **Hands-free cooking mode**: Preppie supports a voice-oriented cooking experience for following recipes.
- **Contextual assistance**: The cooking assistant can use recipe and profile context.
- **Step support**: The target experience includes repeating steps, moving through instructions, and answering recipe-specific questions.
- **Timer and substitution support**: Hands-free cooking should support timers and substitutions as the mode matures.
- **Premium differentiator**: Full hands-free AI cooking mode is a premium feature in the business plan.

## Vision-Assisted Inventory

- **Kitchen scan UI**: Users can upload/select a kitchen image in the inventory flow.
- **Vision sidecar support**: A Python/FastAPI vision service can detect food objects when deployed/configured.
- **Detection review boundary**: Vision output creates observations/candidates for review; it does not automatically mutate inventory as truth.
- **Observation-to-inventory flow**: Reviewed observations can be added to kitchen inventory.
- **Current limitation**: Vision is a beta capability for demos and testing, not final pantry automation.

## Profile Memory

- **Structured food rules**: Preppie can store preferences and rules such as prefer, dislike, avoid, and require.
- **Hard vs soft constraints**: Food rules can distinguish stricter rules from softer preferences.
- **Source and confidence tracking**: Memory can track whether something came from onboarding, manual edits, behavior, or inference.
- **Temporary memory support**: Food rules and goals can be active, start later, or expire.
- **Prioritized goals**: Users can express goals such as saving money, saving time, eating healthier, hitting protein goals, reducing waste, trying new foods, cooking more at home, and meal prep.
- **Pantry staples**: Preppie can remember rough staples the user usually has.

## Search And Catalog Foundations

- **Ingredient catalog**: Preppie maintains canonical ingredients with aliases, categories, default units, and optional vision labels.
- **Ingredient search**: Users and flows can search ingredient records.
- **Cuisine catalog**: Cuisines are curated and stored as first-class entities.
- **Tag catalog**: Dietary and general tags are managed as reusable system/user metadata.

## Dashboard And Navigation

- **Dashboard home**: Users see recipes, carts, shopping state, and shortcuts from the dashboard.
- **Quick recipe actions**: Users can add recipes to cart planning from dashboard/recipe surfaces.
- **Dedicated app sections**: Preppie currently has surfaces for dashboard, recipes, carts/drafts, shopping, meal plan, inventory, import/capture, AI workspace, onboarding, and account settings.
- **Overlay-based workflow**: Recipe, cart, draft, and shopping-cart details can open in large overlays to keep users in context.

## Reliability And Deployment Foundations

- **Documented local setup**: The repo includes local setup documentation.
- **API health/readiness support**: The backend includes health/readiness endpoints for deployment debugging.
- **Swagger/OpenAPI docs**: The API exposes Swagger documentation for live backend contracts.
- **CI baselines**: The project has GitHub Actions baselines for API, web, and vision checks.
- **Railway/Vercel deployment path**: The app is structured for Railway backend/sidecar deployment and Vercel frontend deployment.
- **Shared type contracts**: Frontend/backend contracts are shared through `@cart/shared`.

## Not Fully Customer-Ready Yet

These areas exist as foundations, previews, or provider boundaries, but should not be oversold:

- full TikTok/Instagram/Reels import through official platform ingestion
- OCR/photo/video/menu/dish capture as polished customer flows
- automatic pantry mutation from computer vision
- exact pantry quantity accounting
- end-to-end native retailer checkout beyond supported handoff/search flows
- broad premium scale without fair-use controls
- email verification and notification infrastructure
- CDN-backed recipe image upload/storage
- Redis caching infrastructure
- admin panel and feedback floater
- native app store deployment
