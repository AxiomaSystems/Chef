from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path
from typing import Any


APP_DIR = Path(__file__).resolve().parent
DEFAULT_OUTPUT_ROOT = APP_DIR / "data" / "sources"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convert an existing Chef imported metadata.json with boxes into a normalized source_manifest.json."
    )
    parser.add_argument("--source-id", required=True)
    parser.add_argument("--dataset-dir", type=Path, required=True)
    parser.add_argument("--output-root", type=Path, default=DEFAULT_OUTPUT_ROOT)
    parser.add_argument("--copy-images", action="store_true")
    parser.add_argument("--overwrite", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    metadata_path = args.dataset_dir / "metadata.json"
    if not metadata_path.exists():
        raise SystemExit(f"Missing metadata: {metadata_path}")

    output_dir = args.output_root / args.source_id
    if output_dir.exists() and args.overwrite:
        shutil.rmtree(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    images_dir = output_dir / "images"
    if args.copy_images:
        images_dir.mkdir(exist_ok=True)

    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    rows: list[dict[str, Any]] = []
    for index, row in enumerate(metadata.get("rows", []), start=1):
        image_path_value = row.get("image_path")
        boxes = row.get("boxes") or []
        width = row.get("width")
        height = row.get("height")
        if not image_path_value or not boxes or not width or not height:
            continue
        image_path = args.dataset_dir / image_path_value
        if not image_path.exists():
            continue

        if args.copy_images:
            stored_image_path = images_dir / f"{index:06d}{image_path.suffix.lower() or '.jpg'}"
            shutil.copy2(image_path, stored_image_path)
            image_ref = str(stored_image_path.relative_to(output_dir))
        else:
            image_ref = str(image_path.resolve())

        annotations = []
        for box in boxes:
            source_label = str(box.get("label") or row.get("label") or "").strip()
            if not source_label:
                continue
            annotations.append(
                {
                    "source_label": source_label,
                    "bbox": {
                        "xmin": float(box.get("xmin", 0)),
                        "ymin": float(box.get("ymin", 0)),
                        "xmax": float(box.get("xmax", 0)),
                        "ymax": float(box.get("ymax", 0)),
                    },
                }
            )
        if annotations:
            rows.append(
                {
                    "source_index": row.get("index", index),
                    "label": row.get("label"),
                    "image_path": image_ref,
                    "width": int(width),
                    "height": int(height),
                    "annotations": annotations,
                }
            )

    manifest = {
        "schema_version": 1,
        "source_id": args.source_id,
        "source_type": "detection",
        "source_dataset": metadata.get("dataset"),
        "row_count": len(rows),
        "rows": rows,
    }
    manifest_path = output_dir / "source_manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps({"source_manifest": str(manifest_path), "row_count": len(rows)}, indent=2))


if __name__ == "__main__":
    main()

