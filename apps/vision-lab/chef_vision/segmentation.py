from __future__ import annotations

from functools import lru_cache
from typing import Any

from PIL import Image, ImageColor, ImageDraw


SEGMENTATION_COLORS = [
    "#16a34a",
    "#2563eb",
    "#ca8a04",
    "#dc2626",
    "#7c3aed",
    "#0891b2",
    "#ea580c",
    "#4d7c0f",
]


@lru_cache(maxsize=2)
def load_yolo_segmentation_model(model_name: str) -> Any:
    from ultralytics import YOLO

    return YOLO(model_name)


def run_yolo_segmentation(
    image: Image.Image,
    model_name: str,
    confidence_threshold: float,
    nms_iou_threshold: float,
    max_masks: int,
    min_mask_area_percent: float,
) -> list[dict[str, Any]]:
    model = load_yolo_segmentation_model(model_name)
    results = model(
        image,
        conf=confidence_threshold,
        iou=nms_iou_threshold,
        verbose=False,
    )
    result = results[0]
    boxes = getattr(result, "boxes", None)
    masks = getattr(result, "masks", None)

    if boxes is None or masks is None:
        return []

    names = result.names
    polygons = getattr(masks, "xy", []) or []
    mask_tensors = getattr(masks, "data", None)
    segmentations: list[dict[str, Any]] = []

    for index, box in enumerate(boxes):
        mask_tensor = mask_tensors[index] if mask_tensors is not None else None
        mask_area_percent = _mask_area_percent(mask_tensor)
        if mask_area_percent < min_mask_area_percent:
            continue

        cls_id = int(box.cls[0].item())
        confidence = round(float(box.conf[0].item()), 4)
        polygon = []
        if index < len(polygons):
            polygon = [
                (float(point[0]), float(point[1]))
                for point in polygons[index].tolist()
            ]

        segmentations.append(
            {
                "index": len(segmentations) + 1,
                "label": names.get(cls_id, str(cls_id)),
                "confidence": confidence,
                "bbox_pixels": _box_xyxy_to_pixels(box),
                "polygon": polygon,
                "mask_area_percent": mask_area_percent,
            }
        )

        if len(segmentations) >= max_masks:
            break

    return segmentations


def draw_segmentation_results(
    image: Image.Image,
    segmentations: list[dict[str, Any]],
) -> Image.Image:
    rendered = image.convert("RGBA")
    overlay = Image.new("RGBA", rendered.size, (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)

    for item in segmentations:
        color = ImageColor.getrgb(
            SEGMENTATION_COLORS[(item["index"] - 1) % len(SEGMENTATION_COLORS)]
        )
        polygon = item.get("polygon") or []
        if polygon:
            overlay_draw.polygon(polygon, fill=(*color, 90))

    rendered = Image.alpha_composite(rendered, overlay).convert("RGB")
    draw = ImageDraw.Draw(rendered)
    width, _ = rendered.size

    for item in segmentations:
        color = ImageColor.getrgb(
            SEGMENTATION_COLORS[(item["index"] - 1) % len(SEGMENTATION_COLORS)]
        )
        left, top, right, bottom = item["bbox_pixels"]
        label = f"{item['index']}. {item['label']} {item['confidence']:.2f}"

        draw.rectangle((left, top, right, bottom), outline=color, width=4)
        text_top = max(0, top - 26)
        draw.rectangle((left, text_top, min(width, left + 300), top), fill=color)
        draw.text((left + 6, text_top + 5), label, fill=(255, 255, 255))

    return rendered


def segmentation_crop(image: Image.Image, item: dict[str, Any]) -> Image.Image:
    width, height = image.size
    left, top, right, bottom = item["bbox_pixels"]
    return image.crop(
        (
            max(0, left),
            max(0, top),
            min(width, right),
            min(height, bottom),
        )
    )


def segmentation_masked_crop(image: Image.Image, item: dict[str, Any]) -> Image.Image:
    width, height = image.size
    left, top, right, bottom = item["bbox_pixels"]
    left = max(0, left)
    top = max(0, top)
    right = min(width, right)
    bottom = min(height, bottom)
    crop = image.crop((left, top, right, bottom)).convert("RGBA")
    polygon = item.get("polygon") or []

    if not polygon:
        return crop

    mask = Image.new("L", crop.size, 0)
    mask_draw = ImageDraw.Draw(mask)
    shifted_polygon = [(x - left, y - top) for x, y in polygon]
    mask_draw.polygon(shifted_polygon, fill=255)
    masked = Image.new("RGBA", crop.size, (0, 0, 0, 0))
    masked.paste(crop, (0, 0), mask)
    return masked


def _box_xyxy_to_pixels(box: Any) -> tuple[int, int, int, int]:
    x1, y1, x2, y2 = [float(value) for value in box.xyxy[0].tolist()]
    return int(x1), int(y1), int(x2), int(y2)


def _mask_area_percent(mask_tensor: Any) -> float:
    if mask_tensor is None:
        return 0.0

    mask = mask_tensor.detach().cpu().numpy()
    if mask.size == 0:
        return 0.0

    return round(float((mask > 0.5).sum() / mask.size * 100), 3)
