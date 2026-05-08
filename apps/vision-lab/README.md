# Vision Lab

This folder is the isolated computer-vision sandbox for Chef.

It exists so we can iterate on kitchen detection, scan-session logic, overlays, and future tracking without touching the current product frontend or Nest runtime.

## Why this lives outside Nest

- Python is the most convenient ecosystem for computer vision work
- Streamlit is fast for internal testing
- FastAPI is a cleaner path for future inference services
- Nest can stay as the product orchestration/API shell while vision evolves independently

## What is here today

- `app.py`: Streamlit testing UI
- `fastapi_app.py`: small Python API exposing the same pipeline
- `chef_vision/`: shared pipeline, ontology, detector interface, and overlay rendering
- `data/runtime_inventory.json`: local runtime inventory store for lab scans

The active lab path is BoundingBox detection plus optional crop classification. Segmentation experiments can remain for historical comparison, but they are no longer the product direction.

## Quick Start

Python 3.11 or newer is required because the main app runs this vision sidecar in local development.

For a full repo setup from the root, prefer:

```powershell
pnpm setup
```

From the repo root, create the local virtual environment and install the base vision dependencies:

```powershell
pnpm vision:setup
```

That base install is enough for:

- single-image detection
- uploaded video scanning
- FastAPI sidecar testing

Checkpoint binaries are not committed. Download shared model files from the team artifact folder and place them under:

```text
apps/vision-lab/checkpoints/
```

See `apps/vision-lab/checkpoints/README.md` for the exact expected paths.

Generated datasets and preview sheets live under `apps/vision-lab/data/`, which is local ignored scratch space. Use `apps/vision-lab/DATASETS.md` for the canonical bounding-box dataset layout.

If you also want the live webcam path, install the optional live extras:

```powershell
pnpm vision:setup:live
```

Run the Streamlit lab:

```powershell
pnpm vision:streamlit
```

Or use the helper script:

```powershell
.\apps\vision-lab\run_streamlit.ps1
```

Run the FastAPI sidecar:

```powershell
pnpm dev:vision
```

Or use the helper script:

```powershell
.\apps\vision-lab\run_fastapi.ps1
```

If the module import path gives trouble from repo root on Windows, use:

```powershell
$env:PYTHONPATH="apps/vision-lab"
.\.venv\Scripts\python.exe -m uvicorn fastapi_app:app --reload --app-dir apps/vision-lab
```

## Railway Deployment

Deploy the vision sidecar as a separate Railway service from the same repo:

- Source repo: `AxiomaSystems/Chef`
- Root directory: `apps/vision-lab`
- Builder: Dockerfile
- Dockerfile path: `Dockerfile`
- Healthcheck path: `/health`
- Public networking: enabled

Railway injects `PORT`; the Dockerfile starts:

```sh
uvicorn fastapi_app:app --host 0.0.0.0 --port ${PORT:-8000}
```

After the sidecar has a public URL, set the API service env var:

```text
VISION_API_BASE_URL=https://<vision-sidecar>.up.railway.app
```

Then redeploy the API service. The web app already proxies media uploads through
the Nest API route `/api/v1/vision/detect/media`.

The Docker image includes `yolo11n.pt` from this directory for the demo path.
Custom detector/classifier checkpoints are still artifact-managed separately and
should be added through a later storage/artifact flow, not committed directly.

The image installs a small set of Debian runtime libraries required by OpenCV
and Ultralytics on `python:3.11-slim`, including `libxcb1`, `libx11-6`,
`libgl1`, `libglib2.0-0`, and `libgomp1`.

## Recommended Architecture

For the next phase, the cleanest split is:

```text
Streamlit -> Python vision core -> detector/tracker/embedding models
                                     |
FastAPI vision service --------------+
                                     |
Nest product API -> inventory/cart/user/product orchestration
```

That gives us:

- fast CV iteration in Python
- a test UI that can change aggressively
- a future service boundary the product can call
- no pressure to force ML-heavy code into the TypeScript app layer

## Current Real-Vision Step

The lab now supports two detector modes:

- `mock`: contract and workflow testing
- `yolo`: basic real image and sampled-video detection through Ultralytics YOLO

For `yolo` mode:

- upload a real image in Streamlit
- or upload a short video and sample frames from it
- the default model is `yolo11n.pt`
- if `apps/vision-lab/checkpoints/base/yolo11n.pt` exists, the YOLO detector uses it before falling back to the Ultralytics model name
- the first run may download model weights
- detections are mapped into the Chef ontology as a best-effort starting point

This is intentionally basic. It gets real image detection working before we add tracking, embeddings, or custom training.

## Inventory Workflow

The lab now includes a local runtime inventory flow:

- image upload, video upload, and live camera all resolve detections against current inventory
- red boxes mean the label already exists in inventory
- green boxes mean a new trackable item
- yellow boxes mean review before trusting
- gray boxes mean ignored

For image and video scans, new trackable items can be auto-added to the local inventory store.

The live camera flow now uses a buffered scan-session model:

- `Start Scan`
- stream overlays while buffering detections
- `Stop Scan`
- review live session results
- apply inventory once at the end

Inventory is stored locally at:

```text
apps/vision-lab/data/runtime_inventory.json
```

## Current Streamlit Modes

The active Streamlit work should stay in the bounding-box family. Choose `v1` or `v2` in the sidebar:

```text
BoundingBox
  - Video Streaming
  - Photo Upload
  - Video Upload
```

Pipeline v1 is the fallback path. Pipeline v2 adds object/session candidates before inventory stacking so video and frame-by-frame scans do not treat every detection as a new pantry item.

Segmentation tabs are hidden by default behind `ENABLE_SEGMENTATION_LAB = False` in `app.py`. Do not train or promote segmentation checkpoints for the inventory product flow unless there is a separate, explicit decision to reopen that path.

See `docs/vision-pipeline-v2.md` for the full system design and dataset automation flow.

## Current BoundingBox Video Path

The Streamlit lab now supports uploaded video scanning:

- upload a short kitchen clip
- choose a frame sampling rate
- choose a YOLO detector checkpoint for boxes
- optionally classify each detected crop with an ingredient classifier checkpoint
- review per-frame detections and preview overlays
- inspect label persistence summaries across the clip
- inspect best-detection thumbnails by label
- inspect provisional session tracks across nearby frames
- inspect distinct-instance estimates derived from those provisional tracks

This is not full live streaming yet. It is the practical bridge from image detection to stream-oriented detection.

## Current BoundingBox Live Camera Step

The Streamlit lab also now supports a first live webcam path:

- browser webcam through WebRTC
- YOLO inference on each incoming frame
- overlay boxes returned back to the browser

This is the first live-streaming milestone. It is meant for validation and iteration, not for production performance yet.

On Windows, the live camera path may require a friendlier Python/runtime combination than the base lab because `streamlit-webrtc` depends on `av`.

## Current Capabilities Summary

The lab can currently:

- detect objects in uploaded images
- detect objects across sampled video frames
- estimate repeated objects across short scans
- produce distinct-instance estimates from provisional tracks
- resolve detections into `existing`, `new`, `review`, and `ignored`
- color overlays according to inventory state
- write new trackable items into a local runtime inventory

## Current Limitations

The lab does not yet guarantee:

- kitchen-specific production accuracy
- robust duplicate resolution across long camera gaps
- reliable mobile live-stream behavior in every environment
- final product-grade persistence or backend integration

## Next Steps

- improve kitchen-specific detector accuracy with a target dataset
- add scan history and saved session review
- strengthen track and duplicate-resolution logic
- move from local lab inventory persistence toward product persistence
