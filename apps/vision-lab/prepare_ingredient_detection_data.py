from __future__ import annotations

import argparse
import json
import random
import shutil
from collections import defaultdict
from pathlib import Path
from typing import Any


APP_DIR = Path(__file__).resolve().parent
DEFAULT_DATASET_DIR = APP_DIR / "data" / "hf_food_ingredient_training_import_5000"
DEFAULT_OUTPUT_DIR = APP_DIR / "data" / "ingredient_detection_dataset"


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

        rows.append(
            {
                "source_index": row.get("index"),
                "label": row["label"],
                "class_name": safe_label(row["label"]),
                "image_path": image_path,
                "width": int(width),
                "height": int(height),
                "boxes": boxes,
            }
        )
    return rows


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
        grouped[row["class_name"]].append(row)

    class_names = sorted(
        class_name for class_name, label_rows in grouped.items() if len(label_rows) >= min_samples_per_label
    )
    if max_labels > 0:
        class_names = class_names[:max_labels]

    selected = [row for class_name in class_names for row in grouped[class_name]]
    rng.shuffle(selected)
    return selected[:limit] if limit > 0 else selected


def split_rows(rows: list[dict[str, Any]], val_ratio: float, test_ratio: float, seed: int) -> list[dict[str, Any]]:
    rng = random.Random(seed)
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        grouped[row["class_name"]].append(row)

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
    class_names = sorted({row["class_name"] for row in rows})
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
        for box in row["boxes"]:
            converted = yolo_box(box, row["width"], row["height"])
            if converted is None:
                continue
            x_center, y_center, box_width, box_height = converted
            label_lines.append(
                f"{class_to_id[row['class_name']]} {x_center:.6f} {y_center:.6f} {box_width:.6f} {box_height:.6f}"
            )

        label_output.write_text("\n".join(label_lines) + ("\n" if label_lines else ""), encoding="utf-8")
        manifest.append(
            {
                "split": split,
                "class_name": row["class_name"],
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

    rows = load_rows(args.dataset_dir)
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
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
