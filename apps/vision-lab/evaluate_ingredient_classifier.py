from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path
from typing import Any

from chef_vision.checkpoints import DEFAULT_CLASSIFIER_RUN, resolve_classifier_checkpoint_path
from train_ingredient_classifier import build_model, progress_iterator, resolve_device


APP_DIR = Path(__file__).resolve().parent
DEFAULT_DATA_DIR = APP_DIR / "data" / "ingredient_training_dataset"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Evaluate a trained ingredient classifier checkpoint or inspect top-k predictions."
    )
    parser.add_argument(
        "--checkpoint",
        type=Path,
        default=resolve_classifier_checkpoint_path(DEFAULT_CLASSIFIER_RUN),
    )
    parser.add_argument("--data-dir", type=Path, default=DEFAULT_DATA_DIR)
    parser.add_argument("--split", choices=["train", "val", "test"], default="test")
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--num-workers", type=int, default=0)
    parser.add_argument("--device", choices=["auto", "cpu", "cuda"], default="auto")
    parser.add_argument("--top-k", type=int, default=5)
    parser.add_argument("--sample-count", type=int, default=20)
    parser.add_argument("--output-json", type=Path, default=None)
    parser.add_argument("--image", type=Path, action="append", default=[])
    parser.add_argument(
        "--progress",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Show live progress while evaluating a split.",
    )
    return parser.parse_args()


def eval_transform():
    from torchvision import transforms

    return transforms.Compose(
        [
            transforms.Resize((256, 256)),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ]
    )


def load_checkpoint(checkpoint_path: Path, device):
    import torch

    checkpoint = torch.load(checkpoint_path, map_location=device)
    class_names = checkpoint["class_names"]
    model = build_model(len(class_names), freeze_backbone=False).to(device)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()
    return model, class_names


def evaluate_split(args: argparse.Namespace, model, class_names: list[str], device) -> dict[str, Any]:
    import torch
    from torch.utils.data import DataLoader
    from torchvision import datasets

    dataset = datasets.ImageFolder(args.data_dir / args.split, transform=eval_transform())
    if dataset.classes != class_names:
        raise SystemExit(
            "Dataset classes do not match checkpoint classes. Use the same data-dir that produced the checkpoint."
        )

    dataloader = DataLoader(
        dataset,
        batch_size=args.batch_size,
        shuffle=False,
        num_workers=args.num_workers,
    )
    correct = 0
    topk_correct = 0
    total = 0
    per_class_total: Counter[str] = Counter()
    per_class_correct: Counter[str] = Counter()
    confusions: Counter[tuple[str, str]] = Counter()
    samples: list[dict[str, Any]] = []

    with torch.no_grad():
        batches = progress_iterator(dataloader, description=f"evaluate {args.split}", enabled=args.progress)
        for inputs, labels in batches:
            inputs = inputs.to(device)
            labels = labels.to(device)
            probabilities = torch.softmax(model(inputs), dim=1)
            predictions = probabilities.argmax(dim=1)
            top_k = min(args.top_k, probabilities.size(1))
            topk = probabilities.topk(top_k, dim=1)
            topk_correct += int((topk.indices == labels.unsqueeze(1)).any(dim=1).sum().item())

            batch_start = total
            for offset, (expected, predicted) in enumerate(zip(labels.cpu().tolist(), predictions.cpu().tolist())):
                expected_name = class_names[expected]
                predicted_name = class_names[predicted]
                per_class_total[expected_name] += 1
                total += 1
                if expected == predicted:
                    correct += 1
                    per_class_correct[expected_name] += 1
                else:
                    confusions[(expected_name, predicted_name)] += 1

                if len(samples) < args.sample_count:
                    sample_index = batch_start + offset
                    sample_path = dataset.samples[sample_index][0]
                    samples.append(
                        {
                            "image": sample_path,
                            "expected": expected_name,
                            "predicted": predicted_name,
                            "correct": expected == predicted,
                            "top_predictions": [
                                {
                                    "label": class_names[class_index],
                                    "probability": round(float(probability), 6),
                                }
                                for probability, class_index in zip(
                                    topk.values[offset].cpu().tolist(),
                                    topk.indices[offset].cpu().tolist(),
                                )
                            ],
                        }
                    )

            if hasattr(batches, "set_postfix"):
                batches.set_postfix(
                    acc=f"{correct / max(1, total):.3f}",
                    topk=f"{topk_correct / max(1, total):.3f}",
                )

    return {
        "checkpoint": str(args.checkpoint),
        "data_dir": str(args.data_dir),
        "split": args.split,
        "sample_count": total,
        "accuracy": round(correct / max(1, total), 6),
        f"top{args.top_k}_accuracy": round(topk_correct / max(1, total), 6),
        "per_class_accuracy": {
            class_name: round(per_class_correct[class_name] / count, 6)
            for class_name, count in sorted(per_class_total.items())
        },
        "top_confusions": [
            {"expected": expected, "predicted": predicted, "count": count}
            for (expected, predicted), count in confusions.most_common(25)
        ],
        "sample_predictions": samples,
    }


def predict_images(args: argparse.Namespace, model, class_names: list[str], device) -> list[dict[str, Any]]:
    import torch
    from PIL import Image

    transform = eval_transform()
    results = []
    with torch.no_grad():
        for image_path in args.image:
            image = Image.open(image_path).convert("RGB")
            tensor = transform(image).unsqueeze(0).to(device)
            probabilities = torch.softmax(model(tensor), dim=1).squeeze(0)
            top_k = min(args.top_k, len(class_names))
            values, indices = probabilities.topk(top_k)
            results.append(
                {
                    "image": str(image_path),
                    "top_predictions": [
                        {
                            "label": class_names[class_index],
                            "probability": round(float(probability), 6),
                        }
                        for probability, class_index in zip(values.cpu().tolist(), indices.cpu().tolist())
                    ],
                }
            )
    return results


def main() -> None:
    args = parse_args()
    device = resolve_device(args.device)
    model, class_names = load_checkpoint(args.checkpoint, device)

    output: dict[str, Any] = {
        "device": str(device),
        "class_count": len(class_names),
    }
    if args.image:
        output["image_predictions"] = predict_images(args, model, class_names, device)
    else:
        output.update(evaluate_split(args, model, class_names, device))

    rendered = json.dumps(output, indent=2)
    print(rendered)
    if args.output_json:
        args.output_json.parent.mkdir(parents=True, exist_ok=True)
        args.output_json.write_text(rendered + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
