from __future__ import annotations

import argparse
import json
import re
import shutil
from pathlib import Path
from typing import Any


APP_DIR = Path(__file__).resolve().parent
DEFAULT_OUTPUT_ROOT = APP_DIR / "data" / "sources"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Import a Hugging Face object-detection dataset into Chef source_manifest.json format."
    )
    parser.add_argument("--dataset-id", required=True)
    parser.add_argument("--source-id", required=True)
    parser.add_argument("--split", default="train")
    parser.add_argument("--limit", type=int, default=5000)
    parser.add_argument("--output-root", type=Path, default=DEFAULT_OUTPUT_ROOT)
    parser.add_argument("--image-column", default="image")
    parser.add_argument("--objects-column", default="objects")
    parser.add_argument("--bbox-key", default="bbox")
    parser.add_argument("--category-key", default="category")
    parser.add_argument("--bbox-format", choices=("xywh", "xyxy"), default="xywh")
    parser.add_argument("--streaming", action="store_true", default=True)
    parser.add_argument("--no-streaming", dest="streaming", action="store_false")
    parser.add_argument("--strip-leading-category-id", action="store_true", default=True)
    parser.add_argument("--overwrite", action="store_true")
    return parser.parse_args()


def class_names_from_features(dataset: Any, objects_column: str, category_key: str) -> list[str]:
    feature = dataset.features
    try:
        category_feature = feature[objects_column][category_key].feature
    except Exception:
        return []
    return list(getattr(category_feature, "names", []) or [])


def clean_label(label: str, strip_leading_category_id: bool) -> str:
    cleaned = label.strip()
    if strip_leading_category_id:
        cleaned = re.sub(r"^\d+[_\-\s]+", "", cleaned)
    return cleaned.replace("_", " ").strip()


def resolve_label(
    category: Any,
    class_names: list[str],
    strip_leading_category_id: bool,
) -> str:
    if isinstance(category, int) and 0 <= category < len(class_names):
        return clean_label(class_names[category], strip_leading_category_id)
    return clean_label(str(category), strip_leading_category_id)


def bbox_to_xyxy(bbox: list[float], bbox_format: str) -> dict[str, float]:
    if bbox_format == "xyxy":
        xmin, ymin, xmax, ymax = bbox[:4]
        return {"xmin": float(xmin), "ymin": float(ymin), "xmax": float(xmax), "ymax": float(ymax)}

    x, y, width, height = bbox[:4]
    return {
        "xmin": float(x),
        "ymin": float(y),
        "xmax": float(x) + float(width),
        "ymax": float(y) + float(height),
    }


def main() -> None:
    args = parse_args()
    try:
        from datasets import load_dataset
    except ImportError as exc:
        raise SystemExit(
            "Missing dependency: datasets. Run `pnpm vision:setup` first."
        ) from exc

    output_dir = args.output_root / args.source_id
    if output_dir.exists() and args.overwrite:
        shutil.rmtree(output_dir)
    images_dir = output_dir / "images"
    images_dir.mkdir(parents=True, exist_ok=True)

    dataset = load_dataset(
        args.dataset_id,
        split=args.split,
        streaming=args.streaming,
    )
    class_names = class_names_from_features(dataset, args.objects_column, args.category_key)
    rows = []

    for index, row in enumerate(dataset, start=1):
        if args.limit > 0 and index > args.limit:
            break

        image = row.get(args.image_column)
        objects = row.get(args.objects_column) or {}
        bboxes = objects.get(args.bbox_key) or []
        categories = objects.get(args.category_key) or []
        if image is None or not bboxes or not categories:
            continue

        width, height = image.size
        image_path = images_dir / f"{index:06d}.jpg"
        image.convert("RGB").save(image_path, quality=92)

        annotations = []
        for bbox, category in zip(bboxes, categories):
            if len(bbox) < 4:
                continue
            annotations.append(
                {
                    "source_label": resolve_label(
                        category,
                        class_names,
                        args.strip_leading_category_id,
                    ),
                    "bbox": bbox_to_xyxy(bbox, args.bbox_format),
                }
            )
        if annotations:
            rows.append(
                {
                    "source_index": index,
                    "image_path": str(image_path.relative_to(output_dir)),
                    "width": width,
                    "height": height,
                    "annotations": annotations,
                }
            )

    manifest = {
        "schema_version": 1,
        "source_id": args.source_id,
        "source_type": "detection",
        "source_dataset": args.dataset_id,
        "source_split": args.split,
        "row_count": len(rows),
        "rows": rows,
    }
    manifest_path = output_dir / "source_manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps({"source_manifest": str(manifest_path), "row_count": len(rows)}, indent=2))


if __name__ == "__main__":
    main()

