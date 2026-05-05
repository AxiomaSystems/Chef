from __future__ import annotations

from pathlib import Path


APP_DIR = Path(__file__).resolve().parents[1]
CHECKPOINTS_DIR = APP_DIR / "checkpoints"
BASE_MODEL_DIR = CHECKPOINTS_DIR / "base"
INGREDIENT_DETECTOR_CHECKPOINTS_DIR = CHECKPOINTS_DIR / "detectors" / "ingredient"
INGREDIENT_CLASSIFIER_CHECKPOINTS_DIR = CHECKPOINTS_DIR / "classifiers" / "ingredient"
FOODSEG_SEGMENTER_CHECKPOINTS_DIR = CHECKPOINTS_DIR / "segmenters" / "foodseg103"

LEGACY_DATA_DIR = APP_DIR / "data"
LEGACY_INGREDIENT_CLASSIFIER_RUNS_DIR = LEGACY_DATA_DIR / "ingredient_classifier_runs"
LEGACY_FOODSEG_SEGMENTER_RUNS_DIR = LEGACY_DATA_DIR / "foodseg103_segmenter_runs"

DEFAULT_CLASSIFIER_RUN = "resnet18_ingredient_crops_5000_modal_frozen_v2"
DEFAULT_FOODSEG_SEGMENTER_RUN = "yolo11n_foodseg103_segmenter_modal"


def default_yolo_model(model_name: str = "yolo11n.pt") -> str:
    local_model = BASE_MODEL_DIR / model_name
    return str(local_model) if local_model.exists() else model_name


def default_segmentation_model(model_name: str = "yolo11n-seg.pt") -> str:
    trained_segmenter = foodseg_segmenter_checkpoint_path()
    if trained_segmenter.exists():
        return str(trained_segmenter)

    local_model = BASE_MODEL_DIR / model_name
    return str(local_model) if local_model.exists() else model_name


def classifier_checkpoint_path(run_name: str = DEFAULT_CLASSIFIER_RUN) -> Path:
    return INGREDIENT_CLASSIFIER_CHECKPOINTS_DIR / run_name / "best_model.pt"


def legacy_classifier_checkpoint_path(run_name: str = DEFAULT_CLASSIFIER_RUN) -> Path:
    return LEGACY_INGREDIENT_CLASSIFIER_RUNS_DIR / run_name / "best_model.pt"


def resolve_classifier_checkpoint_path(run_name: str = DEFAULT_CLASSIFIER_RUN) -> Path:
    shared_path = classifier_checkpoint_path(run_name)
    if shared_path.exists():
        return shared_path
    return legacy_classifier_checkpoint_path(run_name)


def foodseg_segmenter_checkpoint_path(
    run_name: str = DEFAULT_FOODSEG_SEGMENTER_RUN,
) -> Path:
    return FOODSEG_SEGMENTER_CHECKPOINTS_DIR / run_name / "weights" / "best.pt"


def legacy_foodseg_segmenter_checkpoint_path(
    run_name: str = DEFAULT_FOODSEG_SEGMENTER_RUN,
) -> Path:
    return LEGACY_FOODSEG_SEGMENTER_RUNS_DIR / run_name / "weights" / "best.pt"


def resolve_foodseg_segmenter_checkpoint_path(
    run_name: str = DEFAULT_FOODSEG_SEGMENTER_RUN,
) -> Path:
    shared_path = foodseg_segmenter_checkpoint_path(run_name)
    if shared_path.exists():
        return shared_path
    return legacy_foodseg_segmenter_checkpoint_path(run_name)


def available_classifier_runs() -> list[Path]:
    run_dirs: dict[str, Path] = {}
    for root in (LEGACY_INGREDIENT_CLASSIFIER_RUNS_DIR, INGREDIENT_CLASSIFIER_CHECKPOINTS_DIR):
        if not root.exists():
            continue
        for path in sorted(root.iterdir()):
            if path.is_dir() and (path / "best_model.pt").exists():
                run_dirs[path.name] = path
    return [run_dirs[name] for name in sorted(run_dirs)]
