from __future__ import annotations

from fastapi import FastAPI
from pydantic import BaseModel, Field

from chef_vision.contracts import BoundingBox, DebugObjectInput, FrameInput, ScanOptions
from chef_vision.pipeline import VisionPipeline


class BoundingBoxModel(BaseModel):
    x: float = Field(ge=0, le=1)
    y: float = Field(ge=0, le=1)
    width: float = Field(ge=0, le=1)
    height: float = Field(ge=0, le=1)

    def to_domain(self) -> BoundingBox:
        return BoundingBox(
            x=self.x,
            y=self.y,
            width=self.width,
            height=self.height,
        )


class DebugObjectModel(BaseModel):
    label: str
    confidence: float | None = Field(default=None, ge=0, le=1)
    bbox: BoundingBoxModel | None = None

    def to_domain(self) -> DebugObjectInput:
        return DebugObjectInput(
            label=self.label,
            confidence=self.confidence,
            bbox=self.bbox.to_domain() if self.bbox else None,
        )


class FrameInputModel(BaseModel):
    frame_id: int = Field(ge=1)
    frame_ref: str | None = None
    image_path: str | None = None
    zone_id: str | None = None
    timestamp_ms: int | None = Field(default=None, ge=0)
    debug_objects: list[DebugObjectModel] = Field(default_factory=list)

    def to_domain(self) -> FrameInput:
        return FrameInput(
            frame_id=self.frame_id,
            frame_ref=self.frame_ref,
            image_path=self.image_path,
            zone_id=self.zone_id,
            timestamp_ms=self.timestamp_ms,
            debug_objects=[entry.to_domain() for entry in self.debug_objects],
        )


class ScanOptionsModel(BaseModel):
    include_ignored: bool = False
    max_detections_per_frame: int = Field(default=12, ge=1, le=50)
    confidence_threshold: float = Field(default=0.25, ge=0, le=1)

    def to_domain(self) -> ScanOptions:
        return ScanOptions(
            include_ignored=self.include_ignored,
            max_detections_per_frame=self.max_detections_per_frame,
            confidence_threshold=self.confidence_threshold,
        )


class ScanRequestModel(BaseModel):
    scan_session_id: str
    detector: str = "mock"
    model_name: str = "yolo11n.pt"
    frames: list[FrameInputModel]
    options: ScanOptionsModel = Field(default_factory=ScanOptionsModel)


app = FastAPI(
    title="Chef Vision Python API",
    version="0.1.0",
    description="Separate Python sidecar for vision experimentation before full product integration.",
)
@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/pipeline")
def describe_pipeline(
    detector: str = "mock",
    model_name: str = "yolo11n.pt",
) -> dict:
    pipeline = VisionPipeline(detector_name=detector, model_name=model_name)
    return pipeline.describe_pipeline().to_dict()


@app.post("/detect")
def detect(scan: ScanRequestModel) -> dict:
    pipeline = VisionPipeline(
        detector_name=scan.detector,
        model_name=scan.model_name,
    )
    result = pipeline.analyze_scan(
        scan_session_id=scan.scan_session_id,
        frames=[frame.to_domain() for frame in scan.frames],
        options=scan.options.to_domain(),
    )
    return result.to_dict()
