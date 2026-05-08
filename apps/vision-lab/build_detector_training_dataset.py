from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path
from typing import Any

from prepare_ingredient_detection_data import (
    DEFAULT_LABEL_MAP,
    apply_detector_class_strategy,
    export_dataset,
    load_label_map,
    resolve_training_label,
    select_rows,
    split_rows,
)


APP_DIR = Path(__file__).resolve().parent
DEFAULT_OUTPUT_ROOT = APP_DIR / "data" / "training-builds" / "detector"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build a versioned YOLO detector training dataset from normalized Chef source manifests."
    )
    parser.add_argument("--build-id", required=True, help="Versioned build id, for example chef-detector-v002.")
    parser.add_argument(
        "--source-manifest",
        type=Path,
        action="append",
        required=True,
        help="Path to a source_manifest.json. Repeat for multiple sources.",
    )
    parser.add_argument("--output-root", type=Path, default=DEFAULT_OUTPUT_ROOT)
    parser.add_argument("--label-map", type=Path, default=DEFAULT_LABEL_MAP)
    parser.add_argument("--unmapped-label-policy", choices=("exclude", "review"), default=None)
    parser.add_argument(
        "--detector-class-strategy",
        choices=("canonical", "broad", "object_proposal"),
        default="canonical",
        help=(
            "canonical trains detector classes as inventory labels. "
            "broad trains food proposal classes such as fresh_produce, food_can, and food_box. "
            "object_proposal trains rudimentary visible-object classes such as bottle, can, box, cup, and produce_item."
        ),
    )
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--max-labels", type=int, default=0)
    parser.add_argument("--min-samples-per-label", type=int, default=3)
    parser.add_argument(
        "--max-box-area-ratio",
        type=float,
        default=0.0,
        help="Exclude boxes whose area divided by image area exceeds this ratio. Use 0 to disable.",
    )
    parser.add_argument(
        "--min-box-area-ratio",
        type=float,
        default=0.0,
        help="Exclude boxes whose area divided by image area is below this ratio. Use 0 to disable.",
    )
    parser.add_argument("--val-ratio", type=float, default=0.15)
    parser.add_argument("--test-ratio", type=float, default=0.15)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--overwrite", action="store_true")
    return parser.parse_args()


def load_source_rows(
    manifest_paths: list[Path],
    label_map: dict[str, Any],
    detector_class_strategy: str,
    max_box_area_ratio: float,
    min_box_area_ratio: float,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    rows = []
    report: dict[str, Any] = {
        "sources": [],
        "unmapped_label_policy": label_map["unmapped_label_policy"],
        "detector_class_strategy": detector_class_strategy,
        "source_label_counts": {},
        "canonical_label_counts": {},
        "detector_label_counts": {},
        "excluded_label_counts": {},
        "excluded_box_filter_counts": {},
        "mapping_reasons": {},
    }

    for manifest_path in manifest_paths:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        source_dir = manifest_path.parent
        source_id = manifest.get("source_id") or source_dir.name
        report["sources"].append(
            {
                "source_id": source_id,
                "manifest": str(manifest_path),
                "row_count": manifest.get("row_count", len(manifest.get("rows", []))),
            }
        )

        for row in manifest.get("rows", []):
            image_path = resolve_image_path(source_dir, row.get("image_path"))
            if not image_path.exists():
                continue
            annotations = []
            width = int(row["width"])
            height = int(row["height"])
            for annotation in row.get("annotations", []):
                source_label = str(annotation.get("source_label") or "").strip()
                increment(report["source_label_counts"], source_label)
                bbox = annotation.get("bbox") or {}
                area_ratio = box_area_ratio(bbox, width, height)
                if max_box_area_ratio > 0 and area_ratio > max_box_area_ratio:
                    increment(report["excluded_box_filter_counts"], f"{source_label}:max_box_area")
                    continue
                if min_box_area_ratio > 0 and area_ratio < min_box_area_ratio:
                    increment(report["excluded_box_filter_counts"], f"{source_label}:min_box_area")
                    continue

                resolution = resolve_training_label(source_label, label_map)
                if resolution is None:
                    increment(report["excluded_label_counts"], source_label)
                    continue

                resolution = apply_detector_class_strategy(resolution, label_map, detector_class_strategy)
                if resolution is None:
                    increment(report["excluded_label_counts"], source_label)
                    continue

                increment(report["canonical_label_counts"], resolution["canonical_class_name"])
                increment(report["detector_label_counts"], resolution["class_name"])
                increment(report["mapping_reasons"], resolution["mapping_reason"])
                annotations.append(
                    {
                        "xmin": bbox.get("xmin", 0),
                        "ymin": bbox.get("ymin", 0),
                        "xmax": bbox.get("xmax", 0),
                        "ymax": bbox.get("ymax", 0),
                        **resolution,
                    }
                )

            if annotations:
                rows.append(
                    {
                        "source_id": source_id,
                        "source_index": row.get("source_index"),
                        "label": row.get("label"),
                        "image_path": image_path,
                        "width": width,
                        "height": height,
                        "annotations": annotations,
                        "class_names": sorted({annotation["class_name"] for annotation in annotations}),
                    }
                )

    for key in (
        "source_label_counts",
        "canonical_label_counts",
        "detector_label_counts",
        "excluded_label_counts",
        "excluded_box_filter_counts",
        "mapping_reasons",
    ):
        report[key] = dict(sorted(report[key].items()))
    report["eligible_image_count"] = len(rows)
    return rows, report


def resolve_image_path(source_dir: Path, image_path_value: str | None) -> Path:
    if not image_path_value:
        return Path("__missing__")
    image_path = Path(image_path_value)
    if image_path.is_absolute():
        return image_path
    return source_dir / image_path


def increment(bucket: dict[str, int], key: str) -> None:
    bucket[key] = bucket.get(key, 0) + 1


def box_area_ratio(bbox: dict[str, Any], width: int, height: int) -> float:
    if width <= 0 or height <= 0:
        return 0.0
    box_width = max(0.0, float(bbox.get("xmax", 0)) - float(bbox.get("xmin", 0)))
    box_height = max(0.0, float(bbox.get("ymax", 0)) - float(bbox.get("ymin", 0)))
    return (box_width * box_height) / float(width * height)


def main() -> None:
    args = parse_args()
    output_dir = args.output_root / args.build_id
    if output_dir.exists() and args.overwrite:
        shutil.rmtree(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    label_map = load_label_map(args.label_map, args.unmapped_label_policy)
    rows, label_report = load_source_rows(
        args.source_manifest,
        label_map,
        args.detector_class_strategy,
        args.max_box_area_ratio,
        args.min_box_area_ratio,
    )
    selected = select_rows(
        rows,
        limit=args.limit,
        max_labels=args.max_labels,
        min_samples_per_label=args.min_samples_per_label,
        seed=args.seed,
    )
    if not selected:
        raise SystemExit("No eligible rows with boxes found.")

    rows_with_splits = split_rows(selected, args.val_ratio, args.test_ratio, args.seed)
    summary = export_dataset(rows_with_splits, output_dir)
    build_manifest = {
        "schema_version": 1,
        "build_id": args.build_id,
        "source_manifests": [str(path) for path in args.source_manifest],
        "label_map": str(args.label_map),
        "unmapped_label_policy": label_map["unmapped_label_policy"],
        "detector_class_strategy": args.detector_class_strategy,
        "box_filters": {
            "max_box_area_ratio": args.max_box_area_ratio,
            "min_box_area_ratio": args.min_box_area_ratio,
        },
        "summary": summary,
    }
    (output_dir / "build_manifest.json").write_text(json.dumps(build_manifest, indent=2), encoding="utf-8")
    (output_dir / "label_map_report.json").write_text(json.dumps(label_report, indent=2), encoding="utf-8")
    print(json.dumps({**summary, "build_manifest": str(output_dir / "build_manifest.json")}, indent=2))


if __name__ == "__main__":
    main()
