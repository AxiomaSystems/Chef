from __future__ import annotations

from io import BytesIO

from PIL import Image, ImageColor, ImageDraw

from chef_vision.contracts import Detection


POLICY_COLORS = {
    "track": "#1d8348",
    "review": "#ca8a04",
    "ignore": "#6b7280",
}

STATUS_COLORS = {
    "existing": "#dc2626",
    "new": "#16a34a",
    "review": "#ca8a04",
    "ignored": "#6b7280",
}


def load_image_from_bytes(data: bytes) -> Image.Image:
    image = Image.open(BytesIO(data))
    return image.convert("RGB")


def draw_detections(
    image: Image.Image,
    detections: list[Detection],
    label_statuses: dict[str, str] | None = None,
) -> Image.Image:
    rendered = image.copy()
    draw = ImageDraw.Draw(rendered)
    width, height = rendered.size

    for detection in detections:
        left = int(detection.bbox.x * width)
        top = int(detection.bbox.y * height)
        right = int((detection.bbox.x + detection.bbox.width) * width)
        bottom = int((detection.bbox.y + detection.bbox.height) * height)
        status = label_statuses.get(detection.label) if label_statuses else None
        color = ImageColor.getrgb(
            STATUS_COLORS.get(status, POLICY_COLORS[detection.inventory_policy])
        )
        badge = status or detection.inventory_policy
        label = f"{detection.label} {detection.confidence:.2f} [{badge}]"

        draw.rectangle((left, top, right, bottom), outline=color, width=4)

        text_anchor_top = max(0, top - 22)
        draw.rectangle((left, text_anchor_top, min(width, left + 220), top), fill=color)
        draw.text((left + 6, text_anchor_top + 3), label, fill=(255, 255, 255))

    return rendered


def draw_detections_on_bgr_array(
    image_bgr,
    detections: list[Detection],
    label_statuses: dict[str, str] | None = None,
):
    image_rgb = Image.fromarray(image_bgr[:, :, ::-1])
    rendered_rgb = draw_detections(
        image_rgb,
        detections,
        label_statuses=label_statuses,
    )
    return rendered_rgb.copy()
