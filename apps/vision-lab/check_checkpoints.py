from __future__ import annotations

from pathlib import Path

from chef_vision.checkpoints import (
    BASE_MODEL_DIR,
    DEFAULT_CLASSIFIER_RUN,
    DEFAULT_FOODSEG_SEGMENTER_RUN,
    DEFAULT_INGREDIENT_DETECTOR_RUN,
    classifier_checkpoint_path,
    foodseg_segmenter_checkpoint_path,
    ingredient_detector_checkpoint_path,
)


EXPECTED_FILES = [
    (
        "ingredient detector",
        ingredient_detector_checkpoint_path(DEFAULT_INGREDIENT_DETECTOR_RUN),
    ),
    ("base detector", BASE_MODEL_DIR / "yolo11n.pt"),
    ("base segmenter", BASE_MODEL_DIR / "yolo11n-seg.pt"),
    ("ingredient classifier", classifier_checkpoint_path(DEFAULT_CLASSIFIER_RUN)),
    (
        "foodseg segmenter",
        foodseg_segmenter_checkpoint_path(DEFAULT_FOODSEG_SEGMENTER_RUN),
    ),
]


def main() -> None:
    missing: list[Path] = []

    for label, path in EXPECTED_FILES:
        status = "ok" if path.exists() else "missing"
        print(f"{status:7} {label:22} {path}")
        if not path.exists():
            missing.append(path)

    if missing:
        print()
        print("Download the missing files from the shared artifact folder and place them at the paths above.")


if __name__ == "__main__":
    main()
