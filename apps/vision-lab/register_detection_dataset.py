from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path
from typing import Any
from xml.etree import ElementTree

from PIL import Image


APP_DIR = Path(__file__).resolve().parent
DEFAULT_OUTPUT_ROOT = APP_DIR / "data" / "sources"
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Register an unsplit object-detection dataset as a normalized Chef source manifest."
    )
    parser.add_argument("--source-id", required=True, help="Stable source id, for example pantry-jars-v1.")
    parser.add_argument("--images-dir", type=Path, required=True)
    parser.add_argument("--annotations", type=Path, required=True)
    parser.add_argument(
        "--format",
        choices=("pascal-voc", "coco", "yolo"),
        required=True,
        help="Annotation format to normalize.",
    )
    parser.add_argument(
        "--class-names",
        type=Path,
        default=None,
        help="Required for YOLO txt annotations. One class name per line.",
    )
    parser.add_argument("--output-root", type=Path, default=DEFAULT_OUTPUT_ROOT)
    parser.add_argument("--copy-images", action="store_true", help="Copy images into the source folder.")
    parser.add_argument("--overwrite", action="store_true")
    return parser.parse_args()


def image_files(images_dir: Path) -> dict[str, Path]:
    return {
        path.stem: path
        for path in sorted(images_dir.rglob("*"))
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
    }


def image_size(path: Path) -> tuple[int, int]:
    with Image.open(path) as image:
        return image.size


def pascal_rows(images_dir: Path, annotations_dir: Path) -> list[dict[str, Any]]:
    images = image_files(images_dir)
    rows = []
    for xml_path in sorted(annotations_dir.rglob("*.xml")):
        image_path = images.get(xml_path.stem)
        if image_path is None:
            continue
        root = ElementTree.parse(xml_path).getroot()
        width, height = image_size(image_path)
        annotations = []
        for obj in root.findall("object"):
            box = obj.find("bndbox")
            if box is None:
                continue
            annotations.append(
                {
                    "source_label": obj.findtext("name", "").strip(),
                    "bbox": {
                        "xmin": float(box.findtext("xmin", "0")),
                        "ymin": float(box.findtext("ymin", "0")),
                        "xmax": float(box.findtext("xmax", "0")),
                        "ymax": float(box.findtext("ymax", "0")),
                    },
                }
            )
        if annotations:
            rows.append(row_for_image(image_path, width, height, annotations))
    return rows


def coco_rows(images_dir: Path, annotation_file: Path) -> list[dict[str, Any]]:
    payload = json.loads(annotation_file.read_text(encoding="utf-8"))
    category_lookup = {item["id"]: item["name"] for item in payload.get("categories", [])}
    image_lookup = {item["id"]: item for item in payload.get("images", [])}
    annotations_by_image: dict[int, list[dict[str, Any]]] = {}

    for annotation in payload.get("annotations", []):
        image_id = annotation.get("image_id")
        category_id = annotation.get("category_id")
        bbox = annotation.get("bbox") or []
        if image_id is None or category_id is None or len(bbox) != 4:
            continue
        x, y, width, height = [float(value) for value in bbox]
        annotations_by_image.setdefault(image_id, []).append(
            {
                "source_label": category_lookup.get(category_id, str(category_id)),
                "bbox": {
                    "xmin": x,
                    "ymin": y,
                    "xmax": x + width,
                    "ymax": y + height,
                },
            }
        )

    rows = []
    for image_id, annotations in annotations_by_image.items():
        image_meta = image_lookup.get(image_id)
        if not image_meta:
            continue
        image_path = images_dir / image_meta["file_name"]
        if not image_path.exists():
            continue
        width = int(image_meta.get("width") or 0)
        height = int(image_meta.get("height") or 0)
        if width <= 0 or height <= 0:
            width, height = image_size(image_path)
        rows.append(row_for_image(image_path, width, height, annotations))
    return rows


def yolo_rows(images_dir: Path, labels_dir: Path, class_names_path: Path | None) -> list[dict[str, Any]]:
    if class_names_path is None or not class_names_path.exists():
        raise SystemExit("--class-names is required for YOLO annotations.")

    class_names = [
        line.strip()
        for line in class_names_path.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    images = image_files(images_dir)
    rows = []
    for label_path in sorted(labels_dir.rglob("*.txt")):
        image_path = images.get(label_path.stem)
        if image_path is None:
            continue
        width, height = image_size(image_path)
        annotations = []
        for line in label_path.read_text(encoding="utf-8").splitlines():
            parts = line.split()
            if len(parts) < 5:
                continue
            class_index = int(float(parts[0]))
            x_center, y_center, box_width, box_height = [float(value) for value in parts[1:5]]
            annotations.append(
                {
                    "source_label": class_names[class_index] if class_index < len(class_names) else str(class_index),
                    "bbox": {
                        "xmin": (x_center - box_width / 2) * width,
                        "ymin": (y_center - box_height / 2) * height,
                        "xmax": (x_center + box_width / 2) * width,
                        "ymax": (y_center + box_height / 2) * height,
                    },
                }
            )
        if annotations:
            rows.append(row_for_image(image_path, width, height, annotations))
    return rows


def row_for_image(
    image_path: Path,
    width: int,
    height: int,
    annotations: list[dict[str, Any]],
) -> dict[str, Any]:
    return {
        "image_path": str(image_path),
        "width": int(width),
        "height": int(height),
        "annotations": annotations,
    }


def write_source(
    source_id: str,
    rows: list[dict[str, Any]],
    output_root: Path,
    copy_images: bool,
    overwrite: bool,
) -> Path:
    output_dir = output_root / source_id
    if output_dir.exists() and overwrite:
        shutil.rmtree(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    normalized_rows = []
    images_dir = output_dir / "images"
    if copy_images:
        images_dir.mkdir(exist_ok=True)

    for index, row in enumerate(rows, start=1):
        image_path = Path(row["image_path"])
        if copy_images:
            copied_path = images_dir / f"{index:06d}{image_path.suffix.lower() or '.jpg'}"
            shutil.copy2(image_path, copied_path)
            stored_image_path = copied_path.relative_to(output_dir)
        else:
            stored_image_path = image_path.resolve()
        normalized_rows.append({**row, "image_path": str(stored_image_path)})

    manifest = {
        "schema_version": 1,
        "source_id": source_id,
        "source_type": "detection",
        "row_count": len(normalized_rows),
        "rows": normalized_rows,
    }
    manifest_path = output_dir / "source_manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return manifest_path


def main() -> None:
    args = parse_args()
    if args.format == "pascal-voc":
        rows = pascal_rows(args.images_dir, args.annotations)
    elif args.format == "coco":
        rows = coco_rows(args.images_dir, args.annotations)
    else:
        rows = yolo_rows(args.images_dir, args.annotations, args.class_names)

    if not rows:
        raise SystemExit("No annotated rows were found.")

    manifest_path = write_source(
        source_id=args.source_id,
        rows=rows,
        output_root=args.output_root,
        copy_images=args.copy_images,
        overwrite=args.overwrite,
    )
    print(json.dumps({"source_manifest": str(manifest_path), "row_count": len(rows)}, indent=2))


if __name__ == "__main__":
    main()

