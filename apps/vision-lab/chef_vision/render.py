from __future__ import annotations

from io import BytesIO

from PIL import Image, ImageColor, ImageDraw, ImageFont

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

OCR_COLOR = "#22d3ee"


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
    font = _label_font(width, height)
    padding_x = max(8, round(min(width, height) * 0.012))
    padding_y = max(5, round(min(width, height) * 0.008))
    box_width = max(4, round(min(width, height) * 0.006))

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

        draw.rectangle((left, top, right, bottom), outline=color, width=box_width)

        text_bbox = draw.textbbox((0, 0), label, font=font)
        text_width = text_bbox[2] - text_bbox[0]
        text_height = text_bbox[3] - text_bbox[1]
        badge_width = min(width - left, text_width + padding_x * 2)
        badge_height = text_height + padding_y * 2
        text_anchor_top = top - badge_height
        if text_anchor_top < 0:
            text_anchor_top = top
        text_anchor_bottom = min(height, text_anchor_top + badge_height)
        text_anchor_right = min(width, left + badge_width)

        draw.rectangle(
            (left, text_anchor_top, text_anchor_right, text_anchor_bottom),
            fill=color,
        )
        draw.text(
            (left + padding_x, text_anchor_top + padding_y - text_bbox[1]),
            label,
            fill=(255, 255, 255),
            font=font,
        )

        if detection.ocr and detection.ocr.text_boxes:
            for text_box in detection.ocr.text_boxes:
                ocr_left = int(text_box.bbox.x * width)
                ocr_top = int(text_box.bbox.y * height)
                ocr_right = int((text_box.bbox.x + text_box.bbox.width) * width)
                ocr_bottom = int((text_box.bbox.y + text_box.bbox.height) * height)
                ocr_color = ImageColor.getrgb(OCR_COLOR)
                draw.rectangle(
                    (ocr_left, ocr_top, ocr_right, ocr_bottom),
                    outline=ocr_color,
                    width=max(2, box_width // 2),
                )

                ocr_label = text_box.text[:32]
                if not ocr_label:
                    continue
                ocr_bbox = draw.textbbox((0, 0), ocr_label, font=font)
                ocr_text_width = ocr_bbox[2] - ocr_bbox[0]
                ocr_text_height = ocr_bbox[3] - ocr_bbox[1]
                ocr_badge_width = min(width - ocr_left, ocr_text_width + padding_x * 2)
                ocr_badge_height = ocr_text_height + padding_y * 2
                ocr_badge_top = max(0, ocr_top - ocr_badge_height)
                draw.rectangle(
                    (
                        ocr_left,
                        ocr_badge_top,
                        min(width, ocr_left + ocr_badge_width),
                        min(height, ocr_badge_top + ocr_badge_height),
                    ),
                    fill=ocr_color,
                )
                draw.text(
                    (ocr_left + padding_x, ocr_badge_top + padding_y - ocr_bbox[1]),
                    ocr_label,
                    fill=(0, 0, 0),
                    font=font,
                )

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


def _label_font(width: int, height: int) -> ImageFont.ImageFont:
    font_size = max(24, min(64, round(min(width, height) * 0.045)))
    candidates = [
        "C:/Windows/Fonts/arialbd.ttf",
        "C:/Windows/Fonts/arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, font_size)
        except OSError:
            continue
    return ImageFont.load_default()
