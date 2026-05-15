from __future__ import annotations

import hashlib
import json
import re
from dataclasses import asdict
from functools import lru_cache
from io import BytesIO
from pathlib import Path
from typing import Any, Literal

from PIL import Image

from chef_vision.contracts import BoundingBox, Detection, FrameInput, FrameResult, OcrResult, OcrTextBox


APP_DIR = Path(__file__).resolve().parents[1]
DEFAULT_OCR_CACHE_PATH = APP_DIR / "data" / "ocr_cache.json"

CONTAINER_LABEL_HINTS = (
    "bottle",
    "can",
    "carton",
    "container",
    "jar",
    "jug",
    "package",
    "packet",
    "tin",
    "tub",
)

# Object categories that typically have readable text/labels
TEXT_BEARING_CATEGORIES = {
    "container",        # Bottles, jars, cans
    "packaged_food",    # Boxes, pouches, bags with labels
}

# Categories to exclude from OCR
NON_TEXT_BEARING_CATEGORIES = {
    "produce",          # Raw items rarely have labels
    "kitchenware",      # Utensils, pans rarely have ingredient labels
}

OcrMode = Literal["containers_only", "all_detections", "intelligent_filtering"]

LABEL_KEYWORDS = [
    ("extra virgin olive oil", "olive oil"),
    ("olive oil", "olive oil"),
    ("vegetable oil", "vegetable oil"),
    ("canola oil", "canola oil"),
    ("peanut butter", "peanut butter"),
    ("almond butter", "almond butter"),
    ("whole milk", "milk"),
    ("reduced fat milk", "milk"),
    ("oat milk", "oat milk"),
    ("almond milk", "almond milk"),
    ("coconut milk", "coconut milk"),
    ("tomato sauce", "tomato sauce"),
    ("tomato paste", "tomato paste"),
    ("black beans", "black beans"),
    ("kidney beans", "kidney beans"),
    ("chickpeas", "chickpeas"),
    ("garbanzo", "chickpeas"),
    ("pasta", "pasta"),
    ("rice", "rice"),
    ("flour", "flour"),
    ("sugar", "sugar"),
    ("salt", "salt"),
    ("pepper", "pepper"),
    ("honey", "honey"),
    ("oats", "oats"),
    ("yogurt", "yogurt"),
]

NOISY_LABEL_WORDS = {
    "calories",
    "contains",
    "distributed",
    "facts",
    "ingredients",
    "nutrition",
    "serving",
    "servings",
    "total",
    "warning",
    "weight",
}


def run_ocr_for_detections(
    *,
    frames: list[FrameInput],
    domain_frames: list[FrameResult],
    provider: str = "rapidocr",
    cache_enabled: bool = True,
    ocr_mode: OcrMode = "intelligent_filtering",
    container_only: bool | None = None,
    min_confidence: float = 0.35,
    padding_fraction: float = 0.08,
    cache_path: Path = DEFAULT_OCR_CACHE_PATH,
) -> dict:
    """
    Run OCR on detected objects using the specified mode.
    
    Modes:
    - containers_only: OCR only container-like objects (backward compatible)
    - all_detections: OCR every detection regardless of category
    - intelligent_filtering: OCR objects likely to have text (containers + packaged food)
    """
    if container_only is not None:
        ocr_mode = "containers_only" if container_only else "all_detections"

    provider = (provider or "rapidocr").strip().lower()
    min_confidence = max(0.0, min(float(min_confidence), 1.0))
    frame_paths = {frame.frame_id: frame.image_path for frame in frames if frame.image_path}
    summary = {
        "enabled": True,
        "provider": provider,
        "cache_enabled": cache_enabled,
        "container_only": container_only,
        "ocr_mode": ocr_mode,
        "min_confidence": min_confidence,
        "processed_detection_count": 0,
        "cache_hit_count": 0,
        "text_box_count": 0,
        "warnings": [],
    }

    if provider != "rapidocr":
        summary["enabled"] = False
        summary["reason"] = f"Unsupported OCR provider: {provider}"
        return summary

    try:
        engine = _rapidocr_engine()
    except Exception as exc:
        summary["enabled"] = False
        summary["reason"] = (
            "RapidOCR is not available. Install apps/vision-lab requirements, "
            "or run `python -m pip install rapidocr>=3.4` in the active venv."
        )
        summary["warnings"].append(str(exc))
        return summary

    cache = _load_cache(cache_path) if cache_enabled else {}

    for frame_result in domain_frames:
        image_path = frame_paths.get(frame_result.frame_id)
        if not image_path:
            continue
        image = Image.open(image_path).convert("RGB")

        for detection in frame_result.detections:
            if not _should_ocr_detection(detection, ocr_mode):
                continue

            crop_data = crop_detection_with_padding(
                image,
                detection,
                padding_fraction=padding_fraction,
            )
            if crop_data is None:
                continue

            crop, crop_box = crop_data
            cache_key = _crop_cache_key(crop, provider=provider)
            cached = cache.get(cache_key) if cache_enabled else None
            if cached:
                detection.ocr = _ocr_result_from_cache(
                    cached,
                    provider=provider,
                    cache_key=cache_key,
                )
                summary["cache_hit_count"] += 1
            else:
                detection.ocr = _run_rapidocr_on_crop(
                    engine=engine,
                    crop=crop,
                    crop_box=crop_box,
                    image_size=image.size,
                    provider=provider,
                    cache_key=cache_key,
                    min_confidence=min_confidence,
                )
                if cache_enabled:
                    cache[cache_key] = _cache_payload(detection.ocr)

            summary["processed_detection_count"] += 1
            if detection.ocr:
                summary["text_box_count"] += len(detection.ocr.text_boxes)

    if cache_enabled:
        _save_cache(cache_path, cache)

    return summary


def run_ocr_for_frame_image(
    *,
    image: Image.Image,
    frame_result: FrameResult,
    provider: str = "rapidocr",
    ocr_mode: OcrMode = "intelligent_filtering",
    container_only: bool | None = None,
    min_confidence: float = 0.35,
    padding_fraction: float = 0.08,
) -> dict:
    """Run OCR on a frame image using the specified mode."""
    if container_only is not None:
        ocr_mode = "containers_only" if container_only else "all_detections"

    provider = (provider or "rapidocr").strip().lower()
    summary = {
        "enabled": True,
        "provider": provider,
        "container_only": container_only,
        "ocr_mode": ocr_mode,
        "processed_detection_count": 0,
        "text_box_count": 0,
        "warnings": [],
    }
    if provider != "rapidocr":
        summary["enabled"] = False
        summary["reason"] = f"Unsupported OCR provider: {provider}"
        return summary
    try:
        engine = _rapidocr_engine()
    except Exception as exc:
        summary["enabled"] = False
        summary["reason"] = "RapidOCR is not available."
        summary["warnings"].append(str(exc))
        return summary

    image = image.convert("RGB")
    for detection in frame_result.detections:
        if not _should_ocr_detection(detection, ocr_mode):
            continue
        crop_data = crop_detection_with_padding(
            image,
            detection,
            padding_fraction=padding_fraction,
        )
        if crop_data is None:
            continue
        crop, crop_box = crop_data
        detection.ocr = _run_rapidocr_on_crop(
            engine=engine,
            crop=crop,
            crop_box=crop_box,
            image_size=image.size,
            provider=provider,
            cache_key=None,
            min_confidence=max(0.0, min(float(min_confidence), 1.0)),
        )
        summary["processed_detection_count"] += 1
        summary["text_box_count"] += len(detection.ocr.text_boxes)

    return summary


def is_container_detection(detection: Detection) -> bool:
    if detection.category == "container":
        return True
    label = " ".join(
        value
        for value in [detection.label, detection.detector_label or ""]
        if value
    ).lower()
    return any(hint in label for hint in CONTAINER_LABEL_HINTS)


def _should_ocr_detection(detection: Detection, ocr_mode: OcrMode) -> bool:
    """Determine if a detection should be OCR'd based on the selected mode."""
    if ocr_mode == "containers_only":
        return is_container_detection(detection)
    
    elif ocr_mode == "all_detections":
        # OCR everything except explicitly marked non-text-bearing items
        return detection.category not in NON_TEXT_BEARING_CATEGORIES
    
    elif ocr_mode == "intelligent_filtering":
        # Strong signal: explicit text-bearing category
        if detection.category in TEXT_BEARING_CATEGORIES:
            return True
        # Weak signal: keyword hints for containers
        if is_container_detection(detection):
            return True
        # Exclude known non-text-bearing categories
        if detection.category in NON_TEXT_BEARING_CATEGORIES:
            return False
        # For unknown/other categories: include if confidence is high enough
        # (suggestion: adjust threshold based on your accuracy requirements)
        return detection.confidence is not None and detection.confidence >= 0.6
    
    return False


def crop_detection_with_padding(
    image: Image.Image,
    detection: Detection,
    *,
    padding_fraction: float = 0.08,
) -> tuple[Image.Image, tuple[int, int, int, int]] | None:
    width, height = image.size
    left = int(detection.bbox.x * width)
    top = int(detection.bbox.y * height)
    right = int((detection.bbox.x + detection.bbox.width) * width)
    bottom = int((detection.bbox.y + detection.bbox.height) * height)
    pad_x = int((right - left) * max(0.0, padding_fraction))
    pad_y = int((bottom - top) * max(0.0, padding_fraction))
    left = max(0, left - pad_x)
    top = max(0, top - pad_y)
    right = min(width, right + pad_x)
    bottom = min(height, bottom + pad_y)
    if right <= left or bottom <= top:
        return None
    return image.crop((left, top, right, bottom)), (left, top, right, bottom)


def suggest_label_from_text(text: str) -> str | None:
    normalized = _normalize_text(text)
    compact = re.sub(r"[^a-z0-9]+", "", normalized)
    if not normalized:
        return None

    for needle, label in LABEL_KEYWORDS:
        needle_compact = re.sub(r"[^a-z0-9]+", "", needle)
        if needle in normalized or needle_compact in compact:
            return label

    for line in text.splitlines():
        words = re.findall(r"[A-Za-z][A-Za-z0-9&' -]{1,28}", line)
        cleaned = " ".join(word.strip(" -") for word in words).strip()
        cleaned_lower = cleaned.lower()
        if (
            len(cleaned) >= 3
            and len(cleaned) <= 36
            and not any(word in cleaned_lower.split() for word in NOISY_LABEL_WORDS)
        ):
            return cleaned.title()

    return None


@lru_cache(maxsize=1)
def _rapidocr_engine():
    from rapidocr import RapidOCR

    return RapidOCR()


def _run_rapidocr_on_crop(
    *,
    engine: Any,
    crop: Image.Image,
    crop_box: tuple[int, int, int, int],
    image_size: tuple[int, int],
    provider: str,
    cache_key: str | None,
    min_confidence: float,
) -> OcrResult:
    try:
        raw_result = engine(_pil_to_numpy(crop))
    except Exception as exc:
        return OcrResult(
            enabled=False,
            provider=provider,
            cache_key=cache_key,
            warnings=[f"OCR failed: {exc}"],
        )

    text_boxes = [
        box
        for box in _parse_rapidocr_result(
            raw_result,
            crop_box=crop_box,
            image_size=image_size,
        )
        if box.confidence >= min_confidence and box.text.strip()
    ]
    text = "\n".join(box.text for box in text_boxes)
    return OcrResult(
        enabled=True,
        provider=provider,
        cache_key=cache_key,
        cache_hit=False,
        text=text,
        suggested_label=suggest_label_from_text(text),
        text_boxes=text_boxes,
    )


def _parse_rapidocr_result(
    raw_result: Any,
    *,
    crop_box: tuple[int, int, int, int],
    image_size: tuple[int, int],
) -> list[OcrTextBox]:
    candidate = raw_result
    if hasattr(raw_result, "boxes") and hasattr(raw_result, "txts"):
        boxes = getattr(raw_result, "boxes")
        texts = getattr(raw_result, "txts")
        scores = getattr(raw_result, "scores", None)
        boxes = [] if boxes is None else boxes
        texts = [] if texts is None else texts
        scores = [1.0] * len(texts) if scores is None else scores
        candidate = list(zip(boxes, texts, scores))
    elif isinstance(raw_result, tuple) and raw_result:
        candidate = raw_result[0]
    elif hasattr(raw_result, "to_list"):
        candidate = raw_result.to_list()

    if candidate is None:
        return []

    parsed: list[OcrTextBox] = []
    for item in candidate:
        parsed_item = _parse_rapidocr_item(item)
        if parsed_item is None:
            continue
        points, text, confidence = parsed_item
        bbox = _points_to_normalized_bbox(points, crop_box, image_size)
        if bbox is None:
            continue
        parsed.append(
            OcrTextBox(
                text=str(text).strip(),
                confidence=round(float(confidence), 6),
                bbox=bbox,
            )
        )
    return parsed


def _parse_rapidocr_item(item: Any) -> tuple[list[tuple[float, float]], str, float] | None:
    if isinstance(item, dict):
        points = item.get("points") or item.get("box") or item.get("dt_polys")
        text = item.get("text") or item.get("rec_text") or item.get("txt")
        confidence = item.get("score") or item.get("confidence") or item.get("rec_score") or 0.0
    elif isinstance(item, (list, tuple)) and len(item) >= 3:
        points, text, confidence = item[0], item[1], item[2]
    else:
        return None

    if points is None or text is None:
        return None

    flattened_points: list[tuple[float, float]] = []
    for point in points:
        if hasattr(point, "__len__") and len(point) >= 2:
            flattened_points.append((float(point[0]), float(point[1])))

    if not flattened_points:
        return None

    return flattened_points, str(text), float(confidence)


def _points_to_normalized_bbox(
    points: list[tuple[float, float]],
    crop_box: tuple[int, int, int, int],
    image_size: tuple[int, int],
) -> BoundingBox | None:
    image_width, image_height = image_size
    crop_left, crop_top, _, _ = crop_box
    xs = [point[0] + crop_left for point in points]
    ys = [point[1] + crop_top for point in points]
    left = max(0.0, min(xs))
    top = max(0.0, min(ys))
    right = min(float(image_width), max(xs))
    bottom = min(float(image_height), max(ys))
    if right <= left or bottom <= top or image_width <= 0 or image_height <= 0:
        return None
    return BoundingBox(
        x=left / image_width,
        y=top / image_height,
        width=(right - left) / image_width,
        height=(bottom - top) / image_height,
    )


def _pil_to_numpy(image: Image.Image):
    import numpy as np

    return np.asarray(image.convert("RGB"))


def _crop_cache_key(crop: Image.Image, *, provider: str) -> str:
    buffer = BytesIO()
    crop.convert("RGB").save(buffer, format="JPEG", quality=90)
    digest = hashlib.sha256(buffer.getvalue()).hexdigest()
    return f"{provider}:{digest}"


def _load_cache(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def _save_cache(path: Path, cache: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(cache, indent=2, sort_keys=True), encoding="utf-8")


def _cache_payload(result: OcrResult | None) -> dict:
    if result is None:
        return {}
    payload = asdict(result)
    payload["cache_hit"] = False
    return payload


def _ocr_result_from_cache(payload: dict, *, provider: str, cache_key: str) -> OcrResult:
    boxes = [
        OcrTextBox(
            text=str(item.get("text", "")),
            confidence=float(item.get("confidence", 0.0)),
            bbox=BoundingBox(**item.get("bbox", {})),
        )
        for item in payload.get("text_boxes", [])
        if item.get("bbox")
    ]
    return OcrResult(
        enabled=bool(payload.get("enabled", True)),
        provider=str(payload.get("provider") or provider),
        cache_key=cache_key,
        cache_hit=True,
        text=str(payload.get("text") or ""),
        suggested_label=payload.get("suggested_label"),
        text_boxes=boxes,
        warnings=[str(warning) for warning in payload.get("warnings", [])],
    )


def _normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text.casefold()).strip()
