from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Literal

VisionInventoryPolicy = Literal["track", "review", "ignore"]
VisionLabelGranularity = Literal["exact", "generic"]
VisionClassCategory = Literal[
    "produce",
    "container",
    "packaged_food",
    "prepared_food",
    "kitchenware",
    "unknown",
]


@dataclass(slots=True)
class BoundingBox:
    x: float
    y: float
    width: float
    height: float


@dataclass(slots=True)
class VisionClassDefinition:
    id: str
    label: str
    category: VisionClassCategory
    granularity: VisionLabelGranularity
    inventory_policy: VisionInventoryPolicy
    stage_1_enabled: bool = True


@dataclass(slots=True)
class DebugObjectInput:
    label: str
    confidence: float | None = None
    bbox: BoundingBox | None = None


@dataclass(slots=True)
class FrameInput:
    frame_id: int
    frame_ref: str | None = None
    image_path: str | None = None
    image_array: object | None = None
    zone_id: str | None = None
    timestamp_ms: int | None = None
    debug_objects: list[DebugObjectInput] = field(default_factory=list)


@dataclass(slots=True)
class ScanOptions:
    include_ignored: bool = False
    max_detections_per_frame: int = 12
    confidence_threshold: float = 0.25
    nms_iou_threshold: float = 0.7


@dataclass(slots=True)
class Detection:
    observation_id: str
    class_id: str
    label: str
    category: VisionClassCategory
    granularity: VisionLabelGranularity
    inventory_policy: VisionInventoryPolicy
    bbox: BoundingBox
    confidence: float


@dataclass(slots=True)
class FrameResult:
    frame_id: int
    frame_ref: str | None
    zone_id: str | None
    timestamp_ms: int | None
    detections: list[Detection]


@dataclass(slots=True)
class PipelineConfig:
    provider: str
    stage: Literal["detection_only"]
    tracking_enabled: bool
    embeddings_enabled: bool
    open_vocabulary_enabled: bool
    packaged_food_enrichment_enabled: bool
    segmentation_enabled: bool
    supported_classes: list[VisionClassDefinition]
    notes: list[str]

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass(slots=True)
class ScanSummary:
    frame_count: int
    detection_count: int
    track_candidate_count: int
    review_candidate_count: int
    ignored_detection_count: int
    detected_labels: list[str]


@dataclass(slots=True)
class ScanResponse:
    scan_session_id: str
    pipeline: PipelineConfig
    frames: list[FrameResult]
    summary: ScanSummary

    def to_dict(self) -> dict:
        return asdict(self)
