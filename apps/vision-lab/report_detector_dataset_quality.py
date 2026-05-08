from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path
from statistics import mean, median
from typing import Any


APP_DIR = Path(__file__).resolve().parent
DEFAULT_BUILD_DIR = APP_DIR / "data" / "training-builds" / "detector" / "chef-detector-v004-object-proposal"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Report YOLO detector dataset quality and imbalance warnings.")
    parser.add_argument("--build-dir", type=Path, default=DEFAULT_BUILD_DIR)
    parser.add_argument("--output-json", type=Path, default=None)
    parser.add_argument("--output-md", type=Path, default=None)
    parser.add_argument("--min-class-boxes", type=int, default=100)
    parser.add_argument("--oversized-area-threshold", type=float, default=0.35)
    parser.add_argument("--tiny-area-threshold", type=float, default=0.002)
    return parser.parse_args()


def read_class_names(data_yaml: Path) -> dict[int, str]:
    names: dict[int, str] = {}
    in_names = False
    for line in data_yaml.read_text(encoding="utf-8").splitlines():
        if line.strip() == "names:":
            in_names = True
            continue
        if not in_names or not line.startswith("  "):
            continue
        index, value = line.strip().split(":", 1)
        names[int(index)] = value.strip().strip("'\"")
    return names


def infer_source_id(source_image: str) -> str:
    parts = Path(source_image).parts
    if "sources" in parts:
        index = parts.index("sources")
        if index + 1 < len(parts):
            return parts[index + 1]
    return "unknown"


def read_yolo_labels(
    build_dir: Path,
    class_names: dict[int, str],
    oversized_area_threshold: float,
    tiny_area_threshold: float,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    split_counts: dict[str, int] = defaultdict(int)
    class_box_counts: dict[str, int] = defaultdict(int)
    class_areas: dict[str, list[float]] = defaultdict(list)
    oversized: list[dict[str, Any]] = []
    tiny: list[dict[str, Any]] = []
    image_box_counts: list[dict[str, Any]] = []

    for labels_dir in sorted((build_dir / "labels").glob("*")):
        if not labels_dir.is_dir():
            continue
        split = labels_dir.name
        for label_path in sorted(labels_dir.glob("*.txt")):
            box_count = 0
            for line_number, line in enumerate(label_path.read_text(encoding="utf-8").splitlines(), start=1):
                parts = line.split()
                if len(parts) < 5:
                    continue
                class_id = int(float(parts[0]))
                class_name = class_names.get(class_id, str(class_id))
                box_width = float(parts[3])
                box_height = float(parts[4])
                area = box_width * box_height
                class_box_counts[class_name] += 1
                class_areas[class_name].append(area)
                box_count += 1

                item = {
                    "split": split,
                    "label_file": str(label_path),
                    "line": line_number,
                    "class_name": class_name,
                    "area": round(area, 6),
                }
                if area >= oversized_area_threshold:
                    oversized.append(item)
                if area <= tiny_area_threshold:
                    tiny.append(item)
            split_counts[split] += 1
            image_box_counts.append(
                {
                    "split": split,
                    "label_file": str(label_path),
                    "box_count": box_count,
                }
            )

    class_area_summary = {
        class_name: {
            "count": len(areas),
            "mean_area": round(mean(areas), 6),
            "median_area": round(median(areas), 6),
            "max_area": round(max(areas), 6),
        }
        for class_name, areas in sorted(class_areas.items())
        if areas
    }

    summary = {
        "split_image_counts": dict(sorted(split_counts.items())),
        "class_box_counts": dict(sorted(class_box_counts.items())),
        "class_area_summary": class_area_summary,
        "oversized_box_count": len(oversized),
        "tiny_box_count": len(tiny),
        "densest_images": sorted(image_box_counts, key=lambda item: item["box_count"], reverse=True)[:25],
    }
    examples = {
        "oversized_boxes": sorted(oversized, key=lambda item: item["area"], reverse=True)[:50],
        "tiny_boxes": sorted(tiny, key=lambda item: item["area"])[:50],
    }
    return summary, examples


def source_summary(build_dir: Path) -> dict[str, Any]:
    manifest_path = build_dir / "manifest.json"
    if not manifest_path.exists():
        return {}
    rows = json.loads(manifest_path.read_text(encoding="utf-8"))
    source_counts: dict[str, int] = defaultdict(int)
    for row in rows:
        source_counts[infer_source_id(row.get("source_image", ""))] += 1
    return {"source_image_counts": dict(sorted(source_counts.items()))}


def build_warnings(report: dict[str, Any], min_class_boxes: int) -> list[str]:
    warnings = []
    for class_name, count in report["summary"]["class_box_counts"].items():
        if count < min_class_boxes:
            warnings.append(f"{class_name} has only {count} boxes; target at least {min_class_boxes}.")
    if report["summary"]["oversized_box_count"]:
        warnings.append(
            f"{report['summary']['oversized_box_count']} boxes exceed the oversized area threshold; inspect cluster-box risk."
        )
    return warnings


def render_markdown(report: dict[str, Any]) -> str:
    lines = [
        f"# Dataset Quality Report: {report['build_id']}",
        "",
        "## Summary",
        "",
        f"- Images by split: `{report['summary']['split_image_counts']}`",
        f"- Oversized boxes: `{report['summary']['oversized_box_count']}`",
        f"- Tiny boxes: `{report['summary']['tiny_box_count']}`",
        "",
        "## Class Box Counts",
        "",
    ]
    for class_name, count in report["summary"]["class_box_counts"].items():
        lines.append(f"- `{class_name}`: {count}")
    lines.extend(["", "## Warnings", ""])
    if report["warnings"]:
        lines.extend(f"- {warning}" for warning in report["warnings"])
    else:
        lines.append("- None")
    return "\n".join(lines) + "\n"


def main() -> None:
    args = parse_args()
    data_yaml = args.build_dir / "data.yaml"
    if not data_yaml.exists():
        raise SystemExit(f"Missing data.yaml: {data_yaml}")

    class_names = read_class_names(data_yaml)
    summary, examples = read_yolo_labels(
        args.build_dir,
        class_names,
        args.oversized_area_threshold,
        args.tiny_area_threshold,
    )
    report = {
        "schema_version": 1,
        "build_id": args.build_dir.name,
        "build_dir": str(args.build_dir),
        "thresholds": {
            "min_class_boxes": args.min_class_boxes,
            "oversized_area_threshold": args.oversized_area_threshold,
            "tiny_area_threshold": args.tiny_area_threshold,
        },
        "summary": summary,
        "sources": source_summary(args.build_dir),
        "examples": examples,
    }
    report["warnings"] = build_warnings(report, args.min_class_boxes)

    rendered = json.dumps(report, indent=2)
    print(rendered)
    output_json = args.output_json or args.build_dir / "dataset_quality_report.json"
    output_md = args.output_md or args.build_dir / "dataset_quality_report.md"
    output_json.write_text(rendered + "\n", encoding="utf-8")
    output_md.write_text(render_markdown(report), encoding="utf-8")


if __name__ == "__main__":
    main()
