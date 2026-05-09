# Vision Observations And Flexible Inventory

Date: 2026-05-08
Owner: papostigo
Vision owner: Gallo
Status: Phase 1 backend implemented

## Decision

Chef should separate three concepts:

- `VisionObservation`: what a model saw during one scan.
- `KitchenInventoryItem`: what the user accepted as something in their kitchen.
- `Ingredient`: optional canonical product/domain identity.

Do not collapse raw detector output directly into canonical ingredients.

## Why This Matters

Vision models are probabilistic and will change over time. A detector label like `bottle`, `container`, or `green object` is not the same thing as a user-owned pantry item, and neither is necessarily the same thing as canonical `Ingredient("olive oil")`.

If those concepts are merged too early:

- raw detections can pollute inventory
- user corrections can accidentally become noisy training data
- model class names become product truth
- future dataset/model changes become hard to migrate
- canonical ingredients become messy with jars, bottles, leftovers, brands, and ambiguous objects

The clean rule:

```text
Detector output proposes.
User review creates inventory.
Canonical ingredient linking is optional but valuable.
```

## Current State

Implemented:

- `Ingredient` exists and is used by profile memory, pantry staples, recipe ingredient links, and inventory.
- `DishIngredient.ingredientId` exists for recipe/cart canonicalization.
- cart aggregation and inventory deduction can prefer `ingredient_id`.

Previous inventory limitation:

- `KitchenInventoryItem.ingredientId` was required.
- inventory cannot represent unresolved items cleanly.
- `label` is optional rather than the primary user-facing name.
- vision metadata is not modeled on inventory rows.
- there is no `VisionObservation` table.

That was too strict for vision intake.

## Goals

- Let users add almost anything detected or typed into inventory.
- Preserve user-facing inventory names independently from model labels.
- Make canonical ingredient linking optional.
- Store raw model observations as evidence, not truth.
- Keep model metadata with every observation.
- Prevent production user input from automatically becoming training data.
- Preserve current recipe/cart canonicalization work.

## Non-Goals

- Do not train YOLO from user inventory data.
- Do not make backend `Ingredient.id` a YOLO class ID.
- Do not require every inventory item to resolve to an `Ingredient`.
- Do not redesign recipe/cart snapshots.
- Do not replace Gallo's dataset/class pipeline.
- Do not require Enoch to redesign the review UI in this backend branch.

## Proposed Data Model

### Inventory Review Status

```prisma
enum InventoryReviewStatus {
  pending
  active
  discarded
  archived
}
```

Suggested meaning:

- `pending`: model/user proposed item not yet confirmed.
- `active`: user accepted item as part of inventory.
- `discarded`: user rejected it.
- `archived`: user previously had it, but no longer active.

### KitchenInventoryItem

Move inventory from "canonical ingredient row" to "user-owned item, optionally linked to canonical ingredient".

```prisma
model KitchenInventoryItem {
  id              String                    @id @default(cuid())
  userId          String

  displayName     String
  normalizedName  String
  ingredientId    String?

  label           String?
  estimatedAmount Float?
  unit            String?

  source          KitchenInventorySource    @default(manual)
  confidence      KitchenInventoryConfidence @default(medium)
  reviewStatus    InventoryReviewStatus     @default(active)

  visionLabel     String?
  detectorLabel   String?
  detectorModel   String?
  classifierLabel String?
  classifierModel String?
  sourceImageRef  String?
  sourceCropRef   String?
  sourceBbox      Json?

  createdAt       DateTime                  @default(now())
  updatedAt       DateTime                  @updatedAt

  user            User                      @relation(fields: [userId], references: [id], onDelete: Cascade)
  ingredient      Ingredient?               @relation(fields: [ingredientId], references: [id], onDelete: SetNull)
  observations    VisionObservation[]

  @@index([userId, reviewStatus, updatedAt])
  @@index([userId, normalizedName])
  @@index([ingredientId])
}
```

Compatibility notes:

- Existing rows can use `displayName = label ?? ingredient.canonicalName`.
- Existing rows can use `normalizedName = normalize(displayName)`.
- Existing rows should keep their current `ingredientId`.
- The existing `label` field can be kept during transition, but new code should prefer `displayName`.

Important constraint change:

- remove `@@unique([userId, ingredientId])` because nullable/unresolved inventory and duplicate real-world items are valid.

Example: a user may have two "mystery jars", two olive oils, or one unresolved "green bottle" plus canonical olive oil.

### VisionObservation

Store raw model evidence separately.

```prisma
enum VisionObservationAction {
  pending
  added_to_inventory
  renamed
  discarded
  resolved_to_ingredient
}

model VisionObservation {
  id              String                  @id @default(cuid())
  userId          String?
  inventoryItemId String?

  detectedLabel   String
  proposedName    String?
  canonicalSlug   String?

  detectorModel   String?
  classifierModel String?
  modelName       String?
  confidence      Float?

  imageRef        String?
  cropRef         String?
  bbox            Json?
  rawPayload      Json?

  action          VisionObservationAction @default(pending)
  createdAt       DateTime                @default(now())

  user            User?                   @relation(fields: [userId], references: [id], onDelete: SetNull)
  inventoryItem   KitchenInventoryItem?   @relation(fields: [inventoryItemId], references: [id], onDelete: SetNull)

  @@index([userId, createdAt])
  @@index([inventoryItemId])
  @@index([detectedLabel])
  @@index([canonicalSlug])
}
```

`VisionObservation` should be append-only for auditability. If a user renames/discards/adds, update `action` or create a follow-up event, depending on how much history the product needs.

## Product Flow

1. Vision sidecar detects something.
2. Backend stores or returns a `VisionObservation` candidate.
3. UI shows a review card.
4. User chooses:
   - Add
   - Rename
   - Discard
   - Resolve to suggested ingredient
5. Backend creates or updates `KitchenInventoryItem`.
6. `Ingredient` link is set only when a confident canonical match exists or the user explicitly chooses one.

## API Shape

Initial backend endpoints can be small:

```text
POST /api/v1/vision/observations
GET  /api/v1/vision/observations
POST /api/v1/vision/observations/:id/add-to-inventory
POST /api/v1/vision/observations/:id/discard
```

Inventory endpoints should eventually support:

```ts
type AddKitchenInventoryItemRequest = {
  display_name: string;
  ingredient_id?: string;
  canonical_name?: string;
  estimated_amount?: number;
  unit?: string;
  source?: "manual" | "vision" | "receipt" | "cart" | "inferred" | "seed";
  review_status?: "pending" | "active";
};
```

For backwards compatibility, keep accepting `label` and `canonical_name` during transition.

## Training Safety Policy

Production user input must not automatically train or fine-tune YOLO.

Rules:

- raw detector labels are observations, not truth
- user-entered inventory names are product state, not training labels
- user corrections may become dataset candidates only through a reviewed export process
- dataset labels remain vision-owned
- backend `Ingredient.id` is not a model class ID
- mappings should use stable slugs, not environment-specific database IDs
- every observation used for dataset review should preserve model/version metadata

Safe future loop:

```text
VisionObservation + user action
  -> reviewed export queue
  -> human/QA approval
  -> dataset artifact
  -> model training
```

Unsafe loop:

```text
User typed "weird green bottle"
  -> automatic YOLO class/training label
```

Do not build the unsafe loop.

## Gallo Ownership Boundary

Backend can own:

- inventory persistence
- observation persistence
- canonical ingredient linking
- reviewed export contracts

Gallo owns:

- detector classes
- model training strategy
- checkpoint selection
- dataset import/evaluation scripts
- whether/when model output includes `canonical_slug`

Backend should not modify YOLO runtime/training behavior in this branch.

## Migration Plan

Phase 1:

- add enums: implemented
- make `KitchenInventoryItem.ingredientId` nullable: implemented
- add `displayName`, `normalizedName`, `reviewStatus`: implemented
- keep existing `label`: implemented
- backfill display/normalized names: implemented
- remove or replace `@@unique([userId, ingredientId])`: implemented

Phase 2:

- add `VisionObservation`
- add mapper/shared types
- expose minimal observation endpoints
- keep UI optional until Enoch is ready

Phase 3:

- connect vision scan review to observations
- create inventory items from reviewed observations
- optional canonical ingredient resolution by slug

Phase 4:

- reviewed dataset export, if Gallo wants it
- no automatic training

## Testing Plan

Backend tests:

- can create manual inventory item without `ingredient_id`
- can create inventory item with `ingredient_id`
- duplicate unresolved inventory names are allowed if product wants that behavior
- existing inventory list still returns old seeded items
- vision observation can be created without inventory item
- observation can be converted to inventory item
- discarded observation does not create inventory
- cart inventory deduction only uses `ingredient_id` when present, fallback by name otherwise

Migration tests/manual checks:

- existing inventory rows get `displayName`
- existing rows keep `ingredientId`
- seeded inventory still works
- old API request shape still works during transition

## Open Decisions

- Should unresolved inventory duplicates be allowed freely, or deduped by `(userId, normalizedName, reviewStatus)`?
- Should observations be persisted immediately or only after user chooses Add/Rename/Discard?
- Should image/crop refs point to CDN URLs, Supabase storage keys, or local/dev-only paths?
- Should `VisionObservation.action` be updated in place or modeled as a separate event log?
- Should inventory `displayName` replace `label` immediately or over one compatibility phase?

## Recommended Next Step

Do not implement everything at once.

First PR:

- flexible inventory schema only
- no vision runtime changes
- no new training/export behavior
- compatibility with current inventory endpoints

Second PR:

- `VisionObservation` model and API

Third PR:

- wire vision scan review into observations/inventory.

## Phase 1 Implementation Notes

Implemented in `piero/flexible-inventory-items`:

- `KitchenInventoryItem.ingredientId` is now nullable.
- `KitchenInventoryItem.displayName` and `normalizedName` are required user-facing inventory fields.
- `KitchenInventoryItem.reviewStatus` tracks `pending`, `active`, `discarded`, or `archived`.
- Inventory list endpoints return `pending` and `active` rows.
- Freeform/manual inventory items can be created with `display_name` and no canonical `ingredient_id`.
- Existing compatibility paths still accept `ingredient_id`, `canonical_name`, and legacy `label`.
- Cart inventory deduction still prefers `ingredient_id`; unresolved rows without an ingredient are ignored by canonical deduction.
- `VisionObservation` is intentionally not implemented yet.
- No YOLO runtime, training, dataset, or checkpoint behavior changed in this phase.

Handoffs:

- Gallo/vision: `docs/vision-flexible-inventory-handoff.md`
- Enoch/frontend: `docs/frontend-flexible-inventory-handoff.md`
