from __future__ import annotations

import argparse
from pathlib import Path


APP_DIR = Path(__file__).resolve().parent
DEFAULT_DATA_YAML = APP_DIR / "data" / "ingredient_detection_dataset" / "data.yaml"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train an ingredient-aware YOLO detector.")
    parser.add_argument("--data-yaml", type=Path, default=DEFAULT_DATA_YAML)
    parser.add_argument("--model", default="yolo11n.pt")
    parser.add_argument("--epochs", type=int, default=50)
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--batch", type=int, default=16)
    parser.add_argument("--device", default="auto")
    parser.add_argument("--project", type=Path, default=APP_DIR / "data" / "ingredient_detector_runs")
    parser.add_argument("--name", default="yolo11n_ingredient_detector")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    try:
        from ultralytics import YOLO
    except ImportError as exc:
        raise SystemExit("Missing dependency: ultralytics. Install apps/vision-lab/requirements.txt first.") from exc

    model = YOLO(args.model)
    model.train(
        data=str(args.data_yaml),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        device=None if args.device == "auto" else args.device,
        project=str(args.project),
        name=args.name,
    )


if __name__ == "__main__":
    main()
