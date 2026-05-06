from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path
from pathlib import PurePosixPath

import modal

from chef_vision.checkpoints import INGREDIENT_CLASSIFIER_CHECKPOINTS_DIR


APP_NAME = "chef-ingredient-training"
VOLUME_NAME = "chef-ingredient-vision-data"
VOL_MOUNT = PurePosixPath("/mnt/chef-vision")
REMOTE_CODE_DIR = PurePosixPath("/root/vision-lab")
LOCAL_APP_DIR = Path(__file__).resolve().parent
DEFAULT_LOCAL_DATA_DIR = LOCAL_APP_DIR / "data" / "ingredient_training_dataset_5000"
DEFAULT_LOCAL_OUTPUT_DIR = INGREDIENT_CLASSIFIER_CHECKPOINTS_DIR


volume = modal.Volume.from_name(VOLUME_NAME, create_if_missing=True)

image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("libglib2.0-0", "libgl1")
    .pip_install(
        "pillow>=11.3,<12.0",
        "torch>=2.5,<3.0",
        "torchvision>=0.20,<1.0",
        "tqdm>=4.66,<5.0",
    )
    .add_local_dir(
        LOCAL_APP_DIR,
        remote_path=str(REMOTE_CODE_DIR),
        ignore=[
            "data/**",
            "checkpoints/**",
            "__pycache__/**",
            "*.pyc",
        ],
    )
)

app = modal.App(APP_NAME, image=image)


def remote_data_dir() -> Path:
    return VOL_MOUNT / "ingredient_training_dataset"


def remote_runs_dir() -> Path:
    return VOL_MOUNT / "ingredient_classifier_runs"


def upload_dataset(local_data_dir: Path) -> None:
    if not local_data_dir.exists():
        raise SystemExit(f"Missing local dataset directory: {local_data_dir}")

    print(f"Uploading {local_data_dir} to Modal volume {VOLUME_NAME}...", flush=True)
    with volume.batch_upload(force=True) as batch:
        batch.put_directory(str(local_data_dir), "/ingredient_training_dataset")
    print("Upload complete.", flush=True)


def download_run(run_name: str, local_output_dir: Path) -> None:
    output_dir = local_output_dir / run_name
    output_dir.mkdir(parents=True, exist_ok=True)
    for filename in ("best_model.pt", "metrics.json", "class_names.txt"):
        remote_path = f"/ingredient_classifier_runs/{run_name}/{filename}"
        local_path = output_dir / filename
        with local_path.open("wb") as target:
            volume.read_file_into_fileobj(remote_path, target)
        print(f"Downloaded {local_path}", flush=True)


@app.function(
    gpu="A10G",
    timeout=60 * 60 * 8,
    volumes={str(VOL_MOUNT): volume},
)
def train_remote(
    run_name: str,
    epochs: int,
    batch_size: int,
    learning_rate: float,
    weight_decay: float,
    freeze_backbone: bool,
    num_workers: int,
) -> dict:
    command = [
        sys.executable,
        str(REMOTE_CODE_DIR / "train_ingredient_classifier.py"),
        "--data-dir",
        str(remote_data_dir()),
        "--output-dir",
        str(remote_runs_dir()),
        "--run-name",
        run_name,
        "--epochs",
        str(epochs),
        "--batch-size",
        str(batch_size),
        "--learning-rate",
        str(learning_rate),
        "--weight-decay",
        str(weight_decay),
        "--num-workers",
        str(num_workers),
        "--device",
        "cuda",
    ]
    if freeze_backbone:
        command.append("--freeze-backbone")

    subprocess.run(command, cwd=str(REMOTE_CODE_DIR), check=True)
    volume.commit()

    metrics_path = Path(str(remote_runs_dir() / run_name / "metrics.json"))
    metrics = json.loads(metrics_path.read_text(encoding="utf-8"))
    return {
        "run_name": run_name,
        "best_val_accuracy": metrics["best_val_accuracy"],
        "test_accuracy": metrics["test"]["accuracy"],
        "test_top5_accuracy": metrics["test"]["top5_accuracy"],
        "metrics_path": str(metrics_path),
    }


@app.local_entrypoint()
def main(
    action: str = "all",
    local_data_dir: str = str(DEFAULT_LOCAL_DATA_DIR),
    local_output_dir: str = str(DEFAULT_LOCAL_OUTPUT_DIR),
    run_name: str = "resnet18_ingredient_crops_5000_modal",
    epochs: int = 18,
    batch_size: int = 64,
    learning_rate: float = 0.001,
    weight_decay: float = 0.0001,
    freeze_backbone: bool = False,
    num_workers: int = 2,
) -> None:
    local_data_path = Path(local_data_dir)
    local_output_path = Path(local_output_dir)

    if action in {"upload", "all"}:
        upload_dataset(local_data_path)

    if action in {"train", "all"}:
        result = train_remote.remote(
            run_name=run_name,
            epochs=epochs,
            batch_size=batch_size,
            learning_rate=learning_rate,
            weight_decay=weight_decay,
            freeze_backbone=freeze_backbone,
            num_workers=num_workers,
        )
        print(json.dumps(result, indent=2), flush=True)

    if action in {"download", "all"}:
        download_run(run_name, local_output_path)

    if action not in {"upload", "train", "download", "all"}:
        raise SystemExit("action must be one of: upload, train, download, all")
