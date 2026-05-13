# Vision Integration Plan

## Purpose

This plan defines how Chef should integrate Gallo's computer-vision work without merging the full experimental branch into the product app too early.

The goal is to keep a stable product-facing API in Nest while allowing the Python vision lab to keep moving fast.

## Current Branch Findings

Gallo's active branch is `ft-yolo_galo`.

Useful work in that branch:

- `apps/api/src/vision/*`: a Nest vision API contract.
- `packages/shared/src/vision.ts`: shared vision request/response types.
- `apps/vision-lab/*`: Python experimentation lane for Streamlit, FastAPI, YOLO, video scans, live camera, overlays, provisional tracking, and local runtime inventory.
- `docs/vision.md` and `docs/archive/vision-progress.md`: useful architecture notes.

Do not merge blindly:

- The branch includes frontend deletions unrelated to vision.
- The branch includes `yolo11n.pt` directly in the repo.
- The Nest `VisionModule` was not wired into `AppModule`.
- Shared `vision.ts` was not exported from `@cart/shared`.
- Vision endpoints did not require auth.
- Swagger DTO/example files conflict with other active backend work.

## Integration Strategy

Use a split runtime:

```text
Product frontend
  -> Nest /api/v1/vision
  -> VisionDetectorProvider boundary
  -> mock provider now
  -> Python/FastAPI detector later
```

Keep Python-heavy iteration in:

```text
apps/vision-lab
```

Keep the product contract in:

```text
apps/api/src/vision
packages/shared/src/vision.ts
```

## Current Product Contract

The product API now exposes:

```http
GET /api/v1/vision/pipeline
POST /api/v1/vision/detect
```

Both endpoints require the normal bearer-token auth path.

The current provider is intentionally mock-based. It supports:

- `debug_objects` supplied by callers.
- lightweight label inference from `frame_ref`.
- frame-level detections.
- `track`, `review`, and `ignore` inventory policies.
- summary counts for scan review.

The API does not write kitchen inventory yet.

## Why This Shape

Nest should own product orchestration:

- auth
- user context
- API consistency
- Swagger
- inventory/cart/database writes
- future review and persistence workflows

Python should own model iteration:

- YOLO
- webcam/video experimentation
- embeddings
- duplicate resolution
- object tracking
- local detector tests

This keeps the backend safe while Gallo experiments.

## Next Backend Step

The next Piero-owned feature should be:

```text
Vision candidates -> review -> add selected items to kitchen inventory
```

Recommended endpoint shape:

```http
POST /api/v1/vision/inventory-candidates
```

or, if tied to a completed scan:

```http
POST /api/v1/vision/scans/:scanId/inventory-candidates
```

That should not auto-add everything. It should return candidate actions that the frontend can review:

- add item to kitchen inventory
- mark as already known
- ignore
- needs manual review

## Merge Rules For Gallo's Branch

Accept:

- provider contracts
- ontology improvements
- Python lab files if they do not affect app builds
- docs that describe current vision constraints
- FastAPI sidecar code if isolated

Reject or defer:

- frontend deletions unrelated to vision
- committed model weights like `yolo11n.pt`
- product API endpoints without auth
- direct writes to kitchen inventory from raw detector output
- broad edits to shared Swagger files without coordinating conflicts

## Open Questions

- Should `apps/vision-lab` live in this repo permanently or move to a separate ML repo later?
- Should YOLO weights use Git LFS, a release asset, or lazy download?
- Should Nest call Python/FastAPI directly, or should the frontend call a vision sidecar for experiments?
- What is the minimum confidence threshold for inventory candidates?
- How should duplicate detections across frames become one candidate item?
