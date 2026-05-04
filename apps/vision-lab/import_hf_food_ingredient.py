from __future__ import annotations

import argparse
import json
import random
import shutil
import zipfile
from pathlib import Path
from typing import Any
from urllib.parse import quote
from urllib.request import urlopen
from xml.etree import ElementTree


DATASET_ID = "Teen-Different/Food-Ingredient"
DEFAULT_OUTPUT_DIR = Path(__file__).resolve().parent / "data" / "hf_food_ingredient_preview"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Import a preview of the Teen-Different/Food-Ingredient Hugging Face dataset."
    )
    parser.add_argument("--dataset", default=DATASET_ID)
    parser.add_argument("--split", default="train")
    parser.add_argument("--limit", type=int, default=24)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Delete the output directory before importing.",
    )
    parser.add_argument(
        "--samples-per-label",
        type=int,
        default=0,
        help="Use the Hugging Face rows API to import a balanced preview with this many examples per label.",
    )
    parser.add_argument(
        "--max-labels",
        type=int,
        default=0,
        help="Limit balanced preview import to the first N labels. 0 means all labels.",
    )
    parser.add_argument(
        "--full",
        action="store_true",
        help="Download through the normal Hugging Face dataset cache instead of streaming only the preview rows.",
    )
    return parser.parse_args()


def label_name(features: Any, label: Any) -> str:
    names = getattr(features.get("label"), "names", None) if features else None
    if names and isinstance(label, int) and 0 <= label < len(names):
        return names[label]
    return str(label)


def safe_stem(value: str) -> str:
    return "".join(character if character.isalnum() or character in ("-", "_") else "_" for character in value)


def read_viewer_preview(dataset: str, split: str) -> tuple[list[str], list[dict[str, Any]]]:
    url = (
        "https://datasets-server.huggingface.co/first-rows"
        f"?dataset={quote(dataset, safe='')}&config=default&split={quote(split, safe='')}"
    )
    with urlopen(url, timeout=30) as response:
        payload = json.loads(response.read().decode("utf-8"))

    labels = next(
        feature["type"]["names"]
        for feature in payload["features"]
        if feature["name"] == "label"
    )
    return labels, payload["rows"]


def read_viewer_rows(
    dataset: str,
    split: str,
    offset: int,
    length: int,
) -> tuple[list[str], list[dict[str, Any]], int]:
    url = (
        "https://datasets-server.huggingface.co/rows"
        f"?dataset={quote(dataset, safe='')}&config=default&split={quote(split, safe='')}"
        f"&offset={offset}&length={length}"
    )
    with urlopen(url, timeout=30) as response:
        payload = json.loads(response.read().decode("utf-8"))

    labels = next(
        feature["type"]["names"]
        for feature in payload["features"]
        if feature["name"] == "label"
    )
    return labels, payload["rows"], int(payload["num_rows_total"])


def save_viewer_row(
    item: dict[str, Any],
    labels: list[str],
    output_dir: Path,
    images_dir: Path,
) -> dict[str, Any]:
    row = item["row"]
    label_id = row["label"]
    label = labels[label_id]
    image = row["image"]
    image_path = images_dir / f"{item['row_idx']:05d}_{safe_stem(label)}.jpg"

    if not image_path.exists():
        with urlopen(image["src"], timeout=30) as response:
            image_path.write_bytes(response.read())

    return {
        "index": item["row_idx"],
        "label": label,
        "label_id": label_id,
        "width": image.get("width"),
        "height": image.get("height"),
        "image_path": str(image_path.relative_to(output_dir)),
    }


def import_viewer_preview(args: argparse.Namespace) -> None:
    labels, rows = read_viewer_preview(args.dataset, args.split)

    args.output_dir.mkdir(parents=True, exist_ok=True)
    images_dir = args.output_dir / "images"
    images_dir.mkdir(exist_ok=True)

    imported_rows: list[dict[str, Any]] = []
    for item in rows[: args.limit]:
        imported_rows.append(save_viewer_row(item, labels, args.output_dir, images_dir))

    write_metadata(
        output_dir=args.output_dir,
        dataset=args.dataset,
        split=args.split,
        mode="viewer_api_preview",
        limit=args.limit,
        rows=imported_rows,
        labels=labels,
    )


def import_balanced_viewer_preview(args: argparse.Namespace) -> None:
    labels, _rows, total_rows = read_viewer_rows(args.dataset, args.split, offset=0, length=1)

    args.output_dir.mkdir(parents=True, exist_ok=True)
    images_dir = args.output_dir / "images"
    images_dir.mkdir(exist_ok=True)

    imported_rows: list[dict[str, Any]] = []
    label_count = args.max_labels or len(labels)
    target_labels = list(range(min(label_count, len(labels))))
    approximate_rows_per_label = max(1, total_rows // len(labels))

    for label_id in target_labels:
        selected: list[dict[str, Any]] = []
        center = label_id * approximate_rows_per_label
        offsets = [
            max(0, center - approximate_rows_per_label),
            center,
            min(max(0, total_rows - 1), center + approximate_rows_per_label),
        ]

        for offset in offsets:
            _labels, rows, _total_rows = read_viewer_rows(
                args.dataset,
                args.split,
                offset=offset,
                length=approximate_rows_per_label * 2,
            )
            for item in rows:
                if item["row"]["label"] == label_id and item["row_idx"] not in {
                    existing["row_idx"] for existing in selected
                }:
                    selected.append(item)
                if len(selected) >= args.samples_per_label:
                    break
            if len(selected) >= args.samples_per_label:
                break

        for item in selected[: args.samples_per_label]:
            imported_rows.append(save_viewer_row(item, labels, args.output_dir, images_dir))

    write_metadata(
        output_dir=args.output_dir,
        dataset=args.dataset,
        split=args.split,
        mode="viewer_api_balanced_preview",
        limit=args.limit,
        rows=imported_rows,
        labels=labels,
    )


def write_metadata(
    output_dir: Path,
    dataset: str,
    split: str,
    mode: str,
    limit: int,
    rows: list[dict[str, Any]],
    labels: list[str],
) -> None:
    metadata = {
        "dataset": dataset,
        "split": split,
        "mode": mode,
        "limit": limit,
        "row_count": len(rows),
        "output_dir": str(output_dir),
        "rows": rows,
    }

    (output_dir / "metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    (output_dir / "labels.txt").write_text("\n".join(labels) + "\n", encoding="utf-8")


def image_extension(path: str) -> str | None:
    suffix = Path(path).suffix.lower()
    if suffix in {".jpg", ".jpeg", ".png", ".webp"}:
        return suffix
    return None


def parse_pascal_voc_xml(xml_bytes: bytes) -> dict[str, Any] | None:
    try:
        root = ElementTree.fromstring(xml_bytes)
    except ElementTree.ParseError:
        return None

    size = root.find("size")
    width = int(size.findtext("width", "0")) if size is not None else None
    height = int(size.findtext("height", "0")) if size is not None else None
    boxes = []
    for obj in root.findall("object"):
        box = obj.find("bndbox")
        if box is None:
            continue
        boxes.append(
            {
                "label": obj.findtext("name"),
                "xmin": int(float(box.findtext("xmin", "0"))),
                "ymin": int(float(box.findtext("ymin", "0"))),
                "xmax": int(float(box.findtext("xmax", "0"))),
                "ymax": int(float(box.findtext("ymax", "0"))),
            }
        )

    return {"width": width, "height": height, "boxes": boxes}


def zip_label_from_entry(entry_name: str) -> str | None:
    parts = entry_name.replace("\\", "/").split("/")
    if len(parts) < 2 or not parts[0]:
        return None
    return parts[0]


def import_from_zip_archive(args: argparse.Namespace, reason: str | None = None) -> None:
    try:
        from huggingface_hub import hf_hub_download
    except ImportError as exc:
        raise SystemExit(
            "Missing dependency: huggingface-hub. Run `pip install -r apps/vision-lab/requirements.txt` first."
        ) from exc

    zip_path = Path(
        hf_hub_download(
            repo_id=args.dataset,
            repo_type="dataset",
            filename="initial_data_annotated.zip",
        )
    )

    args.output_dir.mkdir(parents=True, exist_ok=True)
    images_dir = args.output_dir / "images"
    images_dir.mkdir(exist_ok=True)

    rng = random.Random(args.seed)
    with zipfile.ZipFile(zip_path) as archive:
        image_entries = [
            entry
            for entry in archive.infolist()
            if not entry.is_dir() and image_extension(entry.filename) is not None and zip_label_from_entry(entry.filename)
        ]
        grouped: dict[str, list[zipfile.ZipInfo]] = {}
        for entry in image_entries:
            label = zip_label_from_entry(entry.filename)
            if label is not None:
                grouped.setdefault(label, []).append(entry)

        labels = sorted(grouped)
        if args.max_labels > 0:
            labels = labels[: args.max_labels]

        selected_entries: list[tuple[int, str, zipfile.ZipInfo]] = []
        if args.samples_per_label > 0:
            for label_id, label in enumerate(labels):
                label_entries = grouped[label][:]
                rng.shuffle(label_entries)
                for entry in label_entries[: args.samples_per_label]:
                    selected_entries.append((label_id, label, entry))
        else:
            all_entries = [
                (label_id, label, entry)
                for label_id, label in enumerate(labels)
                for entry in grouped[label]
            ]
            rng.shuffle(all_entries)
            selected_entries = all_entries[: args.limit]

        rows: list[dict[str, Any]] = []
        for row_index, (label_id, label, entry) in enumerate(selected_entries):
            extension = image_extension(entry.filename) or ".jpg"
            image_path = images_dir / f"{row_index:05d}_{safe_stem(label)}{extension}"
            with archive.open(entry) as source, image_path.open("wb") as target:
                shutil.copyfileobj(source, target)

            xml_name = str(Path(entry.filename).with_suffix(".xml")).replace("\\", "/")
            annotation = None
            if xml_name in archive.namelist():
                with archive.open(xml_name) as xml_file:
                    annotation = parse_pascal_voc_xml(xml_file.read())

            row = {
                "index": row_index,
                "label": label,
                "label_id": label_id,
                "image_path": str(image_path.relative_to(args.output_dir)),
                "source_archive_path": entry.filename,
            }
            if annotation:
                row["width"] = annotation["width"]
                row["height"] = annotation["height"]
                row["boxes"] = annotation["boxes"]
            rows.append(row)

    mode = "zip_archive_fallback" if reason else "zip_archive"
    write_metadata(
        output_dir=args.output_dir,
        dataset=args.dataset,
        split=args.split,
        mode=mode,
        limit=args.limit if args.samples_per_label <= 0 else args.samples_per_label,
        rows=rows,
        labels=labels,
    )
    if reason:
        print(f"Fell back to direct ZIP import because the Hugging Face dataset builder failed: {reason}")


def import_full_or_streaming(args: argparse.Namespace) -> None:
    if args.dataset == DATASET_ID:
        import_from_zip_archive(args)
        return

    try:
        from datasets import load_dataset
    except ImportError as exc:
        raise SystemExit(
            "Missing dependency: datasets. Run `pip install -r apps/vision-lab/requirements.txt` first."
        ) from exc

    args.output_dir.mkdir(parents=True, exist_ok=True)
    images_dir = args.output_dir / "images"
    images_dir.mkdir(exist_ok=True)

    try:
        dataset = load_dataset(
            args.dataset,
            split=args.split,
            streaming=False,
        )
    except Exception as exc:
        if args.dataset == DATASET_ID:
            import_from_zip_archive(args, reason=str(exc))
            return
        raise

    features = getattr(dataset, "features", None)
    labels = getattr(features.get("label"), "names", []) if features else []
    rows: list[dict[str, Any]] = []
    label_count = args.max_labels or len(labels)
    target_label_ids = set(range(min(label_count, len(labels)))) if labels else None
    per_label_counts: dict[int, int] = {}
    shuffled_dataset = dataset.shuffle(seed=args.seed)

    for source_index, example in enumerate(shuffled_dataset):
        label_id = example.get("label")
        if target_label_ids is not None and label_id not in target_label_ids:
            continue

        if args.samples_per_label > 0:
            count = per_label_counts.get(label_id, 0)
            if count >= args.samples_per_label:
                continue
            per_label_counts[label_id] = count + 1
            reached_balanced_target = bool(target_label_ids) and all(
                per_label_counts.get(target_label_id, 0) >= args.samples_per_label
                for target_label_id in target_label_ids
            )
        elif len(rows) >= args.limit:
            break
        else:
            reached_balanced_target = False

        label = label_name(features, example.get("label"))
        image = example.get("image")
        image_path = None
        if image is not None:
            image_path = images_dir / f"{len(rows):05d}_{safe_stem(label)}.jpg"
            image.convert("RGB").save(image_path, quality=92)

        rows.append(
            {
                "index": source_index,
                "label": label,
                "label_id": example.get("label"),
                "image_path": str(image_path.relative_to(args.output_dir)) if image_path else None,
            }
        )
        if reached_balanced_target:
            break

    write_metadata(
        output_dir=args.output_dir,
        dataset=args.dataset,
        split=args.split,
        mode="full_cache",
        limit=args.limit if args.samples_per_label <= 0 else args.samples_per_label,
        rows=rows,
        labels=labels,
    )


def main() -> None:
    args = parse_args()

    if args.overwrite and args.output_dir.exists():
        shutil.rmtree(args.output_dir)

    if args.full:
        import_full_or_streaming(args)
    elif args.samples_per_label > 0:
        import_balanced_viewer_preview(args)
    else:
        import_viewer_preview(args)

    metadata = json.loads((args.output_dir / "metadata.json").read_text(encoding="utf-8"))
    print(f"Imported {metadata['row_count']} rows from {args.dataset}/{args.split}")
    print(f"Wrote preview files to {args.output_dir}")
    print(f"Wrote metadata to {args.output_dir / 'metadata.json'}")


if __name__ == "__main__":
    main()
