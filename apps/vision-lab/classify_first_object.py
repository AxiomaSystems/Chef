from __future__ import annotations

import argparse
import json
from dataclasses import asdict
from pathlib import Path
from typing import Any, Literal

import numpy as np
from PIL import Image, ImageColor, ImageDraw

from chef_vision.contracts import FrameInput, ScanOptions
from chef_vision.pipeline import VisionPipeline


APP_DIR = Path(__file__).resolve().parent
DEFAULT_DATASET_DIR = APP_DIR / "data" / "hf_food_ingredient_balanced_preview"
FALLBACK_DATASET_DIR = APP_DIR / "data" / "hf_food_ingredient_preview"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Detect the first object with YOLO, crop it, then classify it against imported ingredient examples."
    )
    parser.add_argument("image", type=Path)
    parser.add_argument("--dataset-dir", type=Path, default=DEFAULT_DATASET_DIR)
    parser.add_argument("--model-name", default="yolo11n.pt")
    parser.add_argument("--confidence-threshold", type=float, default=0.20)
    parser.add_argument("--top-k", type=int, default=5)
    parser.add_argument(
        "--embedding",
        choices=["color", "resnet18"],
        default="color",
        help="color is dependency-light; resnet18 is stronger but may download pretrained weights on first use.",
    )
    parser.add_argument("--output-dir", type=Path, default=APP_DIR / "data" / "first_object_runs")
    return parser.parse_args()


def clean_label(label: str) -> str:
    return label.removesuffix("_annotated").replace("_", " ")


def label_from_filename(path: Path) -> str:
    stem = path.stem
    parts = stem.split("_", 1)
    return parts[1] if len(parts) == 2 else stem


def load_examples(dataset_dir: Path) -> list[dict[str, Any]]:
    if not dataset_dir.exists() and FALLBACK_DATASET_DIR.exists():
        dataset_dir = FALLBACK_DATASET_DIR

    metadata_path = dataset_dir / "metadata.json"
    if metadata_path.exists():
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        rows = []
        for row in metadata["rows"]:
            image_path = dataset_dir / row["image_path"]
            if image_path.exists():
                rows.append({"label": row["label"], "image_path": image_path})
        return rows

    images_dir = dataset_dir / "images"
    return [
        {"label": label_from_filename(path), "image_path": path}
        for path in sorted(images_dir.glob("*.jpg"))
    ]


class ColorEmbedder:
    def image_to_vector(self, image: Image.Image) -> np.ndarray:
        resized = image.convert("RGB").resize((160, 160))
        array = np.asarray(resized)
        features = []
        for channel in range(3):
            histogram, _ = np.histogram(array[:, :, channel], bins=32, range=(0, 256))
            features.append(histogram.astype(np.float32))
        vector = np.concatenate(features)
        norm = np.linalg.norm(vector)
        return vector / norm if norm else vector


class ResNet18Embedder:
    def __init__(self) -> None:
        import torch
        from torchvision.models import ResNet18_Weights, resnet18

        self.torch = torch
        self.weights = ResNet18_Weights.DEFAULT
        self.preprocess = self.weights.transforms()
        self.model = resnet18(weights=self.weights)
        self.model.fc = torch.nn.Identity()
        self.model.eval()

    def image_to_vector(self, image: Image.Image) -> np.ndarray:
        tensor = self.preprocess(image.convert("RGB")).unsqueeze(0)
        with self.torch.no_grad():
            vector = self.model(tensor).squeeze(0).numpy().astype(np.float32)
        norm = np.linalg.norm(vector)
        return vector / norm if norm else vector


def build_embedder(kind: Literal["color", "resnet18"]):
    if kind == "resnet18":
        return ResNet18Embedder()
    return ColorEmbedder()


def build_index(examples: list[dict[str, Any]], embedder) -> list[dict[str, Any]]:
    index = []
    for example in examples:
        image = Image.open(example["image_path"])
        vector = embedder.image_to_vector(image)
        index.append({**example, "vector": vector})
    return index


def classify_crop(crop: Image.Image, index: list[dict[str, Any]], embedder, top_k: int) -> list[dict[str, Any]]:
    query = embedder.image_to_vector(crop)
    best_by_label: dict[str, dict[str, Any]] = {}

    for item in index:
        score = float(np.dot(query, item["vector"]))
        label = item["label"]
        if label not in best_by_label or score > best_by_label[label]["score"]:
            best_by_label[label] = {
                "label": label,
                "display_label": clean_label(label),
                "score": round(score, 4),
                "example_image": str(item["image_path"]),
            }

    return sorted(best_by_label.values(), key=lambda item: item["score"], reverse=True)[:top_k]


def crop_detection(image: Image.Image, detection) -> Image.Image:
    width, height = image.size
    left = max(0, int(detection.bbox.x * width))
    top = max(0, int(detection.bbox.y * height))
    right = min(width, int((detection.bbox.x + detection.bbox.width) * width))
    bottom = min(height, int((detection.bbox.y + detection.bbox.height) * height))
    return image.crop((left, top, right, bottom))


def draw_result(image: Image.Image, detection, prediction: dict[str, Any]) -> Image.Image:
    rendered = image.copy()
    draw = ImageDraw.Draw(rendered)
    width, height = rendered.size
    left = max(0, int(detection.bbox.x * width))
    top = max(0, int(detection.bbox.y * height))
    right = min(width, int((detection.bbox.x + detection.bbox.width) * width))
    bottom = min(height, int((detection.bbox.y + detection.bbox.height) * height))
    color = ImageColor.getrgb("#16a34a")
    label = f"{prediction['display_label']} {prediction['score']:.2f}"

    draw.rectangle((left, top, right, bottom), outline=color, width=5)
    text_top = max(0, top - 24)
    draw.rectangle((left, text_top, min(width, left + 280), top), fill=color)
    draw.text((left + 6, text_top + 4), label, fill=(255, 255, 255))
    return rendered


def main() -> None:
    args = parse_args()
    examples = load_examples(args.dataset_dir)
    if not examples:
        raise SystemExit(
            f"No imported ingredient examples found in {args.dataset_dir}. Run import_hf_food_ingredient.py first."
        )

    image = Image.open(args.image).convert("RGB")
    pipeline = VisionPipeline(detector_name="yolo", model_name=args.model_name)
    result = pipeline.analyze_scan(
        scan_session_id=f"classify_first_{args.image.stem}",
        frames=[FrameInput(frame_id=1, frame_ref=args.image.name, image_path=str(args.image))],
        options=ScanOptions(
            include_ignored=True,
            confidence_threshold=args.confidence_threshold,
            max_detections_per_frame=20,
        ),
    )
    detections = sorted(result.frames[0].detections, key=lambda item: item.confidence, reverse=True)
    if not detections:
        raise SystemExit("YOLO did not find any objects to crop/classify.")

    detection = detections[0]
    crop = crop_detection(image, detection)
    embedder = build_embedder(args.embedding)
    index = build_index(examples, embedder)
    predictions = classify_crop(crop, index, embedder, args.top_k)

    args.output_dir.mkdir(parents=True, exist_ok=True)
    crop_path = args.output_dir / f"{args.image.stem}_first_object_crop.jpg"
    annotated_path = args.output_dir / f"{args.image.stem}_first_object_annotated.jpg"
    result_path = args.output_dir / f"{args.image.stem}_first_object_result.json"

    crop.save(crop_path, quality=92)
    draw_result(image, detection, predictions[0]).save(annotated_path, quality=92)
    result_path.write_text(
        json.dumps(
            {
                "image": str(args.image),
                "dataset_dir": str(args.dataset_dir),
                "embedding": args.embedding,
                "indexed_examples": len(index),
                "yolo_detection": asdict(detection),
                "predictions": predictions,
                "crop_path": str(crop_path),
                "annotated_path": str(annotated_path),
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    print(f"Detected: {detection.label} ({detection.confidence:.2f})")
    print(f"Classified as: {predictions[0]['display_label']} ({predictions[0]['score']:.2f})")
    print(f"Wrote crop: {crop_path}")
    print(f"Wrote annotated image: {annotated_path}")
    print(f"Wrote result JSON: {result_path}")


if __name__ == "__main__":
    main()
