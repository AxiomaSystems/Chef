from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any
from uuid import uuid4

from PIL import Image

from chef_vision.checkpoints import DEFAULT_CLASSIFIER_RUN, resolve_classifier_checkpoint_path
from chef_vision.contracts import BoundingBox, ClassificationPrediction, Detection
from chef_vision.ontology import ONTOLOGY


def default_checkpoint_path(run_name: str = DEFAULT_CLASSIFIER_RUN) -> Path:
    return resolve_classifier_checkpoint_path(run_name)


def crop_detection(image: Image.Image, detection: Detection) -> Image.Image | None:
    width, height = image.size
    left = max(0, int(detection.bbox.x * width))
    top = max(0, int(detection.bbox.y * height))
    right = min(width, int((detection.bbox.x + detection.bbox.width) * width))
    bottom = min(height, int((detection.bbox.y + detection.bbox.height) * height))

    if right <= left or bottom <= top:
        return None

    return image.crop((left, top, right, bottom))


def generate_grid_crops(
    image: Image.Image,
    crop_fraction: float,
    stride_fraction: float,
    max_crops: int,
) -> list[tuple[tuple[int, int, int, int], Image.Image]]:
    width, height = image.size
    crop_size = max(64, int(min(width, height) * crop_fraction))
    stride = max(32, int(crop_size * stride_fraction))
    boxes: list[tuple[int, int, int, int]] = []

    y = 0
    while y + crop_size <= height:
        x = 0
        while x + crop_size <= width:
            boxes.append((x, y, x + crop_size, y + crop_size))
            x += stride
        y += stride

    if width > crop_size and all(box[2] < width for box in boxes):
        for y1 in range(0, max(1, height - crop_size + 1), stride):
            boxes.append((width - crop_size, y1, width, y1 + crop_size))

    if height > crop_size and all(box[3] < height for box in boxes):
        for x1 in range(0, max(1, width - crop_size + 1), stride):
            boxes.append((x1, height - crop_size, x1 + crop_size, height))

    center_box = (
        max(0, (width - crop_size) // 2),
        max(0, (height - crop_size) // 2),
        min(width, (width + crop_size) // 2),
        min(height, (height + crop_size) // 2),
    )
    boxes.append(center_box)

    unique_boxes = list(dict.fromkeys(boxes))
    return [(box, image.crop(box)) for box in unique_boxes[:max_crops]]


def classify_ingredient_image(
    image: Image.Image,
    checkpoint_path: Path,
    top_k: int = 5,
) -> list[ClassificationPrediction]:
    import torch

    model, class_names, transform = _load_ingredient_classifier(str(checkpoint_path))
    tensor = transform(image.convert("RGB")).unsqueeze(0)

    with torch.no_grad():
        probabilities = torch.softmax(model(tensor), dim=1).squeeze(0)
        values, indices = probabilities.topk(min(top_k, len(class_names)))

    return [
        ClassificationPrediction(
            label=display_label(class_names[class_index]),
            probability=round(float(probability), 6),
        )
        for probability, class_index in zip(values.tolist(), indices.tolist())
    ]


def apply_classification_to_detection(
    detection: Detection,
    predictions: list[ClassificationPrediction],
    min_confidence: float,
) -> None:
    detection.classification_predictions = predictions

    if not predictions:
        return

    top_prediction = predictions[0]
    if top_prediction.probability < min_confidence:
        return

    ontology_entry = ontology_entry_for_label(top_prediction.label)
    detection.detector_label = detection.detector_label or detection.label
    detection.detector_confidence = detection.detector_confidence or detection.confidence
    detection.label = top_prediction.label
    detection.class_id = ontology_entry["id"]
    detection.category = ontology_entry["category"]
    detection.granularity = "exact"
    detection.inventory_policy = ontology_entry["inventory_policy"]
    detection.confidence = top_prediction.probability


def grid_detection_from_prediction(
    frame_id: int,
    index: int,
    image: Image.Image,
    box: tuple[int, int, int, int],
    predictions: list[ClassificationPrediction],
) -> Detection | None:
    if not predictions:
        return None

    top_prediction = predictions[0]
    ontology_entry = ontology_entry_for_label(top_prediction.label)
    return Detection(
        observation_id=f"grid_{frame_id}_{index}_{uuid4().hex[:8]}",
        class_id=ontology_entry["id"],
        label=top_prediction.label,
        category=ontology_entry["category"],
        granularity="exact",
        inventory_policy=ontology_entry["inventory_policy"],
        bbox=box_to_bbox(image, box),
        confidence=top_prediction.probability,
        detector_label="fallback crop",
        detector_confidence=None,
        classification_predictions=predictions,
    )


def full_image_detection_from_prediction(
    frame_id: int,
    predictions: list[ClassificationPrediction],
) -> Detection | None:
    if not predictions:
        return None

    top_prediction = predictions[0]
    ontology_entry = ontology_entry_for_label(top_prediction.label)
    return Detection(
        observation_id=f"full_{frame_id}_{uuid4().hex[:8]}",
        class_id=ontology_entry["id"],
        label=top_prediction.label,
        category=ontology_entry["category"],
        granularity="exact",
        inventory_policy=ontology_entry["inventory_policy"],
        bbox=BoundingBox(x=0.0, y=0.0, width=1.0, height=1.0),
        confidence=top_prediction.probability,
        detector_label="whole image",
        detector_confidence=None,
        classification_predictions=predictions,
    )


def box_to_bbox(image: Image.Image, box: tuple[int, int, int, int]) -> BoundingBox:
    width, height = image.size
    left, top, right, bottom = box
    return BoundingBox(
        x=round(max(0.0, min(1.0, left / width)), 4),
        y=round(max(0.0, min(1.0, top / height)), 4),
        width=round(max(0.0, min(1.0, (right - left) / width)), 4),
        height=round(max(0.0, min(1.0, (bottom - top) / height)), 4),
    )


def detection_iou(left: Detection, right: Detection) -> float:
    left_x2 = left.bbox.x + left.bbox.width
    left_y2 = left.bbox.y + left.bbox.height
    right_x2 = right.bbox.x + right.bbox.width
    right_y2 = right.bbox.y + right.bbox.height

    intersection_width = max(0.0, min(left_x2, right_x2) - max(left.bbox.x, right.bbox.x))
    intersection_height = max(0.0, min(left_y2, right_y2) - max(left.bbox.y, right.bbox.y))
    intersection = intersection_width * intersection_height
    if intersection <= 0:
        return 0.0

    left_area = left.bbox.width * left.bbox.height
    right_area = right.bbox.width * right.bbox.height
    union = left_area + right_area - intersection
    if union <= 0:
        return 0.0

    return intersection / union


def ontology_entry_for_label(label: str) -> dict[str, Any]:
    normalized_label = normalize_label(label)

    for entry in ONTOLOGY:
        aliases = [entry["label"], *entry.get("aliases", [])]
        if any(normalize_label(alias) == normalized_label for alias in aliases):
            return {
                **entry,
                "id": normalized_label.replace(" ", "_"),
                "label": label,
                "granularity": "exact",
                "inventory_policy": "track",
            }

    return {
        "id": normalized_label.replace(" ", "_"),
        "label": label,
        "category": infer_category(label),
        "granularity": "exact",
        "inventory_policy": "track",
    }


def display_label(label: str) -> str:
    return label.removesuffix("_annotated").replace("_", " ").strip()


def normalize_label(label: str) -> str:
    return display_label(label).lower()


def infer_category(label: str) -> str:
    normalized_label = normalize_label(label)
    packaged_terms = (
        "flour",
        "rice",
        "bread",
        "cereal",
        "crumb",
        "mix",
        "syrup",
        "cookies",
        "oats",
        "pasta",
        "noodles",
        "salt",
        "sugar",
        "yogurt",
    )
    prepared_terms = ("bacon", "beef", "chicken", "fish", "pork", "salmon", "shrimp")

    if any(term in normalized_label for term in packaged_terms):
        return "packaged_food"
    if any(term in normalized_label for term in prepared_terms):
        return "prepared_food"
    return "produce"


@lru_cache(maxsize=3)
def _load_ingredient_classifier(checkpoint_path: str) -> tuple[Any, list[str], Any]:
    import torch
    from torchvision import transforms
    from torchvision.models import resnet18

    checkpoint = torch.load(checkpoint_path, map_location="cpu")
    class_names = checkpoint["class_names"]
    model = resnet18(weights=None)
    model.fc = torch.nn.Linear(model.fc.in_features, len(class_names))
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()
    transform = transforms.Compose(
        [
            transforms.Resize((256, 256)),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ]
    )
    return model, class_names, transform
