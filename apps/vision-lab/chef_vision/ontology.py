from __future__ import annotations

import json
import os
from pathlib import Path

from .contracts import BoundingBox, PipelineConfig, VisionClassDefinition


MAPPING_FILE = Path("packages/shared/vision-label-mappings.json")
LOCAL_MAPPING_FILE = "vision-label-mappings.json"


def _load_mapping_file() -> dict:
    for candidate in _mapping_file_candidates():
        if not candidate.exists():
            continue

        with candidate.open("r", encoding="utf-8") as handle:
            return json.load(handle)

    raise FileNotFoundError(f"Missing shared vision mapping file: {MAPPING_FILE}")


def _mapping_file_candidates() -> list[Path]:
    env_path = os.environ.get("CHEF_VISION_LABEL_MAPPINGS")
    module_path = Path(__file__).resolve()
    app_dir = module_path.parents[1]
    candidates: list[Path | None] = [
        Path(env_path) if env_path else None,
        app_dir / LOCAL_MAPPING_FILE,
        Path.cwd() / LOCAL_MAPPING_FILE,
        Path.cwd() / MAPPING_FILE,
    ]

    if len(module_path.parents) > 3:
        candidates.append(module_path.parents[3] / MAPPING_FILE)

    cwd = Path.cwd()
    if len(cwd.parents) > 1:
        candidates.append(cwd.parents[1] / MAPPING_FILE)

    return [candidate for candidate in candidates if candidate is not None]


VISION_MAPPINGS = _load_mapping_file()

DEFAULT_BOXES: list[BoundingBox] = [
    BoundingBox(**box) for box in VISION_MAPPINGS["default_boxes"]
]

ONTOLOGY: list[dict] = VISION_MAPPINGS["classes"]

MODEL_MAPPINGS: dict[str, dict[str, str]] = VISION_MAPPINGS["model_mappings"]

PIPELINE_NOTES: list[str] = VISION_MAPPINGS["pipeline_notes"]


def supported_classes() -> list[VisionClassDefinition]:
    return [
        VisionClassDefinition(
            id=entry["id"],
            label=entry["label"],
            category=entry["category"],
            granularity=entry["granularity"],
            inventory_policy=entry["inventory_policy"],
        )
        for entry in ONTOLOGY
    ]


def build_pipeline_config(provider: str) -> PipelineConfig:
    return PipelineConfig(
        provider=provider,
        stage="detection_only",
        tracking_enabled=False,
        embeddings_enabled=False,
        open_vocabulary_enabled=False,
        packaged_food_enrichment_enabled=False,
        segmentation_enabled=False,
        supported_classes=supported_classes(),
        notes=PIPELINE_NOTES,
    )
