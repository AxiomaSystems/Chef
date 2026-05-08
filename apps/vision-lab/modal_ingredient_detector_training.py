from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path
from pathlib import PurePosixPath

import modal


APP_NAME = "chef-ingredient-detector-training"
VOLUME_NAME = "chef-ingredient-vision-data"
VOL_MOUNT = PurePosixPath("/mnt/chef-vision")
REMOTE_CODE_DIR = PurePosixPath("/root/vision-lab")
LOCAL_APP_DIR = Path(__file__).resolve().parent
DEFAULT_LOCAL_DATA_DIR = LOCAL_APP_DIR / "data" / "datasets" / "bounding-box" / "food-ingredient-yolo"
DEFAULT_LOCAL_OUTPUT_DIR = LOCAL_APP_DIR / "checkpoints" / "detectors" / "ingredient"

for import_path in (LOCAL_APP_DIR, Path(str(REMOTE_CODE_DIR))):
    if str(import_path) not in sys.path:
        sys.path.insert(0, str(import_path))


volume = modal.Volume.from_name(VOLUME_NAME, create_if_missing=True)

image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("libglib2.0-0", "libgl1")
    .pip_install(
        "torch>=2.5,<3.0",
        "torchvision>=0.20,<1.0",
        "ultralytics>=8.4,<9.0",
    )
    .env({"PYTHONPATH": str(REMOTE_CODE_DIR)})
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


def remote_dataset_dir() -> PurePosixPath:
    return VOL_MOUNT / "datasets" / "bounding-box" / "food-ingredient-yolo"


def remote_runs_dir() -> PurePosixPath:
    return VOL_MOUNT / "runs" / "bounding-box" / "ingredient-detector"


def normalize_remote_data_yaml() -> Path:
    data_yaml = Path(str(remote_dataset_dir() / "data.yaml"))
    if not data_yaml.exists():
        raise FileNotFoundError(
            f"Missing remote dataset YAML: {data_yaml}. Run action=upload first."
        )

    lines = data_yaml.read_text(encoding="utf-8").splitlines()
    normalized_lines = []
    wrote_path = False
    for line in lines:
        if line.startswith("path:"):
            normalized_lines.append(f"path: {remote_dataset_dir()}")
            wrote_path = True
        else:
            normalized_lines.append(line)

    if not wrote_path:
        normalized_lines.insert(0, f"path: {remote_dataset_dir()}")

    data_yaml.write_text("\n".join(normalized_lines) + "\n", encoding="utf-8")
    return data_yaml


def upload_dataset(local_data_dir: Path) -> None:
    if not local_data_dir.exists():
        raise SystemExit(f"Missing local detector dataset directory: {local_data_dir}")

    print(f"Uploading {local_data_dir} to Modal volume {VOLUME_NAME}...", flush=True)
    with volume.batch_upload(force=True) as batch:
        batch.put_directory(str(local_data_dir), f"/{remote_dataset_dir().relative_to(VOL_MOUNT)}")
    print("Upload complete.", flush=True)


def download_run(run_name: str, local_output_dir: Path) -> None:
    output_dir = local_output_dir / run_name
    weights_dir = output_dir / "weights"
    weights_dir.mkdir(parents=True, exist_ok=True)

    files = [
        ("args.yaml", False),
        ("results.csv", False),
        ("weights/best.pt", True),
        ("weights/last.pt", True),
    ]
    for filename, required in files:
        remote_path = f"/{remote_runs_dir().relative_to(VOL_MOUNT)}/{run_name}/{filename}"
        local_path = output_dir / filename
        temp_path = local_path.with_suffix(local_path.suffix + ".download")
        local_path.parent.mkdir(parents=True, exist_ok=True)
        try:
            with temp_path.open("wb") as target:
                volume.read_file_into_fileobj(remote_path, target)
            if temp_path.stat().st_size == 0:
                temp_path.unlink(missing_ok=True)
                message = f"Remote file is empty or missing: {remote_path}"
                if required:
                    raise RuntimeError(message)
                print(f"Skipped empty remote file: {remote_path}", flush=True)
                continue
            temp_path.replace(local_path)
            print(f"Downloaded {local_path} ({local_path.stat().st_size} bytes)", flush=True)
        except FileNotFoundError:
            temp_path.unlink(missing_ok=True)
            if required:
                raise RuntimeError(f"Missing required remote file: {remote_path}") from None
            print(f"Skipped missing remote file: {remote_path}", flush=True)


@app.function(
    gpu="A10G",
    timeout=60 * 60 * 12,
    volumes={str(VOL_MOUNT): volume},
)
def train_detector_remote(
    run_name: str,
    model_name: str,
    epochs: int,
    imgsz: int,
    batch: int,
    patience: int,
) -> dict:
    data_yaml = normalize_remote_data_yaml()
    command = [
        sys.executable,
        str(REMOTE_CODE_DIR / "train_yolo_ingredient_detector.py"),
        "--data-yaml",
        str(data_yaml),
        "--model",
        model_name,
        "--epochs",
        str(epochs),
        "--imgsz",
        str(imgsz),
        "--batch",
        str(batch),
        "--device",
        "0",
        "--project",
        str(remote_runs_dir()),
        "--name",
        run_name,
        "--exist-ok",
    ]

    # Ultralytics accepts patience through CLI/config more easily than this local wrapper;
    # call yolo directly when patience is explicitly needed.
    if patience > 0:
        command = [
            "yolo",
            "detect",
            "train",
            f"data={data_yaml}",
            f"model={model_name}",
            f"epochs={epochs}",
            f"imgsz={imgsz}",
            f"batch={batch}",
            "device=0",
            f"project={remote_runs_dir()}",
            f"name={run_name}",
            f"patience={patience}",
            "exist_ok=True",
        ]

    subprocess.run(command, cwd=str(REMOTE_CODE_DIR), check=True)
    volume.commit()

    results_path = Path(str(remote_runs_dir() / run_name / "results.csv"))
    summary = {
        "run_name": run_name,
        "remote_run_dir": str(remote_runs_dir() / run_name),
        "best_weights": str(remote_runs_dir() / run_name / "weights" / "best.pt"),
        "last_weights": str(remote_runs_dir() / run_name / "weights" / "last.pt"),
    }
    if results_path.exists():
        lines = [line.strip() for line in results_path.read_text(encoding="utf-8").splitlines() if line.strip()]
        if len(lines) >= 2:
            summary["results_header"] = lines[0]
            summary["last_results"] = lines[-1]
    return summary


@app.local_entrypoint()
def main(
    action: str = "all",
    local_data_dir: str = str(DEFAULT_LOCAL_DATA_DIR),
    local_output_dir: str = str(DEFAULT_LOCAL_OUTPUT_DIR),
    run_name: str = "yolo11n_ingredient_detector_modal",
    model_name: str = "yolo11n.pt",
    epochs: int = 75,
    imgsz: int = 640,
    batch: int = 16,
    patience: int = 20,
) -> None:
    local_data_path = Path(local_data_dir)
    local_output_path = Path(local_output_dir)

    if action in {"upload", "all"}:
        upload_dataset(local_data_path)

    if action in {"train", "all"}:
        result = train_detector_remote.remote(
            run_name=run_name,
            model_name=model_name,
            epochs=epochs,
            imgsz=imgsz,
            batch=batch,
            patience=patience,
        )
        print(json.dumps(result, indent=2), flush=True)

    if action in {"download", "all"}:
        download_run(run_name, local_output_path)

    if action not in {"upload", "train", "download", "all"}:
        raise SystemExit("action must be one of: upload, train, download, all")
