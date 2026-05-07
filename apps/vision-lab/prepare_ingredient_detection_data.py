from __future__ import annotations

import argparse
import json
import random
import shutil
from collections import defaultdict
from pathlib import Path
from typing import Any


APP_DIR = Path(__file__).resolve().parent
REPO_ROOT = APP_DIR.parents[1]
DEFAULT_DATASET_DIR = APP_DIR / "data" / "hf_food_ingredient_training_import_5000"
DEFAULT_OUTPUT_DIR = APP_DIR / "data" / "datasets" / "bounding-box" / "food-ingredient-yolo"
DEFAULT_LABEL_MAP = REPO_ROOT / "packages" / "shared" / "vision-label-mappings.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Export imported ingredient XML boxes into a YOLO detection dataset."
    )
    parser.add_argument("--dataset-dir", type=Path, default=DEFAULT_DATASET_DIR)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--limit", type=int, default=0, help="Total source images to export. 0 means all.")
    parser.add_argument("--max-labels", type=int, default=0, help="Limit to the first N labels. 0 means all.")
    parser.add_argument("--min-samples-per-label", type=int, default=3)
    parser.add_argument("--val-ratio", type=float, default=0.15)
    parser.add_argument("--test-ratio", type=float, default=0.15)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--overwrite", action="store_true")
    parser.add_argument(
        "--label-map",
        type=Path,
        default=DEFAULT_LABEL_MAP,
        help="Shared Chef vision mapping file used to canonicalize source labels before training.",
    )
    parser.add_argument(
        "--unmapped-label-policy",
        choices=("exclude", "review"),
        default=None,
        help="Override mapping-file policy for labels that cannot be canonicalized.",
    )
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
    return parser.parse_args()


def normalize_label(value: str | None) -> str:
    if not value:
        return ""

    normalized = value.removesuffix("_annotated").lower().strip()
    for character in ("_", "-", "/", "\\", ".", ",", "(", ")"):
        normalized = normalized.replace(character, " ")
    return " ".join(normalized.split())


def load_label_map(label_map_path: Path, unmapped_label_policy: str | None) -> dict[str, Any]:
    if not label_map_path.exists():
        raise SystemExit(f"Missing label map file: {label_map_path}")

    mapping = json.loads(label_map_path.read_text(encoding="utf-8"))
    classes = {
        entry["id"]: {
            "id": entry["id"],
            "label": entry["label"],
            "category": entry["category"],
            "granularity": entry["granularity"],
            "inventory_policy": entry["inventory_policy"],
        }
        for entry in mapping.get("classes", [])
        if entry.get("stage_1_enabled", True)
    }
    alias_to_class_id: dict[str, str] = {}
    for entry in mapping.get("classes", []):
        if not entry.get("stage_1_enabled", True):
            continue
        for alias in [entry["id"], entry["label"], *entry.get("aliases", [])]:
            normalized_alias = normalize_label(alias)
            if normalized_alias:
                alias_to_class_id[normalized_alias] = entry["id"]

    training_mappings = mapping.get("training_label_mappings", {})
    source_overrides = {
        normalize_label(source_label): value
        for source_label, value in training_mappings.get("source_label_overrides", {}).items()
    }
    package_terms = {
        normalize_label(source_label): normalize_label(package_label)
        for source_label, package_label in training_mappings.get("package_terms", {}).items()
    }

    return {
        "classes": classes,
        "alias_to_class_id": alias_to_class_id,
        "source_overrides": source_overrides,
        "package_terms": package_terms,
        "unmapped_label_policy": unmapped_label_policy
        or training_mappings.get("unmapped_label_policy", "exclude"),
    }


def resolve_training_label(source_label: str, label_map: dict[str, Any]) -> dict[str, Any] | None:
    normalized = normalize_label(source_label)
    if not normalized:
        return None

    override = label_map["source_overrides"].get(normalized)
    if override == "ignore":
        return None
    if isinstance(override, str):
        class_id = override
        package_hint = None
        reason = "override"
    elif isinstance(override, dict):
        class_id = override.get("class_id")
        package_hint = override.get("package")
        reason = "override"
    else:
        class_id = label_map["alias_to_class_id"].get(normalized)
        package_hint = None
        reason = "alias"

    if not class_id:
        package_hint = None
        for package_term, canonical_package in label_map["package_terms"].items():
            tokens = normalized.split()
            if package_term not in tokens:
                continue

            candidate = " ".join(token for token in tokens if token != package_term)
            class_id = label_map["alias_to_class_id"].get(candidate)
            package_hint = canonical_package
            reason = "ingredient_plus_package"
            if class_id:
                break

    if not class_id:
        if label_map["unmapped_label_policy"] == "review":
            class_id = "unknown_kitchen_item"
            reason = "unmapped_review"
        else:
            return None

    class_entry = label_map["classes"].get(class_id)
    if not class_entry:
        return None

    return {
        "source_label": source_label,
        "source_label_normalized": normalized,
        "class_name": class_entry["id"],
        "canonical_class_name": class_entry["id"],
        "canonical_label": class_entry["label"],
        "category": class_entry["category"],
        "inventory_policy": class_entry["inventory_policy"],
        "package_hint": package_hint,
        "mapping_reason": reason,
    }


def apply_detector_class_strategy(
    resolution: dict[str, Any],
    label_map: dict[str, Any],
    strategy: str,
) -> dict[str, Any] | None:
    if strategy == "canonical":
        return resolution

    if strategy == "broad":
        detector_class_id = broad_detector_class_id(resolution, label_map)
        mapping_suffix = "broad_detector"
    elif strategy == "object_proposal":
        detector_class_id = object_proposal_detector_class_id(resolution, label_map)
        mapping_suffix = "object_proposal_detector"
    else:
        return None

    if detector_class_id is None:
        return None

    detector_entry = label_map["classes"].get(detector_class_id)
    if detector_entry is None:
        return None

    return {
        **resolution,
        "class_name": detector_entry["id"],
        "detector_label": detector_entry["label"],
        "detector_category": detector_entry["category"],
        "detector_inventory_policy": detector_entry["inventory_policy"],
        "mapping_reason": f"{resolution['mapping_reason']}+{mapping_suffix}",
    }


def broad_detector_class_id(resolution: dict[str, Any], label_map: dict[str, Any]) -> str | None:
    normalized = resolution["source_label_normalized"]
    package_hint = resolution.get("package_hint") or infer_package_hint(
        normalized,
        resolution["canonical_class_name"],
        label_map,
    )

    if package_hint:
        package_class_id = f"food_{package_hint}"
        if package_class_id in label_map["classes"]:
            return package_class_id
        if package_hint in {"jar", "bottle", "container"} and package_hint in label_map["classes"]:
            return package_hint

    if resolution["category"] == "produce":
        return "fresh_produce"
    if resolution["category"] == "packaged_food":
        return "unknown_packaged_food"
    if resolution["category"] == "container":
        return "container"
    if resolution["category"] == "prepared_food":
        return "prepared_food"

    return resolution["canonical_class_name"]


def object_proposal_detector_class_id(resolution: dict[str, Any], label_map: dict[str, Any]) -> str | None:
    normalized = resolution["source_label_normalized"]
    canonical_class_name = resolution["canonical_class_name"]

    if canonical_class_name == "egg_carton":
        return "egg_carton"

    package_hint = resolution.get("package_hint") or infer_package_hint(
        normalized,
        canonical_class_name,
        label_map,
    )

    if package_hint:
        if package_hint in {"jug"}:
            return "bottle"
        if package_hint in label_map["classes"]:
            return package_hint
        if package_hint == "package" and "packet" in label_map["classes"]:
            return "packet"

    for class_suffix, proposal_class in (
        ("_bag", "bag"),
        ("_box", "box"),
        ("_bottle", "bottle"),
        ("_can", "can"),
        ("_carton", "carton"),
        ("_jar", "jar"),
        ("_packet", "packet"),
    ):
        if canonical_class_name.endswith(class_suffix):
            return proposal_class

    if resolution["category"] == "produce":
        return "produce_item"
    if resolution["category"] == "packaged_food":
        return "unknown_packaged_food"
    if resolution["category"] == "container":
        return "container"
    if resolution["category"] == "prepared_food":
        return "prepared_food"

    return "unknown_kitchen_item"


def infer_package_hint(normalized_label: str, class_id: str, label_map: dict[str, Any]) -> str | None:
    tokens = normalized_label.split()
    for package_term, canonical_package in label_map["package_terms"].items():
        if package_term in tokens:
            return canonical_package

    for suffix, package_name in (
        ("_bag", "bag"),
        ("_box", "box"),
        ("_bottle", "bottle"),
        ("_can", "can"),
        ("_carton", "carton"),
        ("_jar", "jar"),
        ("_packet", "packet"),
    ):
        if class_id.endswith(suffix):
            return package_name

    return None


def load_rows(
    dataset_dir: Path,
    label_map: dict[str, Any],
    detector_class_strategy: str,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    metadata_path = dataset_dir / "metadata.json"
    if not metadata_path.exists():
        raise SystemExit(f"Missing metadata file: {metadata_path}")

    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    rows = []
    report: dict[str, Any] = {
        "source_dataset": metadata.get("dataset"),
        "source_split": metadata.get("split"),
        "unmapped_label_policy": label_map["unmapped_label_policy"],
        "detector_class_strategy": detector_class_strategy,
        "source_label_counts": defaultdict(int),
        "canonical_label_counts": defaultdict(int),
        "detector_label_counts": defaultdict(int),
        "excluded_label_counts": defaultdict(int),
        "mapping_reasons": defaultdict(int),
    }
    for row in metadata.get("rows", []):
        image_path_value = row.get("image_path")
        boxes = row.get("boxes") or []
        if not image_path_value or not boxes:
            continue

        image_path = dataset_dir / image_path_value
        if not image_path.exists():
            continue

        width = row.get("width")
        height = row.get("height")
        if not width or not height:
            continue

        annotations = []
        for box in boxes:
            source_label = str(box.get("label") or row.get("label") or "").strip()
            report["source_label_counts"][source_label] += 1
            resolution = resolve_training_label(source_label, label_map)
            if not resolution:
                report["excluded_label_counts"][source_label] += 1
                continue

            resolution = apply_detector_class_strategy(resolution, label_map, detector_class_strategy)
            if not resolution:
                report["excluded_label_counts"][source_label] += 1
                continue

            report["canonical_label_counts"][resolution["canonical_class_name"]] += 1
            report["detector_label_counts"][resolution["class_name"]] += 1
            report["mapping_reasons"][resolution["mapping_reason"]] += 1
            annotations.append({**box, **resolution})

        if not annotations:
            continue

        rows.append(
            {
                "source_index": row.get("index"),
                "label": row.get("label"),
                "image_path": image_path,
                "width": int(width),
                "height": int(height),
                "annotations": annotations,
                "class_names": sorted({annotation["class_name"] for annotation in annotations}),
            }
        )

    for key in (
        "source_label_counts",
        "canonical_label_counts",
        "detector_label_counts",
        "excluded_label_counts",
        "mapping_reasons",
    ):
        report[key] = dict(sorted(report[key].items()))
    report["eligible_image_count"] = len(rows)
    return rows, report


def select_rows(
    rows: list[dict[str, Any]],
    limit: int,
    max_labels: int,
    min_samples_per_label: int,
    seed: int,
) -> list[dict[str, Any]]:
    rng = random.Random(seed)
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        for class_name in row["class_names"]:
            grouped[class_name].append(row)

    class_names = sorted(
        class_name for class_name, label_rows in grouped.items() if len(label_rows) >= min_samples_per_label
    )
    if max_labels > 0:
        class_names = class_names[:max_labels]

    selected_class_names = set(class_names)
    selected_by_image = {
        row["image_path"]: {
            **row,
            "annotations": [
                annotation
                for annotation in row["annotations"]
                if annotation["class_name"] in selected_class_names
            ],
            "class_names": [
                class_name
                for class_name in row["class_names"]
                if class_name in selected_class_names
            ],
        }
        for class_name in class_names
        for row in grouped[class_name]
    }
    selected = [row for row in selected_by_image.values() if row["annotations"]]
    rng.shuffle(selected)
    return selected[:limit] if limit > 0 else selected


def split_rows(rows: list[dict[str, Any]], val_ratio: float, test_ratio: float, seed: int) -> list[dict[str, Any]]:
    rng = random.Random(seed)
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        grouped[row["class_names"][0]].append(row)

    result = []
    for label_rows in grouped.values():
        rng.shuffle(label_rows)
        count = len(label_rows)
        if count == 1:
            sizes = {"train": 1, "val": 0, "test": 0}
        elif count == 2:
            sizes = {"train": 1, "val": 1, "test": 0}
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
            sizes = {"train": count - val_count - test_count, "val": val_count, "test": test_count}

        offset = 0
        for split_name in ("train", "val", "test"):
            for row in label_rows[offset : offset + sizes[split_name]]:
                result.append({**row, "split": split_name})
            offset += sizes[split_name]

    rng.shuffle(result)
    return result


def yolo_box(box: dict[str, Any], width: int, height: int) -> tuple[float, float, float, float] | None:
    xmin = max(0.0, min(float(width), float(box.get("xmin", 0))))
    ymin = max(0.0, min(float(height), float(box.get("ymin", 0))))
    xmax = max(0.0, min(float(width), float(box.get("xmax", 0))))
    ymax = max(0.0, min(float(height), float(box.get("ymax", 0))))
    box_width = xmax - xmin
    box_height = ymax - ymin
    if box_width <= 1 or box_height <= 1:
        return None

    x_center = (xmin + xmax) / 2 / width
    y_center = (ymin + ymax) / 2 / height
    return x_center, y_center, box_width / width, box_height / height


def write_data_yaml(output_dir: Path, class_names: list[str]) -> None:
    names = "\n".join(f"  {index}: {name}" for index, name in enumerate(class_names))
    content = (
        "path: .\n"
        "train: images/train\n"
        "val: images/val\n"
        "test: images/test\n"
        f"nc: {len(class_names)}\n"
        "names:\n"
        f"{names}\n"
    )
    (output_dir / "data.yaml").write_text(content, encoding="utf-8")


def export_dataset(rows: list[dict[str, Any]], output_dir: Path) -> dict[str, Any]:
    class_names = sorted(
        {
            annotation["class_name"]
            for row in rows
            for annotation in row["annotations"]
        }
    )
    class_to_id = {class_name: index for index, class_name in enumerate(class_names)}
    manifest = []

    for index, row in enumerate(rows, start=1):
        split = row["split"]
        image_dir = output_dir / "images" / split
        label_dir = output_dir / "labels" / split
        image_dir.mkdir(parents=True, exist_ok=True)
        label_dir.mkdir(parents=True, exist_ok=True)

        suffix = row["image_path"].suffix.lower() or ".jpg"
        image_output = image_dir / f"{index:06d}{suffix}"
        label_output = label_dir / f"{index:06d}.txt"
        shutil.copy2(row["image_path"], image_output)

        label_lines = []
        for annotation in row["annotations"]:
            converted = yolo_box(annotation, row["width"], row["height"])
            if converted is None:
                continue
            x_center, y_center, box_width, box_height = converted
            label_lines.append(
                f"{class_to_id[annotation['class_name']]} {x_center:.6f} {y_center:.6f} {box_width:.6f} {box_height:.6f}"
            )

        label_output.write_text("\n".join(label_lines) + ("\n" if label_lines else ""), encoding="utf-8")
        manifest.append(
            {
                "split": split,
                "class_names": row["class_names"],
                "annotations": [
                    {
                        "source_label": annotation["source_label"],
                        "class_name": annotation["class_name"],
                        "canonical_class_name": annotation["canonical_class_name"],
                        "canonical_label": annotation["canonical_label"],
                        "package_hint": annotation["package_hint"],
                        "mapping_reason": annotation["mapping_reason"],
                    }
                    for annotation in row["annotations"]
                ],
                "source_image": str(row["image_path"]),
                "image": str(image_output),
                "label": str(label_output),
                "box_count": len(label_lines),
            }
        )

    write_data_yaml(output_dir, class_names)
    (output_dir / "class_names.txt").write_text("\n".join(class_names) + "\n", encoding="utf-8")
    (output_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    split_counts = defaultdict(int)
    for item in manifest:
        split_counts[item["split"]] += 1

    return {
        "image_count": len(manifest),
        "class_count": len(class_names),
        "split_counts": dict(sorted(split_counts.items())),
        "data_yaml": str(output_dir / "data.yaml"),
    }


def main() -> None:
    args = parse_args()
    if args.overwrite and args.output_dir.exists():
        shutil.rmtree(args.output_dir)
    args.output_dir.mkdir(parents=True, exist_ok=True)

    label_map = load_label_map(args.label_map, args.unmapped_label_policy)
    rows, label_report = load_rows(args.dataset_dir, label_map, args.detector_class_strategy)
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
    summary = export_dataset(rows_with_splits, args.output_dir)
    (args.output_dir / "label_map_report.json").write_text(
        json.dumps(label_report, indent=2),
        encoding="utf-8",
    )
    summary["label_map_report"] = str(args.output_dir / "label_map_report.json")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
