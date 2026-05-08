from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path
from typing import Any

import cv2
import numpy as np

from prepare_foodseg103_segmentation_data import CLASS_PRESETS, DATASET_ID, FOODSEG103_CLASSES


APP_DIR = Path(__file__).resolve().parent
DEFAULT_OUTPUT_ROOT = APP_DIR / "data" / "sources"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convert FoodSeg103 semantic masks into detection-box source_manifest.json format."
    )
    parser.add_argument("--source-id", default="foodseg103-produce-boxes-v1")
    parser.add_argument("--dataset-id", default=DATASET_ID)
    parser.add_argument("--split", default="train")
    parser.add_argument("--limit", type=int, default=3000)
    parser.add_argument("--preset", choices=sorted(CLASS_PRESETS), default="produce")
    parser.add_argument("--output-root", type=Path, default=DEFAULT_OUTPUT_ROOT)
    parser.add_argument("--min-area-pixels", type=int, default=128)
    parser.add_argument("--min-area-percent", type=float, default=0.03)
    parser.add_argument("--streaming", action="store_true", default=True)
    parser.add_argument("--no-streaming", dest="streaming", action="store_false")
    parser.add_argument("--overwrite", action="store_true")
    return parser.parse_args()


def boxes_from_mask(
    mask_array: np.ndarray,
    class_id: int,
    min_area_pixels: int,
    min_area_percent: float,
) -> list[dict[str, Any]]:
    binary = (mask_array == class_id).astype("uint8")
    if binary.max() == 0:
        return []

    height, width = binary.shape
    min_area = max(min_area_pixels, int(width * height * (min_area_percent / 100)))
    component_count, labels, stats, _centroids = cv2.connectedComponentsWithStats(binary, connectivity=8)
    boxes = []
    for component_id in range(1, component_count):
        x, y, box_width, box_height, area = stats[component_id]
        if int(area) < min_area:
            continue
        boxes.append(
            {
                "source_label": FOODSEG103_CLASSES[class_id],
                "bbox": {
                    "xmin": float(x),
                    "ymin": float(y),
                    "xmax": float(x + box_width),
                    "ymax": float(y + box_height),
                },
                "mask_area_pixels": int(area),
            }
        )
    return boxes


def main() -> None:
    args = parse_args()
    try:
        from datasets import load_dataset
    except ImportError as exc:
        raise SystemExit("Missing dependency: datasets. Run `pnpm vision:setup` first.") from exc

    class_ids = set(CLASS_PRESETS[args.preset])
    output_dir = args.output_root / args.source_id
    if output_dir.exists() and args.overwrite:
        shutil.rmtree(output_dir)
    images_dir = output_dir / "images"
    images_dir.mkdir(parents=True, exist_ok=True)

    dataset = load_dataset(args.dataset_id, split=args.split, streaming=args.streaming)
    rows = []
    for index, row in enumerate(dataset, start=1):
        if args.limit > 0 and index > args.limit:
            break

        image = row["image"].convert("RGB")
        mask = row["label"]
        mask_array = np.array(mask)
        width, height = image.size
        annotations = []
        for class_id in row.get("classes_on_image", []):
            if class_id not in class_ids:
                continue
            annotations.extend(
                boxes_from_mask(
                    mask_array=mask_array,
                    class_id=class_id,
                    min_area_pixels=args.min_area_pixels,
                    min_area_percent=args.min_area_percent,
                )
            )
        if not annotations:
            continue

        image_path = images_dir / f"{index:06d}.jpg"
        image.save(image_path, quality=92)
        rows.append(
            {
                "source_index": row.get("id", index),
                "image_path": str(image_path.relative_to(output_dir)),
                "width": width,
                "height": height,
                "annotations": annotations,
            }
        )

    manifest = {
        "schema_version": 1,
        "source_id": args.source_id,
        "source_type": "detection_from_semantic_masks",
        "source_dataset": args.dataset_id,
        "source_split": args.split,
        "preset": args.preset,
        "row_count": len(rows),
        "rows": rows,
    }
    manifest_path = output_dir / "source_manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps({"source_manifest": str(manifest_path), "row_count": len(rows)}, indent=2))


if __name__ == "__main__":
    main()

