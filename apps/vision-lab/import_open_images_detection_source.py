from __future__ import annotations

import argparse
import csv
import json
import shutil
from collections import defaultdict
from pathlib import Path
from typing import Any

from PIL import Image


APP_DIR = Path(__file__).resolve().parent
DEFAULT_OUTPUT_ROOT = APP_DIR / "data" / "sources"

DEFAULT_TARGET_CLASSES = [
    "Bottle",
    "Bowl",
    "Coffee cup",
    "Mug",
    "Measuring cup",
    "Plate",
    "Tin can",
    "Box",
    "Apple",
    "Banana",
    "Orange (fruit)",
    "Carrot",
    "Tomato",
]

IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png", ".webp")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Import an Open Images bounding-box CSV subset into Chef source_manifest.json format. "
            "Use Open Images bbox annotations, not image labels."
        )
    )
    parser.add_argument("--source-id", required=True)
    parser.add_argument("--split", choices=("train", "validation", "test"), default="train")
    parser.add_argument("--annotations-csv", type=Path, required=True)
    parser.add_argument("--class-descriptions-csv", type=Path, required=True)
    parser.add_argument("--images-dir", type=Path, default=None)
    parser.add_argument("--output-root", type=Path, default=DEFAULT_OUTPUT_ROOT)
    parser.add_argument("--target-class", action="append", default=[])
    parser.add_argument("--limit-images", type=int, default=0)
    parser.add_argument("--limit-boxes-per-class", type=int, default=0)
    parser.add_argument("--include-group-of", action="store_true")
    parser.add_argument("--copy-images", action="store_true")
    parser.add_argument("--overwrite", action="store_true")
    return parser.parse_args()


def load_class_descriptions(path: Path) -> dict[str, str]:
    lookup: dict[str, str] = {}
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.reader(handle)
        for row in reader:
            if len(row) < 2:
                continue
            lookup[row[0].lstrip("\ufeff").strip()] = row[1].strip()
    return lookup


def normalize_label(value: str) -> str:
    return " ".join(value.lower().replace("_", " ").strip().split())


def resolve_target_mids(class_lookup: dict[str, str], target_classes: list[str]) -> set[str]:
    normalized_targets = {normalize_label(label) for label in target_classes}
    return {
        mid
        for mid, display_name in class_lookup.items()
        if normalize_label(display_name) in normalized_targets
    }


def find_image_path(images_dir: Path | None, image_id: str, split: str) -> Path | None:
    if images_dir is None:
        return None

    candidates = []
    for extension in IMAGE_EXTENSIONS:
        candidates.extend(
            [
                images_dir / split / f"{image_id}{extension}",
                images_dir / f"{image_id}{extension}",
            ]
        )

    for candidate in candidates:
        if candidate.exists():
            return candidate
    return None


def image_size(path: Path) -> tuple[int, int]:
    with Image.open(path) as image:
        return image.size


def import_rows(args: argparse.Namespace) -> tuple[list[dict[str, Any]], dict[str, Any], list[str]]:
    class_lookup = load_class_descriptions(args.class_descriptions_csv)
    target_classes = args.target_class or DEFAULT_TARGET_CLASSES
    target_mids = resolve_target_mids(class_lookup, target_classes)
    if not target_mids:
        raise SystemExit("No target classes matched the Open Images class descriptions.")

    annotations_by_image: dict[str, list[dict[str, Any]]] = defaultdict(list)
    box_counts_by_label: dict[str, int] = defaultdict(int)
    skipped = {
        "non_target_class": 0,
        "group_of": 0,
        "missing_image": 0,
        "class_limit": 0,
    }

    with args.annotations_csv.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            label_mid = row.get("LabelName", "")
            if label_mid not in target_mids:
                skipped["non_target_class"] += 1
                continue
            if not args.include_group_of and row.get("IsGroupOf") == "1":
                skipped["group_of"] += 1
                continue

            display_name = class_lookup.get(label_mid, label_mid)
            if args.limit_boxes_per_class > 0 and box_counts_by_label[display_name] >= args.limit_boxes_per_class:
                skipped["class_limit"] += 1
                continue

            image_id = row.get("ImageID", "")
            if not image_id:
                continue

            annotations_by_image[image_id].append(
                {
                    "source_label": display_name,
                    "bbox": {
                        "xmin": float(row["XMin"]),
                        "ymin": float(row["YMin"]),
                        "xmax": float(row["XMax"]),
                        "ymax": float(row["YMax"]),
                    },
                    "open_images": {
                        "label_mid": label_mid,
                        "source": row.get("Source"),
                        "is_occluded": row.get("IsOccluded"),
                        "is_truncated": row.get("IsTruncated"),
                        "is_group_of": row.get("IsGroupOf"),
                        "is_depiction": row.get("IsDepiction"),
                        "is_inside": row.get("IsInside"),
                    },
                }
            )
            box_counts_by_label[display_name] += 1

    rows = []
    requested_image_ids = []
    selected_image_count = 0
    for image_id, annotations in sorted(annotations_by_image.items()):
        if args.limit_images > 0 and selected_image_count >= args.limit_images:
            break

        image_path = find_image_path(args.images_dir, image_id, args.split)
        requested_image_ids.append(f"{args.split}/{image_id}")
        selected_image_count += 1
        if image_path is None:
            skipped["missing_image"] += 1
            continue

        width, height = image_size(image_path)
        rows.append(
            {
                "source_index": image_id,
                "image_path": str(image_path),
                "width": width,
                "height": height,
                "annotations": [
                    {
                        **annotation,
                        "bbox": {
                            "xmin": annotation["bbox"]["xmin"] * width,
                            "ymin": annotation["bbox"]["ymin"] * height,
                            "xmax": annotation["bbox"]["xmax"] * width,
                            "ymax": annotation["bbox"]["ymax"] * height,
                        },
                    }
                    for annotation in annotations
                ],
            }
        )

    report = {
        "target_classes": target_classes,
        "target_mids": sorted(target_mids),
        "box_counts_by_label": dict(sorted(box_counts_by_label.items())),
        "skipped": skipped,
        "matched_image_count": len(annotations_by_image),
        "imported_image_count": len(rows),
    }
    return rows, report, requested_image_ids


def write_source(
    args: argparse.Namespace,
    rows: list[dict[str, Any]],
    report: dict[str, Any],
    requested_image_ids: list[str],
) -> Path:
    output_dir = args.output_root / args.source_id
    if output_dir.exists() and args.overwrite:
        shutil.rmtree(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    images_dir = output_dir / "images"
    if args.copy_images:
        images_dir.mkdir(exist_ok=True)

    normalized_rows = []
    for index, row in enumerate(rows, start=1):
        image_path = Path(row["image_path"])
        if args.copy_images:
            copied_path = images_dir / f"{index:06d}{image_path.suffix.lower() or '.jpg'}"
            shutil.copy2(image_path, copied_path)
            stored_image_path = copied_path.relative_to(output_dir)
        else:
            stored_image_path = image_path.resolve()
        normalized_rows.append({**row, "image_path": str(stored_image_path)})

    manifest = {
        "schema_version": 1,
        "source_id": args.source_id,
        "source_type": "detection",
        "source_dataset": "open-images-v7",
        "source_split": args.split,
        "row_count": len(normalized_rows),
        "rows": normalized_rows,
    }
    manifest_path = output_dir / "source_manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    (output_dir / "import_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    (output_dir / "open_images_image_ids.txt").write_text(
        "\n".join(requested_image_ids) + ("\n" if requested_image_ids else ""),
        encoding="utf-8",
    )
    return manifest_path


def main() -> None:
    args = parse_args()
    rows, report, requested_image_ids = import_rows(args)
    manifest_path = write_source(args, rows, report, requested_image_ids)
    print(
        json.dumps(
            {
                "source_manifest": str(manifest_path),
                "row_count": len(rows),
                "image_ids": str(manifest_path.parent / "open_images_image_ids.txt"),
                "report": str(manifest_path.parent / "import_report.json"),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
