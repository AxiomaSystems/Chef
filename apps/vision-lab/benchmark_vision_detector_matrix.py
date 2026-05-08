from __future__ import annotations

import argparse
import json
import math
import shutil
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont

from chef_vision.classifier import classify_ingredient_image, default_checkpoint_path, ontology_entry_for_label
from chef_vision.detectors.yolo import _resolve_ontology_entry


APP_DIR = Path(__file__).resolve().parent
DEFAULT_BUILD_DIR = APP_DIR / "data" / "training-builds" / "detector" / "chef-detector-v004-object-proposal"
DEFAULT_OUTPUT_DIR = APP_DIR / "reports" / "vision" / "detector-matrix"


@dataclass(slots=True)
class GroundTruth:
    image_id: str
    image_path: Path
    class_id: str
    canonical_class_id: str
    label: str
    box: tuple[float, float, float, float]


@dataclass(slots=True)
class Prediction:
    image_id: str
    class_id: str
    final_class_id: str
    label: str
    final_label: str
    confidence: float
    box: tuple[float, float, float, float]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run the 4-way detector/classifier benchmark matrix for a YOLO detector build."
    )
    parser.add_argument("--dataset-build", type=Path, default=DEFAULT_BUILD_DIR)
    parser.add_argument("--baseline-model", default="yolo11n.pt")
    parser.add_argument("--candidate-model", required=True)
    parser.add_argument("--classifier-checkpoint", type=Path, default=default_checkpoint_path())
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--split", choices=("train", "val", "test"), default="test")
    parser.add_argument("--limit-images", type=int, default=0)
    parser.add_argument("--confidence-threshold", type=float, default=0.25)
    parser.add_argument("--classifier-min-confidence", type=float, default=0.15)
    parser.add_argument("--visual-samples", type=int, default=40)
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


def load_ground_truth(build_dir: Path, split: str, limit_images: int) -> tuple[list[GroundTruth], list[Path]]:
    manifest_path = build_dir / "manifest.json"
    if not manifest_path.exists():
        raise SystemExit(f"Missing build manifest: {manifest_path}")

    rows = json.loads(manifest_path.read_text(encoding="utf-8"))
    ground_truth: list[GroundTruth] = []
    image_paths: list[Path] = []

    for row in rows:
        if row.get("split") != split:
            continue
        if limit_images > 0 and len(image_paths) >= limit_images:
            break

        image_path = Path(row["image"])
        label_path = Path(row["label"])
        if not image_path.exists() or not label_path.exists():
            continue

        image_id = label_path.stem
        image_paths.append(image_path)
        annotations = row.get("annotations", [])
        label_lines = [line for line in label_path.read_text(encoding="utf-8").splitlines() if line.strip()]
        for index, line in enumerate(label_lines):
            parts = line.split()
            if len(parts) < 5:
                continue
            class_id = int(float(parts[0]))
            x_center, y_center, width, height = [float(value) for value in parts[1:5]]
            annotation = annotations[index] if index < len(annotations) else {}
            ground_truth.append(
                GroundTruth(
                    image_id=image_id,
                    image_path=image_path,
                    class_id=annotation.get("class_name", str(class_id)),
                    canonical_class_id=annotation.get("canonical_class_name", annotation.get("class_name", str(class_id))),
                    label=annotation.get("canonical_label", annotation.get("class_name", str(class_id))),
                    box=(
                        max(0.0, x_center - width / 2),
                        max(0.0, y_center - height / 2),
                        min(1.0, x_center + width / 2),
                        min(1.0, y_center + height / 2),
                    ),
                )
            )

    return ground_truth, image_paths


def load_model(model_name: str) -> Any:
    from ultralytics import YOLO

    model_path = Path(model_name)
    if model_path.exists():
        return YOLO(str(model_path.resolve()))
    return YOLO(model_name)


def predict_images(
    model_name: str,
    image_paths: list[Path],
    classifier_enabled: bool,
    classifier_checkpoint: Path,
    confidence_threshold: float,
    classifier_min_confidence: float,
) -> list[Prediction]:
    model = load_model(model_name)
    predictions: list[Prediction] = []

    for image_path in image_paths:
        image = Image.open(image_path).convert("RGB")
        width, height = image.size
        result = model(str(image_path), conf=confidence_threshold, verbose=False)[0]
        names = result.names
        boxes = getattr(result, "boxes", None)
        if boxes is None:
            continue

        for box in boxes:
            cls_id = int(box.cls[0].item())
            confidence = float(box.conf[0].item())
            raw_label = names.get(cls_id, str(cls_id)) if isinstance(names, dict) else names[cls_id]
            ontology_entry = _resolve_ontology_entry(raw_label)
            x1, y1, x2, y2 = [float(value) for value in box.xyxy[0].tolist()]
            normalized_box = (
                max(0.0, min(1.0, x1 / width)),
                max(0.0, min(1.0, y1 / height)),
                max(0.0, min(1.0, x2 / width)),
                max(0.0, min(1.0, y2 / height)),
            )
            final_class_id = ontology_entry["id"]
            final_label = ontology_entry["label"]

            if classifier_enabled and classifier_checkpoint.exists():
                crop = image.crop((max(0, int(x1)), max(0, int(y1)), min(width, int(x2)), min(height, int(y2))))
                if crop.size[0] > 1 and crop.size[1] > 1:
                    classifier_predictions = classify_ingredient_image(crop, classifier_checkpoint, top_k=5)
                    if classifier_predictions and classifier_predictions[0].probability >= classifier_min_confidence:
                        classified_entry = ontology_entry_for_label(classifier_predictions[0].label)
                        final_class_id = classified_entry["id"]
                        final_label = classified_entry["label"]

            predictions.append(
                Prediction(
                    image_id=image_path.stem,
                    class_id=ontology_entry["id"],
                    final_class_id=final_class_id,
                    label=ontology_entry["label"],
                    final_label=final_label,
                    confidence=round(confidence, 6),
                    box=normalized_box,
                )
            )

    return predictions


def iou(left: tuple[float, float, float, float], right: tuple[float, float, float, float]) -> float:
    x1 = max(left[0], right[0])
    y1 = max(left[1], right[1])
    x2 = min(left[2], right[2])
    y2 = min(left[3], right[3])
    intersection = max(0.0, x2 - x1) * max(0.0, y2 - y1)
    if intersection <= 0:
        return 0.0
    left_area = max(0.0, left[2] - left[0]) * max(0.0, left[3] - left[1])
    right_area = max(0.0, right[2] - right[0]) * max(0.0, right[3] - right[1])
    union = left_area + right_area - intersection
    return intersection / union if union > 0 else 0.0


def area(box: tuple[float, float, float, float]) -> float:
    return max(0.0, box[2] - box[0]) * max(0.0, box[3] - box[1])


def compute_ap(
    ground_truth: list[GroundTruth],
    predictions: list[Prediction],
    threshold: float,
    class_id: str,
) -> tuple[float, int, int, int]:
    gt_for_class = [item for item in ground_truth if item.class_id == class_id]
    pred_for_class = sorted(
        [item for item in predictions if item.class_id == class_id],
        key=lambda item: item.confidence,
        reverse=True,
    )
    matched: set[int] = set()
    tp = []
    fp = []

    for prediction in pred_for_class:
        candidates = [
            (index, iou(prediction.box, gt.box))
            for index, gt in enumerate(gt_for_class)
            if gt.image_id == prediction.image_id and index not in matched
        ]
        best_index, best_iou = max(candidates, key=lambda item: item[1], default=(-1, 0.0))
        if best_index >= 0 and best_iou >= threshold:
            matched.add(best_index)
            tp.append(1)
            fp.append(0)
        else:
            tp.append(0)
            fp.append(1)

    if not gt_for_class:
        return 0.0, sum(tp), sum(fp), 0

    cumulative_tp = []
    cumulative_fp = []
    running_tp = 0
    running_fp = 0
    for tp_value, fp_value in zip(tp, fp):
        running_tp += tp_value
        running_fp += fp_value
        cumulative_tp.append(running_tp)
        cumulative_fp.append(running_fp)

    precisions = [
        cumulative_tp[index] / max(1, cumulative_tp[index] + cumulative_fp[index])
        for index in range(len(cumulative_tp))
    ]
    recalls = [value / len(gt_for_class) for value in cumulative_tp]
    ap = 0.0
    previous_recall = 0.0
    for precision, recall in zip(precisions, recalls):
        ap += max(0.0, recall - previous_recall) * precision
        previous_recall = recall
    return ap, sum(tp), sum(fp), len(gt_for_class) - len(matched)


def compute_metrics(ground_truth: list[GroundTruth], predictions: list[Prediction]) -> dict[str, Any]:
    class_ids = sorted({item.class_id for item in ground_truth})
    thresholds = [round(0.5 + 0.05 * index, 2) for index in range(10)]
    per_threshold_maps = {}
    per_class_at_50 = {}

    for threshold in thresholds:
        aps = []
        for class_id in class_ids:
            ap, tp, fp, fn = compute_ap(ground_truth, predictions, threshold, class_id)
            aps.append(ap)
            if math.isclose(threshold, 0.5):
                per_class_at_50[class_id] = {
                    "ap50": round(ap, 6),
                    "true_positive": tp,
                    "false_positive": fp,
                    "false_negative": fn,
                    "precision": round(tp / max(1, tp + fp), 6),
                    "recall": round(tp / max(1, tp + fn), 6),
                }
        per_threshold_maps[str(threshold)] = round(sum(aps) / max(1, len(aps)), 6)

    tp_total = sum(item["true_positive"] for item in per_class_at_50.values())
    fp_total = sum(item["false_positive"] for item in per_class_at_50.values())
    fn_total = sum(item["false_negative"] for item in per_class_at_50.values())
    return {
        "mAP50": per_threshold_maps["0.5"],
        "mAP50_95": round(sum(per_threshold_maps.values()) / len(per_threshold_maps), 6),
        "precision": round(tp_total / max(1, tp_total + fp_total), 6),
        "recall": round(tp_total / max(1, tp_total + fn_total), 6),
        "per_class": per_class_at_50,
        "per_threshold_mAP": per_threshold_maps,
    }


def match_by_box(ground_truth: list[GroundTruth], predictions: list[Prediction], threshold: float = 0.5) -> list[tuple[GroundTruth, Prediction, float]]:
    matches = []
    used_predictions: set[int] = set()
    for gt in ground_truth:
        candidates = [
            (index, prediction, iou(gt.box, prediction.box))
            for index, prediction in enumerate(predictions)
            if prediction.image_id == gt.image_id and index not in used_predictions
        ]
        best_index, best_prediction, best_iou = max(candidates, key=lambda item: item[2], default=(-1, None, 0.0))
        if best_index >= 0 and best_prediction is not None and best_iou >= threshold:
            used_predictions.add(best_index)
            matches.append((gt, best_prediction, best_iou))
    return matches


def failure_examples(ground_truth: list[GroundTruth], predictions: list[Prediction]) -> dict[str, list[dict[str, Any]]]:
    matches = match_by_box(ground_truth, predictions, threshold=0.5)
    matched_gt = {(gt.image_id, gt.class_id, gt.box) for gt, _, _ in matches}
    missed = [
        {
            "image_id": gt.image_id,
            "image": str(gt.image_path),
            "class_id": gt.class_id,
            "canonical_class_id": gt.canonical_class_id,
        }
        for gt in ground_truth
        if (gt.image_id, gt.class_id, gt.box) not in matched_gt
    ][:50]

    oversized = []
    for prediction in predictions:
        candidates = [
            (gt, iou(prediction.box, gt.box))
            for gt in ground_truth
            if gt.image_id == prediction.image_id
        ]
        gt, best_iou = max(candidates, key=lambda item: item[1], default=(None, 0.0))
        if gt is None or best_iou < 0.1:
            continue
        ratio = area(prediction.box) / max(0.000001, area(gt.box))
        if ratio >= 2.5:
            oversized.append(
                {
                    "image_id": prediction.image_id,
                    "image": str(gt.image_path),
                    "predicted_class_id": prediction.class_id,
                    "ground_truth_class_id": gt.class_id,
                    "iou": round(best_iou, 6),
                    "area_ratio": round(ratio, 3),
                }
            )
    return {"missed_objects": missed, "oversized_predictions": sorted(oversized, key=lambda item: item["area_ratio"], reverse=True)[:50]}


def identity_metrics(ground_truth: list[GroundTruth], predictions: list[Prediction]) -> dict[str, Any]:
    matches = match_by_box(ground_truth, predictions, threshold=0.5)
    if not matches:
        return {"matched_box_count": 0, "final_identity_accuracy": 0.0}
    correct = sum(1 for gt, prediction, _ in matches if prediction.final_class_id == gt.canonical_class_id)
    return {
        "matched_box_count": len(matches),
        "final_identity_accuracy": round(correct / len(matches), 6),
    }


def draw_sample(
    image_path: Path,
    ground_truth: list[GroundTruth],
    predictions: list[Prediction],
    output_path: Path,
) -> None:
    image = Image.open(image_path).convert("RGB")
    width, height = image.size
    draw = ImageDraw.Draw(image)
    font = ImageFont.load_default()
    image_id = image_path.stem

    for gt in [item for item in ground_truth if item.image_id == image_id]:
        x1, y1, x2, y2 = gt.box
        coords = (x1 * width, y1 * height, x2 * width, y2 * height)
        draw.rectangle(coords, outline=(40, 180, 80), width=3)
        draw.text((coords[0], max(0, coords[1] - 12)), f"GT {gt.class_id}", fill=(40, 180, 80), font=font)

    for prediction in [item for item in predictions if item.image_id == image_id]:
        x1, y1, x2, y2 = prediction.box
        coords = (x1 * width, y1 * height, x2 * width, y2 * height)
        draw.rectangle(coords, outline=(220, 60, 50), width=2)
        draw.text(
            (coords[0], coords[3] + 2),
            f"P {prediction.class_id} -> {prediction.final_class_id} {prediction.confidence:.2f}",
            fill=(220, 60, 50),
            font=font,
        )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    image.save(output_path, quality=86)


def write_visual_qa(
    output_dir: Path,
    run_name: str,
    ground_truth: list[GroundTruth],
    predictions: list[Prediction],
    image_paths: list[Path],
    sample_count: int,
) -> list[str]:
    sample_dir = output_dir / "samples"
    if sample_dir.exists():
        shutil.rmtree(sample_dir)
    sample_dir.mkdir(parents=True, exist_ok=True)
    selected = image_paths[:sample_count]
    sample_files = []
    for image_path in selected:
        output_path = sample_dir / f"{run_name}_{image_path.stem}.jpg"
        draw_sample(image_path, ground_truth, predictions, output_path)
        sample_files.append(str(output_path.relative_to(output_dir)))
    return sample_files


def write_summary(output_dir: Path, comparison: list[dict[str, Any]]) -> None:
    lines = [
        "# Vision Detector Benchmark",
        "",
        "| Run | Detector | Classifier | mAP50 | mAP50-95 | Precision | Recall | Identity Acc |",
        "|---|---|---:|---:|---:|---:|---:|---:|",
    ]
    for item in comparison:
        metrics = item["metrics"]
        identity = item["identity"]
        lines.append(
            "| {name} | `{model}` | {classifier} | {map50:.4f} | {map5095:.4f} | {precision:.4f} | {recall:.4f} | {identity_acc:.4f} |".format(
                name=item["name"],
                model=item["model"],
                classifier="on" if item["classifier_enabled"] else "off",
                map50=metrics["mAP50"],
                map5095=metrics["mAP50_95"],
                precision=metrics["precision"],
                recall=metrics["recall"],
                identity_acc=identity["final_identity_accuracy"],
            )
        )
    (output_dir / "summary.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

    html_lines = ["<html><body><h1>Vision Detector Benchmark</h1>"]
    html_lines.append((output_dir / "summary.md").read_text(encoding="utf-8").replace("\n", "<br>\n"))
    for item in comparison:
        html_lines.append(f"<h2>{item['name']}</h2>")
        for sample in item["visual_samples"][:20]:
            html_lines.append(f'<img src="{sample}" style="max-width: 640px; margin: 8px; border: 1px solid #ccc;" />')
    html_lines.append("</body></html>")
    (output_dir / "visual_qa.html").write_text("\n".join(html_lines), encoding="utf-8")


def run_one(
    name: str,
    model_name: str,
    classifier_enabled: bool,
    args: argparse.Namespace,
    ground_truth: list[GroundTruth],
    image_paths: list[Path],
) -> dict[str, Any]:
    run_dir = args.output_dir / name
    run_dir.mkdir(parents=True, exist_ok=True)
    predictions = predict_images(
        model_name=model_name,
        image_paths=image_paths,
        classifier_enabled=classifier_enabled,
        classifier_checkpoint=args.classifier_checkpoint,
        confidence_threshold=args.confidence_threshold,
        classifier_min_confidence=args.classifier_min_confidence,
    )
    report = {
        "name": name,
        "model": model_name,
        "classifier_enabled": classifier_enabled,
        "dataset_build": str(args.dataset_build),
        "split": args.split,
        "image_count": len(image_paths),
        "ground_truth_box_count": len(ground_truth),
        "prediction_count": len(predictions),
        "metrics": compute_metrics(ground_truth, predictions),
        "identity": identity_metrics(ground_truth, predictions),
        "failures": failure_examples(ground_truth, predictions),
    }
    visual_samples = write_visual_qa(
        run_dir,
        name,
        ground_truth,
        predictions,
        image_paths,
        args.visual_samples,
    )
    report["visual_samples"] = [f"{name}/{sample}" for sample in visual_samples]
    (run_dir / "metrics.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    return report


def main() -> None:
    args = parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    ground_truth, image_paths = load_ground_truth(args.dataset_build, args.split, args.limit_images)
    if not ground_truth:
        raise SystemExit(f"No ground-truth boxes found in {args.dataset_build} split={args.split}")

    runs = [
        ("A_original_yolo", args.baseline_model, False),
        ("B_original_yolo_resnet", args.baseline_model, True),
        ("C_openimages_detector", args.candidate_model, False),
        ("D_openimages_detector_resnet", args.candidate_model, True),
    ]
    comparison = [
        run_one(name, model_name, classifier_enabled, args, ground_truth, image_paths)
        for name, model_name, classifier_enabled in runs
    ]
    (args.output_dir / "comparison.json").write_text(json.dumps(comparison, indent=2) + "\n", encoding="utf-8")
    write_summary(args.output_dir, comparison)
    print(json.dumps({"output_dir": str(args.output_dir), "runs": [item["name"] for item in comparison]}, indent=2))


if __name__ == "__main__":
    main()
