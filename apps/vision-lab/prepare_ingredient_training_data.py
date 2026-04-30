from __future__ import annotations

import argparse
import csv
import json
import random
import shutil
from collections import defaultdict
from pathlib import Path
from typing import Any

from PIL import Image


APP_DIR = Path(__file__).resolve().parent
DEFAULT_DATASET_DIR = APP_DIR / "data" / "hf_food_ingredient_training_import"
DEFAULT_OUTPUT_DIR = APP_DIR / "data" / "ingredient_training_dataset"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Build a train/validation/test ImageFolder dataset by running YOLO over imported "
            "ingredient images, cropping the best object box, and keeping the original ingredient label."
        )
    )
    parser.add_argument("--dataset-dir", type=Path, default=DEFAULT_DATASET_DIR)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--model-name", default="yolo11n.pt")
    parser.add_argument("--limit", type=int, default=0, help="Total source images to use. 0 means all imported rows.")
    parser.add_argument("--max-samples-per-label", type=int, default=0, help="Cap images per label. 0 means no cap.")
    parser.add_argument(
        "--min-samples-per-label",
        type=int,
        default=3,
        help="Drop labels with fewer examples than this before splitting. Use 1 only for smoke tests.",
    )
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--confidence-threshold", type=float, default=0.15)
    parser.add_argument("--crop-padding", type=float, default=0.08, help="Box padding as a fraction of box size.")
    parser.add_argument("--min-box-area", type=float, default=0.03, help="Minimum selected box area as image fraction.")
    parser.add_argument("--val-ratio", type=float, default=0.15)
    parser.add_argument("--test-ratio", type=float, default=0.15)
    parser.add_argument(
        "--fallback",
        choices=["skip", "full-image"],
        default="full-image",
        help="What to do when YOLO finds no useful crop.",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Delete and rebuild the output directory before writing.",
    )
    return parser.parse_args()


def safe_label(value: str) -> str:
    cleaned = value.removesuffix("_annotated")
    return "".join(character if character.isalnum() or character in ("-", "_") else "_" for character in cleaned)


def load_rows(dataset_dir: Path) -> list[dict[str, Any]]:
    metadata_path = dataset_dir / "metadata.json"
    if not metadata_path.exists():
        raise SystemExit(f"Missing metadata file: {metadata_path}")

    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    rows = []
    for row in metadata.get("rows", []):
        image_path_value = row.get("image_path")
        if not image_path_value:
            continue

        image_path = dataset_dir / image_path_value
        if image_path.exists():
            rows.append(
                {
                    "source_index": row.get("index"),
                    "label": row["label"],
                    "label_id": row.get("label_id"),
                    "image_path": image_path,
                    "boxes": row.get("boxes") or [],
                }
            )
    return rows


def select_rows(
    rows: list[dict[str, Any]],
    limit: int,
    max_samples_per_label: int,
    min_samples_per_label: int,
    seed: int,
) -> list[dict[str, Any]]:
    rng = random.Random(seed)
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        grouped[row["label"]].append(row)

    eligible_rows = [
        row
        for label_rows in grouped.values()
        if len(label_rows) >= min_samples_per_label
        for row in label_rows
    ]

    shuffled = eligible_rows[:]
    rng.shuffle(shuffled)

    selected = []
    per_label_counts: dict[str, int] = defaultdict(int)
    for row in shuffled:
        label = row["label"]
        if max_samples_per_label > 0 and per_label_counts[label] >= max_samples_per_label:
            continue

        selected.append(row)
        per_label_counts[label] += 1
        if limit > 0 and len(selected) >= limit:
            break

    return selected


def split_rows(rows: list[dict[str, Any]], val_ratio: float, test_ratio: float, seed: int) -> list[dict[str, Any]]:
    rng = random.Random(seed)
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        grouped[row["label"]].append(row)

    split_rows_result: list[dict[str, Any]] = []
    for label_rows in grouped.values():
        rng.shuffle(label_rows)
        count = len(label_rows)

        if count == 1:
            split_sizes = {"train": 1, "val": 0, "test": 0}
        elif count == 2:
            split_sizes = {"train": 1, "val": 1, "test": 0}
        else:
            test_count = max(1, round(count * test_ratio))
            val_count = max(1, round(count * val_ratio))
            while test_count + val_count >= count:
                if test_count >= val_count and test_count > 1:
                    test_count -= 1
                elif val_count > 1:
                    val_count -= 1
                else:
                    break
            split_sizes = {
                "train": count - val_count - test_count,
                "val": val_count,
                "test": test_count,
            }

        offset = 0
        for split_name in ("train", "val", "test"):
            for row in label_rows[offset : offset + split_sizes[split_name]]:
                split_rows_result.append({**row, "split": split_name})
            offset += split_sizes[split_name]

    rng.shuffle(split_rows_result)
    return split_rows_result


def load_yolo(model_name: str):
    try:
        from ultralytics import YOLO
    except ImportError as exc:
        raise SystemExit("Missing dependency: ultralytics. Run pip install -r apps/vision-lab/requirements.txt.") from exc

    return YOLO(model_name)


def best_box(model, image_path: Path, confidence_threshold: float) -> tuple[float, float, float, float, float] | None:
    results = model(str(image_path), conf=confidence_threshold, verbose=False)
    boxes = getattr(results[0], "boxes", None)
    if boxes is None or len(boxes) == 0:
        return None

    candidates = []
    for box in boxes:
        x1, y1, x2, y2 = [float(value) for value in box.xyxy[0].tolist()]
        confidence = float(box.conf[0].item())
        area = max(0.0, x2 - x1) * max(0.0, y2 - y1)
        candidates.append((confidence * area, confidence, x1, y1, x2, y2))

    _rank, confidence, x1, y1, x2, y2 = max(candidates, key=lambda item: item[0])
    return x1, y1, x2, y2, confidence


def best_annotation_box(row: dict[str, Any]) -> tuple[float, float, float, float, float] | None:
    boxes = row.get("boxes") or []
    candidates = []
    for box in boxes:
        x1 = float(box.get("xmin", 0))
        y1 = float(box.get("ymin", 0))
        x2 = float(box.get("xmax", 0))
        y2 = float(box.get("ymax", 0))
        area = max(0.0, x2 - x1) * max(0.0, y2 - y1)
        if area > 0:
            candidates.append((area, x1, y1, x2, y2))

    if not candidates:
        return None

    _area, x1, y1, x2, y2 = max(candidates, key=lambda item: item[0])
    return x1, y1, x2, y2, 1.0


def crop_image(
    image: Image.Image,
    box: tuple[float, float, float, float, float] | None,
    crop_padding: float,
    min_box_area: float,
    fallback: str,
) -> tuple[Image.Image | None, dict[str, Any]]:
    width, height = image.size
    if box is None:
        return fallback_crop(image, fallback, "no_detection")

    x1, y1, x2, y2, confidence = box
    box_width = max(0.0, x2 - x1)
    box_height = max(0.0, y2 - y1)
    area_fraction = (box_width * box_height) / max(1, width * height)
    if area_fraction < min_box_area:
        return fallback_crop(image, fallback, "box_too_small", confidence=confidence, area_fraction=area_fraction)

    pad_x = box_width * crop_padding
    pad_y = box_height * crop_padding
    left = max(0, int(x1 - pad_x))
    top = max(0, int(y1 - pad_y))
    right = min(width, int(x2 + pad_x))
    bottom = min(height, int(y2 + pad_y))
    return image.crop((left, top, right, bottom)), {
        "crop_source": "box",
        "confidence": round(confidence, 4),
        "box": [left, top, right, bottom],
        "area_fraction": round(area_fraction, 4),
    }


def fallback_crop(
    image: Image.Image,
    fallback: str,
    reason: str,
    confidence: float | None = None,
    area_fraction: float | None = None,
) -> tuple[Image.Image | None, dict[str, Any]]:
    metadata = {"crop_source": fallback, "fallback_reason": reason}
    if confidence is not None:
        metadata["confidence"] = round(confidence, 4)
    if area_fraction is not None:
        metadata["area_fraction"] = round(area_fraction, 4)

    if fallback == "skip":
        return None, metadata
    return image.copy(), metadata


def write_manifest(output_dir: Path, manifest: list[dict[str, Any]]) -> None:
    json_path = output_dir / "manifest.json"
    csv_path = output_dir / "manifest.csv"
    json_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    fieldnames = [
        "split",
        "label",
        "class_dir",
        "source_image",
        "output_image",
        "crop_source",
        "fallback_reason",
        "confidence",
        "area_fraction",
        "box",
    ]
    with csv_path.open("w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for item in manifest:
            row = dict(item)
            if isinstance(row.get("box"), list):
                row["box"] = json.dumps(row["box"])
            writer.writerow(row)


def main() -> None:
    args = parse_args()
    if args.overwrite and args.output_dir.exists():
        shutil.rmtree(args.output_dir)
    args.output_dir.mkdir(parents=True, exist_ok=True)

    source_rows = load_rows(args.dataset_dir)
    selected_rows = select_rows(
        source_rows,
        args.limit,
        args.max_samples_per_label,
        args.min_samples_per_label,
        args.seed,
    )
    if not selected_rows:
        raise SystemExit(
            "No eligible rows found. Import more data or lower --min-samples-per-label for a smoke test."
        )
    rows_with_splits = split_rows(selected_rows, args.val_ratio, args.test_ratio, args.seed)
    needs_yolo = any(not row.get("boxes") for row in rows_with_splits)
    model = load_yolo(args.model_name) if needs_yolo else None

    class_map = {safe_label(label): label for label in sorted({row["label"] for row in rows_with_splits})}
    for split_name in ("train", "val", "test"):
        for class_dir in class_map:
            (args.output_dir / split_name / class_dir).mkdir(parents=True, exist_ok=True)

    manifest = []

    for index, row in enumerate(rows_with_splits, start=1):
        image = Image.open(row["image_path"]).convert("RGB")
        box = best_annotation_box(row)
        crop_source = "annotation" if box else "yolo"
        if box is None and model is not None:
            box = best_box(model, row["image_path"], args.confidence_threshold)
        crop, crop_metadata = crop_image(image, box, args.crop_padding, args.min_box_area, args.fallback)
        if crop_metadata.get("crop_source") == "box":
            crop_metadata["crop_source"] = crop_source
        if crop is None:
            manifest.append(
                {
                    "split": row["split"],
                    "label": row["label"],
                    "class_dir": safe_label(row["label"]),
                    "source_image": str(row["image_path"]),
                    **crop_metadata,
                }
            )
            continue

        class_dir = safe_label(row["label"])
        output_dir = args.output_dir / row["split"] / class_dir
        output_dir.mkdir(parents=True, exist_ok=True)
        output_image = output_dir / f"{index:06d}.jpg"
        crop.save(output_image, quality=92)
        manifest.append(
            {
                "split": row["split"],
                "label": row["label"],
                "class_dir": class_dir,
                "source_image": str(row["image_path"]),
                "output_image": str(output_image),
                **crop_metadata,
            }
        )

    (args.output_dir / "class_map.json").write_text(json.dumps(class_map, indent=2), encoding="utf-8")
    write_manifest(args.output_dir, manifest)

    kept = sum(1 for item in manifest if item.get("output_image"))
    skipped = len(manifest) - kept
    print(f"Prepared {kept} cropped training images in {args.output_dir}")
    print(f"Skipped {skipped} images")
    print(f"Classes: {len(class_map)}")
    print(f"Manifest: {args.output_dir / 'manifest.json'}")


if __name__ == "__main__":
    main()
