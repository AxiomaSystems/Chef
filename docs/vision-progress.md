# Vision Progress

This document is the practical status report for Chef computer vision work so far.

## What Exists Now

The repo now has a dedicated Python vision sandbox at `apps/vision-lab` that is separate from the current Nest/Next product stack.

That lab currently supports:

- image upload
- video upload with sampled-frame scanning
- early live camera support through WebRTC when local runtime dependencies cooperate
- inventory-aware overlays
- local runtime inventory persistence
- provisional session tracking and distinct-instance estimation

## Current User Flows

### 1. Image Upload

Current flow:

```text
upload image
  -> YOLO detect
  -> map labels into Chef ontology
  -> resolve against runtime inventory
  -> show colored boxes + resolved items
  -> optionally apply new items to inventory
```

Current output surfaces:

- detection overlay
- detection table
- resolved items table

### 2. Video Upload

Current flow:

```text
upload video
  -> sample frames
  -> YOLO detect each sampled frame
  -> build provisional tracks
  -> estimate distinct instances
  -> resolve scan against runtime inventory
  -> optionally apply results to inventory
```

Current output surfaces:

- frame results
- label persistence summary
- provisional session tracks
- distinct-instance estimates
- resolved items
- best detection thumbnails
- preview frames

### 3. Live Camera

Current flow:

```text
start scan
  -> stream overlays during capture
  -> buffer live frame detections
stop scan
  -> build session result
  -> build tracks and instance estimates
  -> resolve items
  -> optionally apply once to inventory
```

Current output surfaces:

- live overlay during capture
- live session resolved items
- live session tracks
- apply-to-inventory button after scan stop

## Current Inventory Rules

The runtime inventory in the lab lives at:

```text
apps/vision-lab/data/runtime_inventory.json
```

Current behavior:

- `track` labels are eligible for auto-add
- `review` labels are shown but not auto-added
- `ignore` labels are not stored

Current overlay colors:

- red = already in inventory
- green = new trackable item
- yellow = review item
- gray = ignored item

## What Was Built So Far

The current lab now includes:

- Python vision core with pluggable detector interface
- YOLO-backed detector path
- mock detector path for workflow validation
- video frame extraction
- session summaries
- provisional track building
- distinct-instance estimates
- scan resolution into inventory statuses
- one-time live-session inventory apply

## What Is Still Weak

The current system is good enough for iteration, but it is not yet production-ready computer vision.

Main gaps:

- base YOLO accuracy on kitchen-specific objects is still limited
- object identity is still mostly label-based
- same-object vs distinct-object resolution is still heuristic
- live webcam support is environment-sensitive on Windows/mobile
- local JSON inventory is only a lab persistence layer, not product persistence

## What To Say About Status

Short version:

Chef now has a working Python vision lab with image upload, video upload, and early live scan support. It can detect objects with YOLO, resolve them against a runtime inventory, show inventory-aware overlays, estimate repeated objects across frames, and apply scan results into a local inventory store.

Honest version:

The system is now a usable prototype for inventory-aware computer vision workflows, but accuracy and identity resolution still need improvement before production use.

## Next Steps

### Near-Term Product Steps

1. Persist scan sessions as first-class saved artifacts instead of only ephemeral UI state.
2. Add a scan history panel so past image/video/live sessions can be reopened and reviewed.
3. Make the live scan review surface match the video review surface more closely.

### Near-Term Vision Steps

1. Add a debug view that shows raw YOLO detections before resolution.
2. Improve same-class nearby object handling for crowded frames.
3. Tune track heuristics for short kitchen scans.
4. Add per-track thumbnails or best-frame previews.

### Medium-Term Model Steps

1. Collect a small kitchen dataset from the target environment.
2. Fine-tune detection on the highest-value kitchen classes.
3. Add stronger packaged-food recognition later through OCR/barcode.
4. Add embedding-based re-identification for duplicate resolution across larger time gaps.

### Integration Steps

1. Decide when the product should call a Python FastAPI vision service instead of the current mock Nest vision boundary.
2. Replace local JSON inventory with a product-facing persistence path.
3. Define scan session contracts that the main backend can own.
