# Chef Capture

Chef Capture is the backend boundary for turning food-related input into a reviewable cooking object.

This is not just "import by URL". URL import is one provider inside Capture.

## Current Slice

Supported inputs now:

- URL
- pasted text

Reserved for later:

- screenshot or photo
- video upload
- cookbook page scan
- restaurant menu scan
- finished dish photo
- ingredient photo

The current implementation creates persisted capture drafts through:

- `POST /api/v1/captures`
- `GET /api/v1/captures/:id`
- `POST /api/v1/captures/:id/save-recipe`

Every capture is owned by a user and requires auth.

## Product Rule

Capture output is always reviewable draft data, not final truth.

Chef should explain:

- what kind of input it saw
- what it produced
- what it is uncertain about
- what the user should review next
- where the source came from when known

## Status vs Result Kind

Keep workflow status separate from culinary output type.

`result_kind` means what Chef produced:

- `exact_recipe_import`
- `partial_recipe_import`
- `reconstructed_recipe`
- `inspired_recipe`

Reserved future result kinds:

- `ingredient_based_suggestion`
- `menu_to_recipe`
- `dish_identification`

`status` means where the flow is:

- `processing`
- `ready_for_review`
- `needs_more_info`
- `failed`
- `saved`
- `discarded`

`needs_more_info` is intentionally a status, not a result kind.

## Attribution and Raw Content

Source attribution is first-class. Captures store source URL, title, creator/site/platform when available, and an attribution label.

Do not store unnecessary full raw extraction text. Store only enough to support review, debugging, and traceability:

- source URL
- source title/creator/site
- short snippets
- extraction notes
- structured recipe preview
- assumptions
- missing info

This avoids turning Chef into a copied-content archive.

## Current Data Model

The `Capture` table stores:

- user ownership
- input kind
- source kind
- result kind
- status
- confidence
- source attribution JSON
- optional recipe preview JSON
- assumptions, missing info, next actions, extraction notes, and short snippets

The recipe preview is intentionally draft-shaped so the next product slice can add explicit review/save behavior before creating a canonical recipe.

## Save As Recipe

Reviewed captures can be saved into the normal recipe system.

`POST /api/v1/captures/:id/save-recipe`:

- requires capture ownership
- requires a recipe preview
- creates a user-owned, non-system `BaseRecipe`
- links the capture to the saved recipe through `savedRecipeId`
- marks the capture as `saved`
- returns the existing recipe if the capture was already saved

This keeps raw Capture data separate from the user's canonical recipe library while still making Capture useful end-to-end.

## Future Integration

Next backend slices should build on this instead of adding parallel import flows:

- generate grocery list/cart from reviewed capture
- attach image/video assets through CDN-backed storage
- feed screenshots/photos/videos through OCR or vision sidecars
- use ingredient canonicalization when capture inputs mention ingredients

For vision-related capture, keep Gallo's boundary intact:

- model output proposes
- user review creates persisted inventory/capture objects
- canonical ingredient links are optional and reviewed
- raw detector labels must not become canonical training truth automatically
