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

The current detector is intentionally a mock stage-1 detector. It stabilizes the scan-session contract and lets us test inventory-facing behavior before YOLO or other models are wired in.

## Quick Start

Create and activate a virtual environment:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r apps/vision-lab/requirements.txt
```

That base install is enough for:

- single-image detection
- uploaded video scanning
- FastAPI sidecar testing

If you also want the live webcam path, install the optional live extras:

```powershell
pip install -r apps/vision-lab/requirements-live.txt
```

Run the Streamlit lab:

```powershell
streamlit run apps/vision-lab/app.py
```

Or use the helper script:

```powershell
.\apps\vision-lab\run_streamlit.ps1
```

Run the FastAPI sidecar:

```powershell
uvicorn apps.vision-lab.fastapi_app:app --reload
```

Or use the helper script:

```powershell
.\apps\vision-lab\run_fastapi.ps1
```

If the module import path gives trouble from repo root on Windows, use:

```powershell
$env:PYTHONPATH="apps/vision-lab"
uvicorn fastapi_app:app --reload --app-dir apps/vision-lab
```

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

## Current Video Path

The Streamlit lab now supports uploaded video scanning:

- upload a short kitchen clip
- choose a frame sampling rate
- run YOLO on the sampled frames
- review per-frame detections and preview overlays
- inspect label persistence summaries across the clip
- inspect best-detection thumbnails by label
- inspect provisional session tracks across nearby frames
- inspect distinct-instance estimates derived from those provisional tracks

This is not full live streaming yet. It is the practical bridge from image detection to stream-oriented detection.

## Current Live Camera Step

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
