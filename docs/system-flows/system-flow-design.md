# Chef System Flow Design

This document captures the current implementation and architecture for:

- Barcode scanning
- Shopping Cart
- LLM / OpenAI
- Inventory
- Shopping Plan (Meal Plan)

Each section includes the UI entrypoints, API routes, system design, and a separate Mermaid diagram.

---

## 1. Barcode Scanning

### Current UI flow

- Page: `/inventory`
- Component: `apps/web/src/app/inventory/inventory-client.tsx`
- Button: `Barcode`
- Modal: `apps/web/src/app/inventory/camera-modal.tsx`
- Mode: `scan`

When the user opens the barcode scanner:

1. `CameraModal` requests camera access via `navigator.mediaDevices.getUserMedia`.
2. If `mode === "scan"`, it dynamically imports `@zxing/browser` and `@zxing/library`.
3. ZXing decodes barcodes from the live video stream.
4. On successful scan, the app calls OpenFoodFacts directly:
   - `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
5. The product result is rendered inside the modal.
6. If the user accepts it, `addInventoryItemAction(product.name)` is called.

### Current system/API flow

- Client-side fetch: OpenFoodFacts
- Internal API: `POST /api/v1/me/kitchen-inventory`
- Backend controller: `apps/api/src/ingredients/ingredients.controller.ts`
- Backend service: `apps/api/src/ingredients/ingredients.service.ts`

The inventory add action is implemented in:

- `apps/web/src/app/inventory/actions.ts`

This means barcode scanning currently has two distinct paths:

- client-side barcode decode + external lookup
- authenticated backend inventory persistence

### Why this matters

Current design is simple, but brittle:

- barcode lookup is done on the client and bypasses the backend
- OpenFoodFacts results are not normalized in the product data pipeline
- there is no backend caching, deduplication, or enrichment step before inventory creation
- a failed lookup still adds the raw barcode string as inventory name if no product is found

### Recommended design improvement

Ideal system design would shift the barcode lookup into a backend boundary:

- client scans barcode and sends only the code to backend
- backend handles provider lookup, caching, catalog normalization, and fallback metadata
- backend resolves a canonical ingredient/brand and returns a small product summary
- frontend lets the user confirm/override the final inventory label

That would make barcode scanning more robust and better integrated with inventory and recipe matching.

### Barcode scanning diagram

```mermaid
flowchart LR
  UI[Inventory page `/inventory`] -->|open barcode modal| CameraModal[CameraModal scan mode]
  CameraModal -->|ZXing decode| ZXing[ZXing Browser library]
  ZXing -->|code text| OpenFoodFacts[(OpenFoodFacts API)]
  OpenFoodFacts -->|product metadata| CameraModal
  CameraModal -->|approve & add| AddInventory[POST /api/v1/me/kitchen-inventory]
  AddInventory -->|persist item| InventoryAPI[Ingredients API]

  linkStyle 0 stroke:#ffffff,stroke-width:2
  linkStyle 1 stroke:#ffffff,stroke-width:2
  linkStyle 2 stroke:#00a550,stroke-width:3
  linkStyle 3 stroke:#ffffff,stroke-width:2
  linkStyle 4 stroke:#00a550,stroke-width:3
```

---

## 2. Shopping Cart

### Current UI callers

- Recipe detail / Add to cart flows (documented in `README.md`)
- Cart builder overlay
- `/shopping` saved cart library
- Inventory page quick restock via `Add All to Cart`

The inventory restock button does:

- `createRestockCartAction(names)`
- `POST /api/v1/carts/restock`
- redirects to `/shopping`

### Core resources

The current backend model is intentionally split into three resources:

- `CartDraft` — editable, incomplete planning intent
- `Cart` — stable recipe-based meal plan snapshot with retailer context
- `ShoppingCart` — retailer-facing purchase basket derived from a `Cart`

### Current API routes

- `POST /api/v1/cart-drafts`
- `PATCH /api/v1/cart-drafts/:id`
- `GET /api/v1/cart-drafts`
- `DELETE /api/v1/cart-drafts/:id`

- `POST /api/v1/carts`
- `PATCH /api/v1/carts/:id`
- `GET /api/v1/carts`
- `GET /api/v1/carts/:id`
- `GET /api/v1/carts/:id/ingredient-review`
- `PUT /api/v1/carts/:id/ingredient-review`

- `POST /api/v1/carts/:cartId/shopping-carts`
- `GET /api/v1/shopping-carts`
- `GET /api/v1/shopping-carts/history`
- `GET /api/v1/shopping-carts/:id`
- `PATCH /api/v1/shopping-carts/:id`

- `GET /api/v1/retailers/:retailer/products/search`

### Key design points

- `Cart` is not the final purchase basket. It is a plan snapshot.
- `ShoppingCart` is the derived retailer-matched basket.
- Shopping-cart generation skips items that are already marked `in_kitchen`.
- Manual shopping-cart edits are persisted via `PATCH /api/v1/shopping-carts/:id`.
- `carts/restock` is a convenience path for inventory-driven shopping creation.

### Recommended improvement

The current flow is good on separation, but the UI should make the distinction clearer:

- `Cart` = "what I plan to cook"
- `ShoppingCart` = "what I am buying"

A better implementation would enforce this separation visually and reduce coupling:

- keep `Cart` creation independent from retail matching
- generate `ShoppingCart` only after user confirms retailer and inventory review
- keep manual edits on `ShoppingCart` behind the same persistence boundary

### Shopping cart diagram

```mermaid
flowchart LR
  RecipeUI[Recipe / planner UI] -->|create or update| Draft[CartDraft]
  Draft -->|commit plan| Cart[Cart]
  Cart -->|generate| ShoppingCart[ShoppingCart]
  ShoppingCart -->|manual edits| ShoppingCart
  Inventory[Kitchen inventory] -->|exclude existing items| Cart
  Inventory -->|exclude existing items| ShoppingCart
  Cart -->|retailer search| Retailer[Retailer provider]
  Retailer -->|matched products| ShoppingCart

  linkStyle 0 stroke:#ffffff,stroke-width:2
  linkStyle 1 stroke:#00a550,stroke-width:3
  linkStyle 2 stroke:#ffffff,stroke-width:2
  linkStyle 3 stroke:#ffffff,stroke-width:2
  linkStyle 4 stroke:#ffffff,stroke-width:2
  linkStyle 5 stroke:#00a550,stroke-width:3
  linkStyle 6 stroke:#00a550,stroke-width:3
```

---

## 3. LLM / OpenAI

### Current API endpoints

- `GET /api/v1/ai/status`
- `POST /api/v1/ai/chat`
- `POST /api/v1/ai/meals/generate`
- `POST /api/v1/ai/recipes/swap-ingredient`
- `POST /api/v1/ai/recipe-imports/structure`

### Current implementation

- Backend module: `apps/api/src/ai/`
- Controller: `apps/api/src/ai/ai.controller.ts`
- Service: `apps/api/src/ai/ai.service.ts`
- Provider boundary:
  - `MockAiProvider`
  - `OpenAiAiProvider`
- Env var: `CHEF_LLM_PROVIDER`
- OpenAI model env: `OPENAI_MODEL`

### OpenAI provider behavior

- Uses `https://api.openai.com/v1/responses`
- Sends a Chef system prompt and JSON payload
- Requests `json_schema` output with strict schema
- Uses the configured `OPENAI_API_KEY`

### Frontend callers

- `apps/web/src/components/ai/chef-chat-widget.tsx`
- `apps/web/src/app/chef-ai/chef-ai-client.tsx`
- Future meal/recipe generate UI surfaces

### Design principle

The current design is intentionally narrow:

- LLMs generate/edit structured recipes and meal previews
- LLMs do not perform final product matching or subtotal math
- Deterministic services own cart aggregation, inventory filtering, and retailer matching

### Recommended improvement

Keep the LLM boundary as a structured reasoning layer, not a shopping executor.
Ideal implementation:

- use AI for meal/recipe intent, ingredient structure, and substitutions
- use backend deterministic pipelines for cart generation and retailer resolution
- enrich chat context over time with recipe, inventory, cart, and plan state

### LLM diagram

```mermaid
flowchart LR
  Page[Chef page / chat widget] -->|POST /api/v1/ai/chat| AiAPI[AI API controller]
  Page -->|POST /api/v1/ai/meals/generate| AiAPI
  Page -->|POST /api/v1/ai/recipes/swap-ingredient| AiAPI
  AiAPI -->|provider selection| AiService[AI service]
  AiService -->|mock| MockProvider[Mock provider]
  AiService -->|openai| OpenAIProvider[OpenAI provider]
  OpenAIProvider -->|HTTPS| OpenAI[(OpenAI Responses API)]

  linkStyle 0 stroke:#ffffff,stroke-width:2
  linkStyle 1 stroke:#ffffff,stroke-width:2
  linkStyle 2 stroke:#00a550,stroke-width:3
  linkStyle 3 stroke:#00a550,stroke-width:3
  linkStyle 4 stroke:#00a550,stroke-width:3
```

---

## 4. Inventory

### Current inventory UI

- Page: `/inventory`
- Component: `apps/web/src/app/inventory/inventory-client.tsx`
- Supports:
  - manual Add
  - barcode scan
  - quantity/unit editing
  - remove item
  - quick restock cart

### Backend inventory API

- `GET /api/v1/me/kitchen-inventory`
- `POST /api/v1/me/kitchen-inventory`
- `PATCH /api/v1/me/kitchen-inventory/:id`
- `DELETE /api/v1/me/kitchen-inventory/:id`

### Inventory semantics

- `KitchenInventoryItem` is a user-scoped kitchen item
- It is user-declared, not automatically inferred
- It can store `estimated_amount` and `unit`
- It can be matched to canonical ingredients, but it is intentionally flexible

### Cart interaction

- Cart overview enrichment reads inventory rows via canonical ingredients.
- Shopping-cart generation skips ingredients already marked `in_kitchen`.
- Quick restock from inventory uses `POST /api/v1/carts/restock`.

### Recommended improvement

The current inventory layer is a strong foundation. Key next steps:

- make barcode and vision inventory addition clearly review-first
- use a shared ingredient catalog when possible
- preserve unresolved inventory item names separately from canonical ingredient IDs
- keep inventory edits and cart deductions explicit rather than automatic

### Inventory diagram

```mermaid
flowchart LR
  WebInventory[Inventory page] -->|GET| InventoryAPI[GET /api/v1/me/kitchen-inventory]
  WebInventory -->|POST| InventoryAPI
  InventoryAPI -->|persist| DB[(Database)]
  WebInventory -->|PATCH| InventoryAPI
  WebInventory -->|DELETE| InventoryAPI
  InventoryAPI -->|read| CartLayer[Cart/ShoppingCart generation]
  InventoryAPI -->|read| CartLayer
  CartLayer -->|exclude in-kitchen items| ShoppingCart

  linkStyle 0 stroke:#ffffff,stroke-width:2
  linkStyle 1 stroke:#00a550,stroke-width:3
  linkStyle 2 stroke:#ffffff,stroke-width:2
  linkStyle 3 stroke:#ffffff,stroke-width:2
  linkStyle 4 stroke:#00a550,stroke-width:3
  linkStyle 5 stroke:#00a550,stroke-width:3
```

---

## 5. Shopping Plan / Meal Plan

### Current UI flow

- Page: `/meal-plan`
- Component: `apps/web/src/app/meal-plan/meal-plan-client.tsx`
- Page actions: `apps/web/src/app/meal-plan/actions.ts`
- Meal plan render: `apps/web/src/components/meal-plan.tsx`

### Backend API

- `GET /api/v1/meal-plans?week_start=YYYY-MM-DD`
- `PUT /api/v1/meal-plans?week_start=YYYY-MM-DD`

### Current design

- Weekly meal plans are persisted per user and week start.
- Each plan includes 7 days and recipe references for breakfast/lunch/dinner.
- The meal plan layer is intentionally separate from cart generation.
- The current implementation does not create `Cart` records automatically.

### Recommended system design

- Keep weekly meal plans as an intent layer, not a shopping basket.
- Add a conversion path later:
  - meal plan -> selected recipes -> `Cart`
  - then `Cart` -> `ShoppingCart`
- Avoid collapsing meal plans directly into shopping carts today.

### Meal plan diagram

```mermaid
flowchart LR
  MealPlanUI[Meal plan page] -->|GET/PUT| MealPlanAPI[Meal plan API]
  MealPlanAPI -->|persist| DB[(Database)]
  MealPlan[Weekly plan] -->|future conversion| Cart[Cart]
  Cart -->|generate| ShoppingCart[ShoppingCart]

  linkStyle 0 stroke:#00a550,stroke-width:3
  linkStyle 1 stroke:#ffffff,stroke-width:2
  linkStyle 2 stroke:#ffffff,stroke-width:2
```

---

## 6. Connection status guide

- Green lines: ideal connections / strong design
  - LLM -> structured recipe preview only
  - Cart -> ShoppingCart separation
  - Inventory -> cart deduction by canonical ingredient
  - backend barcode lookup boundary

- White lines: normal current flows
  - frontend inventory CRUD
  - meal plan UI persistence
  - shopping-cart API read/write

- Red lines: inconvenient or fragile connections
  - client-side barcode lookup directly to OpenFoodFacts
  - shopping-cart generation coupled too early to inventory state
  - meal plan not yet connected to carts and grocery execution

---

## 7. Notes and references

Files referenced in this document:

- `apps/web/src/app/inventory/inventory-client.tsx`
- `apps/web/src/app/inventory/camera-modal.tsx`
- `apps/web/src/app/inventory/actions.ts`
- `apps/api/src/ingredients/ingredients.controller.ts`
- `apps/api/src/cart/cart.controller.ts`
- `apps/api/src/meal-plan/meal-plan.controller.ts`
- `apps/api/src/ai/ai.controller.ts`
- `apps/api/src/ai/ai.service.ts`
- `apps/api/src/ai/providers/openai-ai.provider.ts`
- `docs/vision-scan-lab.md`
- `docs/architecture.md`
- `docs/llm-mechanism.md`
