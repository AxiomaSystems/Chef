# Vision MVP

This document describes the current vision architecture in the repo and how the pieces relate.

## Goal

The current stage is still intentionally narrow:

```text
scan session -> frame observations -> closed-set detections
```

What is in scope now:

- object detection only
- a stable API contract for scan sessions
- frame-level observations
- class-level `track` vs `review` vs `ignore` routing
- a detector provider boundary so YOLO can replace the mock without changing clients
- a Python lab for image upload, video upload, and early live webcam validation
- provisional video/live session tracking and distinct-instance estimation
- local runtime inventory resolution with color-coded overlay states

What is intentionally still out of scope for this stage:

- cross-frame tracking
- duplicate resolution
- embeddings / re-identification
- open-vocabulary fallback
- OCR / barcode enrichment
- meal segmentation
- production-grade inventory persistence in the main backend
- embedding-based identity matching
- robust duplicate resolution across long camera gaps
- true mobile-ready live streaming reliability

## Runtime Split

There are now two separate vision paths in the repo:

- `apps/api/src/vision`: the Nest integration contract already visible to the product
- `apps/vision-lab`: the Python experimentation lane for Streamlit and future FastAPI inference

The Python lane should be the primary place for real computer-vision iteration.

Why:

- most CV/ML libraries land in Python first
- Streamlit is much faster for internal testing than wiring every idea into the web app
- FastAPI is a cleaner serving runtime for model inference
- Nest is still useful as the product-facing orchestrator once the Python side becomes stable

## Current API

The Nest API exposes:

- `GET /api/v1/vision/pipeline`
- `POST /api/v1/vision/detect`

The Nest side is still a contract-first boundary. Its current provider is a mock detector intended to stabilize contracts and downstream logic before a real backend vision service is wired in. It supports two development modes:

- explicit `debug_objects` in the request
- lightweight label inference from `frame_ref`

That means the response shape, ontology, and summary logic are already usable by frontend and resolver work even before the product starts calling a real Python vision service.

The product path can now also proxy real media scans:

```text
Next inventory UI
  -> /api/vision/analyze
  -> Nest /api/v1/vision/detect/media
  -> Python FastAPI sidecar
  -> YOLO object crop proposals
  -> crop classifier top-k predictions
  -> grouped detections, crop thumbnails, top-k picker, and annotated frame
```

The UI remains a review workflow. It shows the user what was found and lets them add selected items instead of automatically writing raw detections into inventory.

The product app currently disables grid fallback and full-image fallback. Those modes remain in Streamlit for diagnosis, but they produced false inventory candidates in product testing because arbitrary image regions can be classified as plausible food labels.

The Python vision lab mirrors that same stage-1 shape and then extends it with actual local detection/review flows so we can prototype in Python first and then either:

- keep Nest as a thin proxy/integration layer, or
- replace the Nest vision implementation later with calls into a Python service

## Straight Pipeline

```text
client frames
  -> vision API
  -> detector provider
  -> frame detections
  -> track/review/ignore summary
```

The Python lab currently extends that basic detection-only path with:

```text
image | video | live stream
  -> YOLO detections
  -> optional classifier crop ranking
  -> provisional tracks
  -> distinct-instance estimates
  -> resolved items
  -> optional local inventory apply
```

A later production stage should extend the full flow like this:

```text
client frames
  -> detector
  -> tracker
  -> embeddings
  -> inventory matcher
  -> duplicate resolver
```

## Ontology Shape

Stage 1 uses three action classes instead of treating every label the same:

- `track`: high-value inventory objects like `onion`, `milk carton`, `egg carton`, `olive oil bottle`
- `review`: generic or uncertain objects like `bottle`, `jar`, `container`, `leftovers container`, `unknown kitchen item`
- `ignore`: background kitchenware like `plate`, `mug`, `utensil`

This keeps the detection layer simple while still giving downstream services the signal they need.

The shared development mapping lives at:

```text
packages/shared/vision-label-mappings.json
```

That file currently keeps the API and Python adapter aligned for stage-1 classes, aliases, inventory policy, default mock boxes, and COCO-to-Chef label mappings. The long-term source of truth should be the database; the JSON file is the current bridge while the detector and UI are still changing.

## Current Overlay Semantics

The Python lab currently uses inventory-aware overlay colors:

- red: the label already exists in inventory
- green: new trackable item
- yellow: review item
- gray: ignored item

This is a practical MVP rule set. It is still mostly label-based rather than true physical-object identity.

## Current Caveat

The most important current limitation is that inventory matching is still mostly label-first:

- if YOLO only detects one banana, the system cannot infer two bananas
- if YOLO detects two banana boxes in the same frame, single-frame and live resolution can count two
- video scans do better than live because they also use provisional tracks and distinct-instance estimation

This is useful for product iteration, but it is not yet the final object identity system.

Another important caveat: classification is only as good as the crop proposal. If generic YOLO returns `container`, the classifier may still identify the crop as `basmati rice`, but if YOLO misses parsley entirely then the classifier never sees parsley. The next architecture improvement is an ingredient-aware detector trained from the imported XML boxes and evaluated against the current generic `yolo11n.pt` baseline.

## Current Local Dev Stack

Preferred local command:

```powershell
pnpm dev
```

Expected services:

```text
web: http://localhost:3000
api: http://localhost:3001
vision sidecar: http://localhost:8000
```

If a scan response is stale or missing `classification`, check for duplicate Python sidecars on port `8000`. If the backend reports `EADDRINUSE` on `3001`, an older API process is already running.
