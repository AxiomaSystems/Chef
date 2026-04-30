from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


APP_DIR = Path(__file__).resolve().parent
DEFAULT_DATA_DIR = APP_DIR / "data" / "ingredient_training_dataset"
DEFAULT_OUTPUT_DIR = APP_DIR / "data" / "ingredient_classifier_runs"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Train and evaluate an ingredient image classifier from an ImageFolder train/val/test dataset."
    )
    parser.add_argument("--data-dir", type=Path, default=DEFAULT_DATA_DIR)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--run-name", default="")
    parser.add_argument("--epochs", type=int, default=8)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--learning-rate", type=float, default=0.001)
    parser.add_argument("--weight-decay", type=float, default=0.0001)
    parser.add_argument("--num-workers", type=int, default=0)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--device", choices=["auto", "cpu", "cuda"], default="auto")
    parser.add_argument("--freeze-backbone", action="store_true")
    parser.add_argument(
        "--progress",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Show live batch progress bars during train/validation/test.",
    )
    return parser.parse_args()


def resolve_device(device_arg: str):
    import torch

    if device_arg == "cuda":
        if not torch.cuda.is_available():
            raise SystemExit("CUDA was requested but is not available.")
        return torch.device("cuda")
    if device_arg == "cpu":
        return torch.device("cpu")
    return torch.device("cuda" if torch.cuda.is_available() else "cpu")


def build_dataloaders(data_dir: Path, batch_size: int, num_workers: int):
    from torch.utils.data import DataLoader
    from torchvision import datasets, transforms

    train_transform = transforms.Compose(
        [
            transforms.Resize((256, 256)),
            transforms.RandomResizedCrop(224, scale=(0.75, 1.0)),
            transforms.RandomHorizontalFlip(),
            transforms.ColorJitter(brightness=0.15, contrast=0.15, saturation=0.10),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ]
    )
    eval_transform = transforms.Compose(
        [
            transforms.Resize((256, 256)),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ]
    )

    def image_folder(path: Path, transform):
        try:
            return datasets.ImageFolder(path, transform=transform, allow_empty=True)
        except TypeError:
            return datasets.ImageFolder(path, transform=transform)

    datasets_by_split = {
        "train": image_folder(data_dir / "train", train_transform),
        "val": image_folder(data_dir / "val", eval_transform),
        "test": image_folder(data_dir / "test", eval_transform),
    }
    train_classes = datasets_by_split["train"].classes
    for split_name, dataset in datasets_by_split.items():
        if dataset.classes != train_classes:
            raise SystemExit(
                f"{split_name} classes do not match train classes. Rebuild the dataset with enough examples per label."
            )
    if len(datasets_by_split["train"]) == 0:
        raise SystemExit("The training split is empty. Rebuild the dataset with more imported images.")
    if len(datasets_by_split["val"]) == 0:
        raise SystemExit("The validation split is empty. Rebuild with at least 2-3 examples per label.")
    if len(datasets_by_split["test"]) == 0:
        raise SystemExit("The test split is empty. Rebuild with at least 3 examples per label.")

    dataloaders = {
        "train": DataLoader(
            datasets_by_split["train"],
            batch_size=batch_size,
            shuffle=True,
            num_workers=num_workers,
        ),
        "val": DataLoader(
            datasets_by_split["val"],
            batch_size=batch_size,
            shuffle=False,
            num_workers=num_workers,
        ),
        "test": DataLoader(
            datasets_by_split["test"],
            batch_size=batch_size,
            shuffle=False,
            num_workers=num_workers,
        ),
    }
    return datasets_by_split, dataloaders


def build_model(class_count: int, freeze_backbone: bool):
    import torch
    from torchvision.models import ResNet18_Weights, resnet18

    weights = ResNet18_Weights.DEFAULT
    model = resnet18(weights=weights)
    if freeze_backbone:
        for parameter in model.parameters():
            parameter.requires_grad = False

    model.fc = torch.nn.Linear(model.fc.in_features, class_count)
    return model


def progress_iterator(iterable, description: str, enabled: bool):
    if not enabled:
        return iterable

    try:
        from tqdm.auto import tqdm
    except ImportError:
        return iterable

    return tqdm(
        iterable,
        total=len(iterable),
        desc=description,
        unit="batch",
        leave=False,
        dynamic_ncols=True,
    )


def run_epoch(
    model,
    dataloader,
    criterion,
    optimizer,
    device,
    train: bool,
    epoch: int,
    epoch_count: int,
    show_progress: bool,
) -> dict[str, float]:
    import torch

    model.train(train)
    phase = "train" if train else "val"
    total_loss = 0.0
    correct = 0
    top5_correct = 0
    total = 0

    batches = progress_iterator(
        dataloader,
        description=f"epoch {epoch:02d}/{epoch_count:02d} {phase}",
        enabled=show_progress,
    )
    for inputs, labels in batches:
        inputs = inputs.to(device)
        labels = labels.to(device)

        if train:
            optimizer.zero_grad(set_to_none=True)

        with torch.set_grad_enabled(train):
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            if train:
                loss.backward()
                optimizer.step()

        batch_size = inputs.size(0)
        total_loss += float(loss.item()) * batch_size
        predictions = outputs.argmax(dim=1)
        correct += int((predictions == labels).sum().item())
        top_k = min(5, outputs.size(1))
        top5_predictions = outputs.topk(top_k, dim=1).indices
        top5_correct += int((top5_predictions == labels.unsqueeze(1)).any(dim=1).sum().item())
        total += batch_size
        if hasattr(batches, "set_postfix"):
            batches.set_postfix(
                loss=f"{total_loss / max(1, total):.4f}",
                acc=f"{correct / max(1, total):.3f}",
                top5=f"{top5_correct / max(1, total):.3f}",
            )

    return {
        "loss": round(total_loss / max(1, total), 6),
        "accuracy": round(correct / max(1, total), 6),
        "top5_accuracy": round(top5_correct / max(1, total), 6),
        "sample_count": total,
    }


def evaluate_with_confusions(
    model,
    dataloader,
    device,
    class_names: list[str],
    show_progress: bool,
) -> dict[str, Any]:
    import torch

    model.eval()
    correct = 0
    top5_correct = 0
    total = 0
    per_class_total: Counter[str] = Counter()
    per_class_correct: Counter[str] = Counter()
    confusions: Counter[tuple[str, str]] = Counter()

    with torch.no_grad():
        batches = progress_iterator(dataloader, description="test", enabled=show_progress)
        for inputs, labels in batches:
            inputs = inputs.to(device)
            labels = labels.to(device)
            outputs = model(inputs)
            predictions = outputs.argmax(dim=1)
            top_k = min(5, outputs.size(1))
            top5_predictions = outputs.topk(top_k, dim=1).indices
            top5_correct += int((top5_predictions == labels.unsqueeze(1)).any(dim=1).sum().item())
            for expected, predicted in zip(labels.cpu().tolist(), predictions.cpu().tolist()):
                expected_name = class_names[expected]
                predicted_name = class_names[predicted]
                per_class_total[expected_name] += 1
                total += 1
                if expected == predicted:
                    correct += 1
                    per_class_correct[expected_name] += 1
                else:
                    confusions[(expected_name, predicted_name)] += 1
            if hasattr(batches, "set_postfix"):
                batches.set_postfix(
                    acc=f"{correct / max(1, total):.3f}",
                    top5=f"{top5_correct / max(1, total):.3f}",
                )

    per_class_accuracy = {
        class_name: round(per_class_correct[class_name] / count, 6)
        for class_name, count in sorted(per_class_total.items())
    }
    top_confusions = [
        {"expected": expected, "predicted": predicted, "count": count}
        for (expected, predicted), count in confusions.most_common(25)
    ]
    return {
        "accuracy": round(correct / max(1, total), 6),
        "top5_accuracy": round(top5_correct / max(1, total), 6),
        "sample_count": total,
        "per_class_accuracy": per_class_accuracy,
        "top_confusions": top_confusions,
    }


def class_counts(dataset) -> dict[str, int]:
    counts: dict[str, int] = defaultdict(int)
    for _path, class_index in dataset.samples:
        counts[dataset.classes[class_index]] += 1
    return dict(sorted(counts.items()))


def serializable_args(args: argparse.Namespace) -> dict[str, Any]:
    values = vars(args).copy()
    for key, value in values.items():
        if isinstance(value, Path):
            values[key] = str(value)
    return values


def trainable_parameter_count(model) -> int:
    return sum(parameter.numel() for parameter in model.parameters() if parameter.requires_grad)


def main() -> None:
    import torch

    args = parse_args()
    torch.manual_seed(args.seed)
    device = resolve_device(args.device)

    run_name = args.run_name or "resnet18"
    output_dir = args.output_dir / run_name
    output_dir.mkdir(parents=True, exist_ok=True)

    datasets_by_split, dataloaders = build_dataloaders(args.data_dir, args.batch_size, args.num_workers)
    class_names = datasets_by_split["train"].classes
    model = build_model(len(class_names), args.freeze_backbone).to(device)
    criterion = torch.nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(
        [parameter for parameter in model.parameters() if parameter.requires_grad],
        lr=args.learning_rate,
        weight_decay=args.weight_decay,
    )

    history = []
    best_val_accuracy = -1.0
    best_model_path = output_dir / "best_model.pt"

    print(f"Run: {run_name}", flush=True)
    print(f"Device: {device}", flush=True)
    print(f"Classes: {len(class_names)}", flush=True)
    print(
        "Samples: "
        f"train={len(datasets_by_split['train'])}, "
        f"val={len(datasets_by_split['val'])}, "
        f"test={len(datasets_by_split['test'])}",
        flush=True,
    )
    print(f"Trainable parameters: {trainable_parameter_count(model):,}", flush=True)
    print(f"Epochs: {args.epochs}, batch_size={args.batch_size}", flush=True)

    for epoch in range(1, args.epochs + 1):
        train_metrics = run_epoch(
            model,
            dataloaders["train"],
            criterion,
            optimizer,
            device,
            train=True,
            epoch=epoch,
            epoch_count=args.epochs,
            show_progress=args.progress,
        )
        val_metrics = run_epoch(
            model,
            dataloaders["val"],
            criterion,
            optimizer,
            device,
            train=False,
            epoch=epoch,
            epoch_count=args.epochs,
            show_progress=args.progress,
        )
        record = {"epoch": epoch, "train": train_metrics, "val": val_metrics}
        history.append(record)
        print(
            f"epoch {epoch:02d}: "
            f"train_loss={train_metrics['loss']:.4f} "
            f"train_acc={train_metrics['accuracy']:.3f} "
            f"train_top5={train_metrics['top5_accuracy']:.3f} "
            f"val_loss={val_metrics['loss']:.4f} "
            f"val_acc={val_metrics['accuracy']:.3f} "
            f"val_top5={val_metrics['top5_accuracy']:.3f}",
            flush=True,
        )
        if val_metrics["accuracy"] > best_val_accuracy:
            best_val_accuracy = val_metrics["accuracy"]
            torch.save(
                {
                    "model_state_dict": model.state_dict(),
                    "class_names": class_names,
                    "args": serializable_args(args),
                    "epoch": epoch,
                    "val_accuracy": best_val_accuracy,
                },
                best_model_path,
            )

    checkpoint = torch.load(best_model_path, map_location=device)
    model.load_state_dict(checkpoint["model_state_dict"])
    test_metrics = evaluate_with_confusions(
        model,
        dataloaders["test"],
        device,
        class_names,
        show_progress=args.progress,
    )

    metrics = {
        "run_name": run_name,
        "device": str(device),
        "class_count": len(class_names),
        "class_names": class_names,
        "class_counts": {split: class_counts(dataset) for split, dataset in datasets_by_split.items()},
        "history": history,
        "best_val_accuracy": best_val_accuracy,
        "test": test_metrics,
        "best_model_path": str(best_model_path),
    }
    (output_dir / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    (output_dir / "class_names.txt").write_text("\n".join(class_names) + "\n", encoding="utf-8")

    print(f"Best validation accuracy: {best_val_accuracy:.3f}")
    print(f"Test accuracy: {test_metrics['accuracy']:.3f}")
    print(f"Wrote metrics: {output_dir / 'metrics.json'}")
    print(f"Wrote model: {best_model_path}")


if __name__ == "__main__":
    main()
