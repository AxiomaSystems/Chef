# Vision OCR Modes

## Overview

The OCR layer now supports multiple filtering modes to optimize the balance between detection coverage and performance. Rather than a simple on/off toggle for containers, you can now choose how aggressively to OCR detected objects.

## OCR Modes

### 1. `intelligent_filtering` (Recommended Default)

**Strategy**: Smart category-based filtering with confidence thresholds.

**What gets OCR'd**:

- All items in `TEXT_BEARING_CATEGORIES`:
  - `container` (bottles, jars, cans)
  - `packaged_food` (boxes, pouches, bags with labels)
- Items matching container keyword hints (bottle, can, jar, etc.)
- Unknown/uncategorized items with **high confidence** (≥0.6)

**What's excluded**:

- `produce` (raw items rarely have labels)
- `kitchenware` (utensils, pans)
- Low-confidence detections on unknown categories

**Rationale**: Maximizes text capture while minimizing wasted OCR attempts on items unlikely to have readable labels.

**Performance**: Balanced—processes ~70-80% of detections in typical kitchen scenes.

---

### 2. `containers_only` (Legacy Default)

**Strategy**: Keyword-based filtering for container-like objects only.

**What gets OCR'd**:

- Detections with `category == "container"`
- Detections whose label contains hints: bottle, can, carton, container, jar, jug, package, packet, tin, tub

**What's excluded**:

- Everything else (produce, packaged food, kitchenware, etc.)

**Rationale**: Conservative approach; guaranteed low false-positive OCR attempts.

**Performance**: Fastest—processes ~30-40% of detections.

**Use cases**:

- Demo/testing when you only care about labeled containers
- Low-bandwidth or CPU-constrained environments
- When OCR speed is critical

---

### 3. `all_detections` (Comprehensive)

**Strategy**: OCR every detected object regardless of category.

**What gets OCR'd**:

- All detections except those in `NON_TEXT_BEARING_CATEGORIES` (produce, kitchenware)

**What's excluded**:

- `produce`
- `kitchenware`

**Rationale**: Captures text from unexpected places (prepared food containers, labels on appliances, etc.).

**Performance**: Slowest—processes ~60-90% of detections.

**Use cases**:

- Comprehensive ingredient capture in mixed food environments
- Research/analysis where coverage matters more than speed
- When you want maximum recall of text on any labeled item

---

## Configuration

### Streamlit UI

In the Streamlit app (`app.py`), select the OCR mode from the sidebar dropdown:

```
OCR filtering mode
├─ intelligent_filtering (recommended)
├─ containers_only
└─ all_detections
```

The mode applies to:

- Photo detection with OCR
- Video frame sampling with OCR
- Live camera stream OCR (throttled every N frames)

### FastAPI / Direct API

Pass the `ocr_mode` parameter in requests:

```python
from chef_vision.ocr import run_ocr_for_detections

ocr_summary = run_ocr_for_detections(
    frames=frames,
    domain_frames=result.frames,
    provider="rapidocr",
    cache_enabled=True,
    ocr_mode="intelligent_filtering",  # Choose mode here
    min_confidence=0.35,
)
```

### Live Video Processing

The live processor factory accepts the mode:

```python
from chef_vision.live import create_live_video_processor

processor_factory = create_live_video_processor(
    model_name="yolo11n.pt",
    ocr_enabled=True,
    ocr_mode="intelligent_filtering",  # Choose mode
    ocr_every_n_frames=8,
    # ... other params
)
```

---

## Architecture & Logic

### Category-Based Decisions

The system uses the `Detection.category` field as a strong signal:

```python
def _should_ocr_detection(detection: Detection, ocr_mode: OcrMode) -> bool:
    if ocr_mode == "containers_only":
        return is_container_detection(detection)

    elif ocr_mode == "all_detections":
        return detection.category not in NON_TEXT_BEARING_CATEGORIES

    elif ocr_mode == "intelligent_filtering":
        # Strong signal: category says "likely has text"
        if detection.category in TEXT_BEARING_CATEGORIES:
            return True
        # Weak signal: keyword hints
        if is_container_detection(detection):
            return True
        # Exclude known non-text items
        if detection.category in NON_TEXT_BEARING_CATEGORIES:
            return False
        # Unknown categories: high confidence = likely to have text
        return detection.confidence is not None and detection.confidence >= 0.6
```

### Text-Bearing Categories

```python
TEXT_BEARING_CATEGORIES = {
    "container",        # Bottles, jars, cans
    "packaged_food",    # Boxes, pouches, bags
}

NON_TEXT_BEARING_CATEGORIES = {
    "produce",          # Raw items
    "kitchenware",      # Utensils, pans
}
```

---

## Performance Implications

| Mode                    | Detection Coverage | OCR Calls | Typical Speed |
| ----------------------- | ------------------ | --------- | ------------- |
| `containers_only`       | ~30-40%            | Low       | Fastest       |
| `intelligent_filtering` | ~70-80%            | Medium    | Balanced      |
| `all_detections`        | ~60-90%            | High      | Slowest       |

_Speed depends on image resolution, detection count, OCR provider, and hardware._

---

## When to Use Each Mode

### Use `intelligent_filtering`:

- ✅ Production/demo scenarios
- ✅ Balanced coverage and performance
- ✅ When ingredients come in varied packaging
- ✅ Default for most use cases

### Use `containers_only`:

- ✅ Strict performance requirements
- ✅ Testing/debugging container labeling
- ✅ Low-power devices or mobile deployment
- ✅ Conservative label extraction

### Use `all_detections`:

- ✅ Research/benchmarking
- ✅ Maximizing text recall
- ✅ Mixed food environments (prepared + packaged)
- ✅ When hardware permits (GPU, fast CPU)

---

## Tuning & Future Work

### Confidence Threshold for Unknown Categories

In `intelligent_filtering`, unknown categories are OCR'd if `confidence >= 0.6`. This threshold can be adjusted:

```python
# Lower to capture more, e.g., 0.5
return detection.confidence is not None and detection.confidence >= 0.5

# Raise for fewer attempts, e.g., 0.75
return detection.confidence is not None and detection.confidence >= 0.75
```

### Adding New Categories

If your detector outputs new categories (e.g., "prepared_food", "labeled_items"), update:

```python
TEXT_BEARING_CATEGORIES = {
    "container",
    "packaged_food",
    "prepared_food",  # Add if it often has labels
}

NON_TEXT_BEARING_CATEGORIES = {
    "produce",
    "kitchenware",
    # Add "raw_produce" if needed
}
```

### PaddleOCR Integration

The current default is RapidOCR. When PaddleOCR support is added:

1. Extend `run_ocr_for_detections` to accept `provider: str` with fallback to RapidOCR
2. Add OCR provider selection to the Streamlit UI
3. Benchmark each provider on each mode
4. Update performance table above

---

## Backward Compatibility

**Old parameter** (`container_only: bool`):

- `container_only=True` → `ocr_mode="containers_only"`
- `container_only=False` → `ocr_mode="all_detections"`

The new system **replaces** the boolean with an explicit mode string. Update any custom code that passes `container_only` directly.

---

## See Also

- [Vision OCR Layer](vision-ocr-layer.md) – Cache, provider details, limitations
- [Vision Pipeline](vision-pipeline-v2.md) – Detection → tracking → resolution
- [Vision Architecture](architecture.md) – System-level design
