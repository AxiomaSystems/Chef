from __future__ import annotations

import argparse
import math
from pathlib import Path

from PIL import Image, ImageColor, ImageDraw


APP_DIR = Path(__file__).resolve().parent
DEFAULT_DATASET_DIR = APP_DIR / "data" / "datasets" / "segmentation" / "foodseg103-smoke"
DEFAULT_OUTPUT_DIR = APP_DIR / "data" / "previews" / "segmentation"

COLORS = [
    "#16a34a",
    "#2563eb",
    "#ca8a04",
    "#dc2626",
    "#7c3aed",
    "#0891b2",
    "#ea580c",
    "#4d7c0f",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Render a contact sheet preview for a YOLO segmentation dataset."
    )
    parser.add_argument("--dataset-dir", type=Path, default=DEFAULT_DATASET_DIR)
    parser.add_argument("--split", choices=["train", "val", "test"], default="train")
    parser.add_argument("--limit", type=int, default=12)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--thumb-width", type=int, default=420)
    return parser.parse_args()


def load_class_names(data_yaml: Path) -> dict[int, str]:
    names: dict[int, str] = {}
    in_names = False
    for line in data_yaml.read_text(encoding="utf-8").splitlines():
        if line.strip() == "names:":
            in_names = True
            continue
        if not in_names:
            continue
        if not line.startswith("  "):
            break
        key, _, value = line.strip().partition(":")
        if key.isdigit():
            names[int(key)] = value.strip()
    return names


def label_path_for_image(dataset_dir: Path, split: str, image_path: Path) -> Path:
    return dataset_dir / "labels" / split / f"{image_path.stem}.txt"


def parse_label_file(label_path: Path) -> list[tuple[int, list[float]]]:
    rows = []
    if not label_path.exists():
        return rows

    for line in label_path.read_text(encoding="utf-8").splitlines():
        values = line.split()
        if len(values) < 7:
            continue
        class_id = int(values[0])
        coordinates = [float(value) for value in values[1:]]
        if len(coordinates) % 2 != 0:
            continue
        rows.append((class_id, coordinates))
    return rows


def render_preview(
    image_path: Path,
    label_path: Path,
    class_names: dict[int, str],
    thumb_width: int,
) -> Image.Image:
    image = Image.open(image_path).convert("RGB")
    width, height = image.size
    rendered = image.convert("RGBA")
    overlay = Image.new("RGBA", rendered.size, (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    draw = ImageDraw.Draw(rendered)

    rows = parse_label_file(label_path)
    for index, (class_id, coordinates) in enumerate(rows, start=1):
        color = ImageColor.getrgb(COLORS[(index - 1) % len(COLORS)])
        points = [
            (
                max(0, min(width - 1, coordinates[offset] * width)),
                max(0, min(height - 1, coordinates[offset + 1] * height)),
            )
            for offset in range(0, len(coordinates), 2)
        ]
        if len(points) < 3:
            continue

        overlay_draw.polygon(points, fill=(*color, 90))
        draw.line(points + [points[0]], fill=color, width=max(2, width // 220))
        left = min(x for x, _ in points)
        top = min(y for _, y in points)
        label = f"{index}. {class_names.get(class_id, str(class_id))}"
        text_top = max(0, int(top) - 24)
        draw.rectangle((left, text_top, min(width, left + 260), text_top + 24), fill=color)
        draw.text((left + 6, text_top + 5), label, fill=(255, 255, 255))

    rendered = Image.alpha_composite(rendered, overlay).convert("RGB")
    scale = thumb_width / rendered.width
    return rendered.resize((thumb_width, max(1, int(rendered.height * scale))))


def make_contact_sheet(images: list[Image.Image], columns: int = 3) -> Image.Image:
    if not images:
        raise ValueError("No preview images to render.")

    cell_width = max(image.width for image in images)
    cell_height = max(image.height for image in images)
    rows = math.ceil(len(images) / columns)
    sheet = Image.new("RGB", (cell_width * columns, cell_height * rows), "white")

    for index, image in enumerate(images):
        x = (index % columns) * cell_width
        y = (index // columns) * cell_height
        sheet.paste(image, (x, y))

    return sheet


def main() -> None:
    args = parse_args()
    image_dir = args.dataset_dir / "images" / args.split
    if not image_dir.exists():
        raise SystemExit(f"Missing image split directory: {image_dir}")

    class_names = load_class_names(args.dataset_dir / "data.yaml")
    image_paths = sorted(
        path for path in image_dir.iterdir() if path.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
    )[: args.limit]
    if not image_paths:
        raise SystemExit(f"No images found in {image_dir}")

    args.output_dir.mkdir(parents=True, exist_ok=True)
    previews = []
    for image_path in image_paths:
        preview = render_preview(
            image_path=image_path,
            label_path=label_path_for_image(args.dataset_dir, args.split, image_path),
            class_names=class_names,
            thumb_width=args.thumb_width,
        )
        preview_path = args.output_dir / f"{args.dataset_dir.name}_{args.split}_{image_path.stem}.jpg"
        preview.save(preview_path, quality=90)
        previews.append(preview)

    sheet = make_contact_sheet(previews)
    sheet_path = args.output_dir / f"{args.dataset_dir.name}_{args.split}_contact_sheet.jpg"
    sheet.save(sheet_path, quality=90)
    print(sheet_path)


if __name__ == "__main__":
    main()
