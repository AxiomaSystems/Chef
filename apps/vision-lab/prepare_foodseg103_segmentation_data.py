from __future__ import annotations

import argparse
import json
import random
import shutil
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

import cv2
import numpy as np
from PIL import Image


APP_DIR = Path(__file__).resolve().parent
DEFAULT_OUTPUT_DIR = APP_DIR / "data" / "foodseg103_segmentation_dataset"
DATASET_ID = "EduardoPacheco/FoodSeg103"

FOODSEG103_CLASSES = {
    0: "background",
    1: "candy",
    2: "egg_tart",
    3: "french_fries",
    4: "chocolate",
    5: "biscuit",
    6: "popcorn",
    7: "pudding",
    8: "ice_cream",
    9: "cheese_butter",
    10: "cake",
    11: "wine",
    12: "milkshake",
    13: "coffee",
    14: "juice",
    15: "milk",
    16: "tea",
    17: "almond",
    18: "red_beans",
    19: "cashew",
    20: "dried_cranberries",
    21: "soy",
    22: "walnut",
    23: "peanut",
    24: "egg",
    25: "apple",
    26: "date",
    27: "apricot",
    28: "avocado",
    29: "banana",
    30: "strawberry",
    31: "cherry",
    32: "blueberry",
    33: "raspberry",
    34: "mango",
    35: "olives",
    36: "peach",
    37: "lemon",
    38: "pear",
    39: "fig",
    40: "pineapple",
    41: "grape",
    42: "kiwi",
    43: "melon",
    44: "orange",
    45: "watermelon",
    46: "steak",
    47: "pork",
    48: "chicken_duck",
    49: "sausage",
    50: "fried_meat",
    51: "lamb",
    52: "sauce",
    53: "crab",
    54: "fish",
    55: "shellfish",
    56: "shrimp",
    57: "soup",
    58: "bread",
    59: "corn",
    60: "hamburg",
    61: "pizza",
    62: "hanamaki_baozi",
    63: "wonton_dumplings",
    64: "pasta",
    65: "noodles",
    66: "rice",
    67: "pie",
    68: "tofu",
    69: "eggplant",
    70: "potato",
    71: "garlic",
    72: "cauliflower",
    73: "tomato",
    74: "kelp",
    75: "seaweed",
    76: "spring_onion",
    77: "rape",
    78: "ginger",
    79: "okra",
    80: "lettuce",
    81: "pumpkin",
    82: "cucumber",
    83: "white_radish",
    84: "carrot",
    85: "asparagus",
    86: "bamboo_shoots",
    87: "broccoli",
    88: "celery_stick",
    89: "cilantro_mint",
    90: "snow_peas",
    91: "cabbage",
    92: "bean_sprouts",
    93: "onion",
    94: "pepper",
    95: "green_beans",
    96: "french_beans",
    97: "king_oyster_mushroom",
    98: "shiitake",
    99: "enoki_mushroom",
    100: "oyster_mushroom",
    101: "white_button_mushroom",
    102: "salad",
    103: "other_ingredients",
}

CLASS_PRESETS = {
    "all": sorted(class_id for class_id in FOODSEG103_CLASSES if class_id > 0),
    "fridge": [
        15,  # milk
        24,  # egg
        25,  # apple
        28,  # avocado
        29,  # banana
        30,  # strawberry
        31,  # cherry
        32,  # blueberry
        34,  # mango
        37,  # lemon
        38,  # pear
        41,  # grape
        44,  # orange
        48,  # chicken_duck
        54,  # fish
        56,  # shrimp
        70,  # potato
        71,  # garlic
        72,  # cauliflower
        73,  # tomato
        76,  # spring_onion
        80,  # lettuce
        82,  # cucumber
        84,  # carrot
        87,  # broccoli
        88,  # celery_stick
        89,  # cilantro_mint
        91,  # cabbage
        93,  # onion
        94,  # pepper
        95,  # green_beans
        97,  # king_oyster_mushroom
        98,  # shiitake
        99,  # enoki_mushroom
        100,  # oyster_mushroom
        101,  # white_button_mushroom
    ],
    "produce": [
        25,
        28,
        29,
        30,
        31,
        32,
        34,
        37,
        38,
        41,
        44,
        70,
        71,
        72,
        73,
        76,
        80,
        82,
        84,
        87,
        88,
        89,
        91,
        93,
        94,
        95,
        97,
        98,
        99,
        100,
        101,
    ],
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Convert FoodSeg103 semantic masks into an Ultralytics YOLO "
            "segmentation dataset. This prepares data only; it does not train."
        )
    )
    parser.add_argument("--dataset-id", default=DATASET_ID)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--train-limit", type=int, default=0, help="0 means all.")
    parser.add_argument("--val-limit", type=int, default=0, help="0 means all.")
    parser.add_argument(
        "--preset",
        choices=sorted(CLASS_PRESETS),
        default="all",
        help="Convenience class set. Use fridge for inventory-oriented experiments.",
    )
    parser.add_argument("--max-labels", type=int, default=0, help="0 means all non-background labels.")
    parser.add_argument(
        "--include-class-id",
        type=int,
        action="append",
        default=[],
        help="FoodSeg103 class id to include. Repeatable. Overrides --max-labels when present.",
    )
    parser.add_argument("--min-mask-area-pixels", type=int, default=128)
    parser.add_argument("--min-mask-area-percent", type=float, default=0.05)
    parser.add_argument("--epsilon-ratio", type=float, default=0.002)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument(
        "--no-streaming",
        action="store_true",
        help="Disable Hugging Face streaming and materialize splits locally.",
    )
    parser.add_argument("--overwrite", action="store_true")
    return parser.parse_args()


def selected_class_ids(
    include_class_id: list[int],
    preset: str,
    max_labels: int,
) -> list[int]:
    if include_class_id:
        class_ids = sorted({class_id for class_id in include_class_id if class_id > 0})
    else:
        class_ids = list(CLASS_PRESETS[preset])
        if max_labels > 0:
            class_ids = class_ids[:max_labels]

    unknown_ids = [class_id for class_id in class_ids if class_id not in FOODSEG103_CLASSES]
    if unknown_ids:
        raise SystemExit(f"Unknown FoodSeg103 class ids: {unknown_ids}")

    return class_ids


def load_split(dataset_id: str, split: str, streaming: bool):
    try:
        from datasets import load_dataset
    except ImportError as exc:
        raise SystemExit(
            "Missing dependency: datasets. Install apps/vision-lab/requirements.txt first."
        ) from exc

    return load_dataset(dataset_id, split=split, streaming=streaming)


def split_rows(dataset: Any, limit: int, seed: int, streaming: bool) -> Any:
    if streaming:
        shuffled = dataset.shuffle(seed=seed, buffer_size=1000)
        return shuffled.take(limit) if limit > 0 else shuffled

    indices = list(range(len(dataset)))
    rng = random.Random(seed)
    rng.shuffle(indices)
    if limit > 0:
        indices = indices[:limit]
    return [dataset[index] for index in indices]


def image_from_row(row: dict[str, Any]) -> Image.Image:
    image = row["image"]
    if not isinstance(image, Image.Image):
        raise ValueError("Expected Hugging Face image feature to decode to PIL.Image")
    return image.convert("RGB")


def mask_from_row(row: dict[str, Any]) -> np.ndarray:
    mask_image = row["label"]
    if not isinstance(mask_image, Image.Image):
        raise ValueError("Expected Hugging Face label feature to decode to PIL.Image")
    return np.array(mask_image)


def contours_for_class(
    mask: np.ndarray,
    class_id: int,
    min_area_pixels: int,
    min_area_percent: float,
    epsilon_ratio: float,
) -> list[list[float]]:
    height, width = mask.shape[:2]
    image_area = max(1, width * height)
    min_area = max(min_area_pixels, image_area * (min_area_percent / 100.0))
    binary = (mask == class_id).astype("uint8") * 255
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    polygons: list[list[float]] = []

    for contour in contours:
        area = cv2.contourArea(contour)
        if area < min_area:
            continue

        epsilon = max(1.0, epsilon_ratio * cv2.arcLength(contour, closed=True))
        simplified = cv2.approxPolyDP(contour, epsilon=epsilon, closed=True)
        points = simplified.reshape(-1, 2)
        if len(points) < 3:
            continue

        normalized: list[float] = []
        for x_value, y_value in points:
            normalized.extend(
                [
                    round(float(max(0, min(width - 1, x_value))) / width, 6),
                    round(float(max(0, min(height - 1, y_value))) / height, 6),
                ]
            )
        polygons.append(normalized)

    return polygons


def write_data_yaml(output_dir: Path, class_ids: list[int]) -> None:
    names = "\n".join(
        f"  {index}: {FOODSEG103_CLASSES[class_id]}"
        for index, class_id in enumerate(class_ids)
    )
    content = (
        "path: .\n"
        "train: images/train\n"
        "val: images/val\n"
        f"nc: {len(class_ids)}\n"
        "names:\n"
        f"{names}\n"
    )
    (output_dir / "data.yaml").write_text(content, encoding="utf-8")


def export_split(
    rows: Any,
    split: str,
    output_dir: Path,
    class_ids: list[int],
    class_to_index: dict[int, int],
    args: argparse.Namespace,
) -> dict[str, Any]:
    image_dir = output_dir / "images" / split
    label_dir = output_dir / "labels" / split
    image_dir.mkdir(parents=True, exist_ok=True)
    label_dir.mkdir(parents=True, exist_ok=True)

    exported_images = 0
    skipped_images = 0
    polygon_count = 0
    class_polygon_counts: Counter[str] = Counter()
    manifest = []

    input_rows = 0
    for row_index, row in enumerate(rows, start=1):
        input_rows += 1
        image = image_from_row(row)
        mask = mask_from_row(row)
        label_lines: list[str] = []

        present_class_ids = [
            class_id
            for class_id in class_ids
            if class_id in set(int(value) for value in np.unique(mask))
        ]
        for class_id in present_class_ids:
            polygons = contours_for_class(
                mask=mask,
                class_id=class_id,
                min_area_pixels=args.min_mask_area_pixels,
                min_area_percent=args.min_mask_area_percent,
                epsilon_ratio=args.epsilon_ratio,
            )
            for polygon in polygons:
                label_lines.append(
                    f"{class_to_index[class_id]} "
                    + " ".join(f"{coordinate:.6f}" for coordinate in polygon)
                )
                class_polygon_counts[FOODSEG103_CLASSES[class_id]] += 1

        if not label_lines:
            skipped_images += 1
            continue

        exported_images += 1
        image_output = image_dir / f"{exported_images:06d}.jpg"
        label_output = label_dir / f"{exported_images:06d}.txt"
        image.save(image_output, quality=92)
        label_output.write_text("\n".join(label_lines) + "\n", encoding="utf-8")
        polygon_count += len(label_lines)
        manifest.append(
            {
                "split": split,
                "source_id": row.get("id", row_index),
                "image": str(image_output),
                "label": str(label_output),
                "polygon_count": len(label_lines),
                "source_classes_on_image": row.get("classes_on_image", []),
            }
        )

    (output_dir / f"manifest_{split}.json").write_text(
        json.dumps(manifest, indent=2),
        encoding="utf-8",
    )

    return {
        "split": split,
        "input_rows": input_rows,
        "exported_images": exported_images,
        "skipped_images": skipped_images,
        "polygon_count": polygon_count,
        "class_polygon_counts": dict(sorted(class_polygon_counts.items())),
    }


def main() -> None:
    args = parse_args()
    if args.overwrite and args.output_dir.exists():
        shutil.rmtree(args.output_dir)
    args.output_dir.mkdir(parents=True, exist_ok=True)

    class_ids = selected_class_ids(args.include_class_id, args.preset, args.max_labels)
    class_to_index = {class_id: index for index, class_id in enumerate(class_ids)}

    streaming = not args.no_streaming
    train_dataset = load_split(args.dataset_id, "train", streaming=streaming)
    validation_dataset = load_split(args.dataset_id, "validation", streaming=streaming)
    train_rows = split_rows(train_dataset, args.train_limit, args.seed, streaming=streaming)
    validation_rows = split_rows(
        validation_dataset,
        args.val_limit,
        args.seed + 1,
        streaming=streaming,
    )

    summaries = [
        export_split(train_rows, "train", args.output_dir, class_ids, class_to_index, args),
        export_split(
            validation_rows,
            "val",
            args.output_dir,
            class_ids,
            class_to_index,
            args,
        ),
    ]
    write_data_yaml(args.output_dir, class_ids)

    class_map = [
        {
            "yolo_index": class_to_index[class_id],
            "foodseg103_id": class_id,
            "label": FOODSEG103_CLASSES[class_id],
        }
        for class_id in class_ids
    ]
    summary = {
        "dataset_id": args.dataset_id,
        "output_dir": str(args.output_dir),
        "data_yaml": str(args.output_dir / "data.yaml"),
        "class_count": len(class_ids),
        "preset": args.preset,
        "streaming": streaming,
        "classes": class_map,
        "splits": summaries,
        "note": (
            "FoodSeg103 is semantic segmentation. This converter treats each "
            "connected class region as a YOLO segmentation instance."
        ),
    }
    (args.output_dir / "class_map.json").write_text(
        json.dumps(class_map, indent=2),
        encoding="utf-8",
    )
    (args.output_dir / "summary.json").write_text(
        json.dumps(summary, indent=2),
        encoding="utf-8",
    )
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
