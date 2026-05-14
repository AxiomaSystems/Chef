# Import UI Wiring

## Current Decision

Recipe import should be presented as a modal-first Chef Capture flow, not as a standalone form page.

`/create` is the primary launcher:

- **Create your own recipe** routes to `/create/new`.
- **Capture a recipe** opens the new Capture modal.

`/import` remains as a compatibility/deep-link route, but it now redirects into `/create?capture=1`.

## Why Modal First

- Import is an add/create action, not a destination the user needs to browse.
- It matches the existing manual recipe modal pattern.
- It preserves context when users eventually launch capture from dashboard, recipes, or mobile navigation.
- It gives Chef a natural agentic surface for progress states: reading source, extracting ingredients, checking missing info, and preparing a draft.

## Backend Contract

The UI uses the Chef Capture backend boundary:

- `POST /api/v1/captures`
- `POST /api/v1/captures/:id/save-recipe`

The UI should not persist imported previews directly or show a separate review screen. Capture creates a draft in the background, then routes to `/create/new?draft=import` with a short-lived `sessionStorage` payload. The create page loads the standard recipe form prefilled from `recipe_preview`; the user reviews and saves from there.

Supported inputs in this slice:

- `input_kind: "url"` with `url`
- `input_kind: "text"` with `text`
- `input_kind: "url"` with optional `text` as supplemental caption/transcript context

Social URLs are best-effort:

- TikTok uses public page/oEmbed metadata when available.
- Instagram tries public embed/caption metadata and script-embedded caption/image data before falling back to generic page text.
- Private, login-gated, blocked, or script-only social pages can still produce weak placeholder drafts unless the user pastes caption/transcript text.

Captured recipes now support optional source thumbnails via `recipe_preview.cover_image_url`; saving the capture carries that through as the recipe cover image when available.

## UX States

The Capture modal has three main states:

1. **Input**
   - Paste link
   - Paste text

2. **Processing**
   - Deterministic progress copy for now
   - Future streaming can replace this with real task-state updates

3. **Edit**
   - Open `/create/new` with prefilled fields
   - User reviews title, image, ingredients, steps, tags, and nutrition before saving

## Future Work

- Add route/query support for opening capture from any page.
- Replace deterministic progress copy with real LLM task-state streaming.
- Add safe generated fallback images when source metadata has no usable thumbnail.
- Add official/credentialed social provider ingestion only if product/legal requirements justify it.
- Add image/screenshot/video capture only after backend supports those input kinds.
- Consider a global create/capture modal provider in `AppShell` once multiple routes need to launch the same flows.
