# Vision OCR Layer

## Decision

OCR is a post-detection layer, not a replacement detector.

The detector still decides where objects are. OCR only runs on selected detections based on the active **OCR mode** and returns text boxes plus a suggested inventory label for user review.

## OCR Modes (v2)

The system now supports multiple filtering strategies:

- **`intelligent_filtering`** (recommended default): Categories + confidence-based selection. Maximizes text capture while minimizing wasted OCR on non-text-bearing items.
- **`containers_only`**: Legacy mode. Keyword-based container detection only.
- **`all_detections`**: Comprehensive mode. OCR everything except known non-text-bearing categories (produce, kitchenware).

See [Vision OCR Modes](vision-ocr-modes.md) for detailed comparison, configuration, and tuning guidance.

## Default Provider

Default provider: `rapidocr`

Reason:

- lightweight local inference path through RapidOCR
- works well as a CPU-friendly layer for bottles, cans, jars, cartons, and packages
- easier to run inside the current FastAPI and Streamlit vision lab than a full PaddleOCR server path

PaddleOCR PP-OCRv5 is still the likely higher-accuracy benchmark candidate, especially server models, but it is heavier and should be added as a separate benchmark mode before becoming the live default.

## Runtime Flow

1. YOLO detector runs on the photo, sampled video frame, or live frame.
2. OCR filters detections to containers by default.
3. Each selected detection is cropped with small padding.
4. RapidOCR reads text from the crop.
5. OCR text boxes are converted back into normalized frame coordinates.
6. The annotated image draws both object boxes and cyan OCR text boxes.
7. The response includes:
   - `detection.ocr.text`
   - `detection.ocr.suggested_label`
   - `detection.ocr.text_boxes[]`
   - top-level `ocr` run metadata
8. The web inventory modal lets the user approve, rename, or discard the item.

## Main App Settings

The current web implementation stores OCR preferences in browser `localStorage` under:

`chef_vision_ocr_settings_v1`

Current settings:

- OCR enabled
- OCR mode (intelligent_filtering, containers_only, all_detections)
- use local OCR cache
- OCR text confidence threshold

This is intentionally local for demo speed. A later admin/global settings panel can standardize these values for all users.

## Local Cache

The FastAPI OCR layer stores crop OCR results in:

`apps/vision-lab/data/ocr_cache.json`

The cache key is based on provider plus a SHA-256 hash of the cropped image bytes.

## Streamlit

Streamlit now has OCR controls in:

- BoundingBox photo detection
- BoundingBox video detection
- BoundingBox live stream

Live OCR is throttled every N frames because OCR on every frame can wreck FPS. The default live toggle is off; enable it only when testing label highlighting.

## API Fields

`/detect/media` accepts:

- `ocr_enabled`
- `ocr_provider` (currently only "rapidocr")
- `ocr_mode` ("intelligent_filtering", "containers_only", "all_detections")
- `ocr_cache_enabled`
- `ocr_min_confidence`

The Nest API forwards the same fields to the Python sidecar.

## Known Limitations

- OCR quality depends heavily on motion blur, glare, label angle, and crop size.
- The current label suggestion is rule-based. It is intentionally conservative and review-first.
- RapidOCR dependency must be installed in the active vision-lab Python environment.
- Live OCR is throttled and may show OCR boxes only intermittently.

## Next Benchmark

Add a PaddleOCR PP-OCRv5 benchmark lane:

- `PP-OCRv5_mobile` for real-time CPU/GPU comparison
- `PP-OCRv5_server` for accuracy comparison on still images and videos
- measure OCR latency per crop, text-box recall, and user-accepted label rate
