from __future__ import annotations

import inspect
import base64
import shutil
from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory

from fastapi import FastAPI, File, Form, UploadFile
from PIL import Image
from pydantic import BaseModel, Field

from chef_vision.checkpoints import DEFAULT_CLASSIFIER_RUN, default_yolo_model
from chef_vision.classifier import (
    apply_classification_to_detection,
    classify_ingredient_image,
    crop_detection,
    default_checkpoint_path,
    detection_iou,
    full_image_detection_from_prediction,
    generate_grid_crops,
    grid_detection_from_prediction,
)
from chef_vision.contracts import (
    BoundingBox,
    DebugObjectInput,
    FrameInput,
    ScanOptions,
    ScanResponse,
    ScanSummary,
)
from chef_vision.ocr import run_ocr_for_detections
from chef_vision.pipeline import VisionPipeline
from chef_vision.render import draw_detections
from chef_vision.video import extract_sampled_frames


def _run_ocr_for_detections(
    *,
    frames,
    domain_frames,
    provider,
    cache_enabled,
    ocr_mode,
    container_only,
    min_confidence,
):
    kwargs = {
        "frames": frames,
        "domain_frames": domain_frames,
        "provider": provider,
        "cache_enabled": cache_enabled,
        "min_confidence": min_confidence,
    }
    sig = inspect.signature(run_ocr_for_detections)
    if "ocr_mode" in sig.parameters:
        kwargs["ocr_mode"] = ocr_mode
    if "container_only" in sig.parameters and container_only is not None:
        kwargs["container_only"] = container_only
    return run_ocr_for_detections(**kwargs)


DEFAULT_DETECTION_MODEL = default_yolo_model()


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
    model_name: str = DEFAULT_DETECTION_MODEL
    frames: list[FrameInputModel]
    options: ScanOptionsModel = Field(default_factory=ScanOptionsModel)


def image_to_data_url(image: Image.Image, quality: int = 82) -> str:
    buffer = BytesIO()
    image.convert("RGB").save(buffer, format="JPEG", quality=quality)
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/jpeg;base64,{encoded}"


def enrich_payload_with_images(payload: dict, frames: list[FrameInput]) -> dict:
    frame_paths = {frame.frame_id: frame.image_path for frame in frames if frame.image_path}

    for frame_payload in payload.get("frames", []):
        image_path = frame_paths.get(frame_payload.get("frame_id"))
        if not image_path:
            continue

        image = Image.open(image_path).convert("RGB")
        width, height = image.size
        detections = frame_payload.get("detections", [])
        frame_payload["frame_image_data_url"] = image_to_data_url(image, quality=76)

        domain_detections = [
            detection
            for frame in payload.get("_domain_frames", [])
            if frame.frame_id == frame_payload.get("frame_id")
            for detection in frame.detections
        ]
        if domain_detections:
            annotated = draw_detections(image, domain_detections)
            frame_payload["annotated_image_data_url"] = image_to_data_url(
                annotated,
                quality=80,
            )

        for detection_payload in detections:
            bbox = detection_payload.get("bbox", {})
            left = max(0, int(float(bbox.get("x", 0)) * width))
            top = max(0, int(float(bbox.get("y", 0)) * height))
            right = min(
                width,
                int((float(bbox.get("x", 0)) + float(bbox.get("width", 0))) * width),
            )
            bottom = min(
                height,
                int((float(bbox.get("y", 0)) + float(bbox.get("height", 0))) * height),
            )

            if right <= left or bottom <= top:
                continue

            crop = image.crop((left, top, right, bottom))
            detection_payload["thumbnail_data_url"] = image_to_data_url(crop, quality=84)

    payload.pop("_domain_frames", None)
    return payload


def classify_frame_crops(
    frames: list[FrameInput],
    domain_frames: list,
    classifier_run: str,
    classifier_checkpoint: str | None,
    classifier_top_k: int,
    classifier_min_confidence: float,
    classifier_relabel_enabled: bool,
    use_full_image_fallback: bool,
    full_image_min_confidence: float,
    use_grid_fallback: bool,
    grid_max_crops: int,
    grid_crop_fraction: float,
    grid_stride_fraction: float,
    grid_min_confidence: float,
    grid_max_additions: int,
) -> dict:
    checkpoint_path = (
        Path(classifier_checkpoint)
        if classifier_checkpoint
        else default_checkpoint_path(classifier_run)
    )
    if not checkpoint_path.exists():
        return {
            "enabled": False,
            "reason": f"Missing classifier checkpoint: {checkpoint_path}",
        }

    frame_paths = {frame.frame_id: frame.image_path for frame in frames if frame.image_path}

    classified_detection_count = 0
    full_image_added_count = 0
    grid_added_count = 0

    grid_addition_limit = max(0, min(grid_max_additions, 50))

    for frame_result in domain_frames:
        image_path = frame_paths.get(frame_result.frame_id)
        if not image_path:
            continue

        image = Image.open(image_path).convert("RGB")
        for detection in frame_result.detections:
            crop = crop_detection(image, detection)
            if crop is None:
                continue

            predictions = classify_ingredient_image(
                crop,
                checkpoint_path=checkpoint_path,
                top_k=max(1, min(classifier_top_k, 10)),
            )
            if classifier_relabel_enabled:
                apply_classification_to_detection(
                    detection,
                    predictions,
                    min_confidence=max(0.0, min(classifier_min_confidence, 1.0)),
                )
            else:
                detection.classification_predictions = predictions
            classified_detection_count += 1

        if use_full_image_fallback:
            predictions = classify_ingredient_image(
                image,
                checkpoint_path=checkpoint_path,
                top_k=max(1, min(classifier_top_k, 10)),
            )
            if predictions and predictions[0].probability >= max(
                0.0,
                min(full_image_min_confidence, 1.0),
            ):
                candidate = full_image_detection_from_prediction(
                    frame_id=frame_result.frame_id,
                    predictions=predictions,
                )
                duplicate = candidate is None or any(
                    existing.label == candidate.label
                    and detection_iou(existing, candidate) >= 0.35
                    for existing in frame_result.detections
                )
                if candidate is not None and not duplicate:
                    frame_result.detections.append(candidate)
                    full_image_added_count += 1

        if not use_grid_fallback or grid_added_count >= grid_addition_limit:
            continue

        grid_candidates = []
        for index, (box, crop) in enumerate(
            generate_grid_crops(
                image,
                crop_fraction=max(0.1, min(grid_crop_fraction, 0.9)),
                stride_fraction=max(0.2, min(grid_stride_fraction, 1.0)),
                max_crops=max(1, min(grid_max_crops, 100)),
            ),
            start=1,
        ):
            predictions = classify_ingredient_image(
                crop,
                checkpoint_path=checkpoint_path,
                top_k=max(1, min(classifier_top_k, 10)),
            )
            if not predictions or predictions[0].probability < max(
                0.0,
                min(grid_min_confidence, 1.0),
            ):
                continue

            candidate = grid_detection_from_prediction(
                frame_id=frame_result.frame_id,
                index=index,
                image=image,
                box=box,
                predictions=predictions,
            )
            if candidate is not None:
                grid_candidates.append(candidate)

        grid_candidates.sort(key=lambda detection: detection.confidence, reverse=True)
        for candidate in grid_candidates:
            duplicate = any(
                existing.label == candidate.label and detection_iou(existing, candidate) >= 0.35
                for existing in frame_result.detections
            )
            if duplicate:
                continue

            frame_result.detections.append(candidate)
            grid_added_count += 1
            if grid_added_count >= grid_addition_limit:
                break

    return {
        "enabled": True,
        "checkpoint": str(checkpoint_path),
        "top_k": max(1, min(classifier_top_k, 10)),
        "min_confidence": max(0.0, min(classifier_min_confidence, 1.0)),
        "relabel_enabled": classifier_relabel_enabled,
        "classified_detection_count": classified_detection_count,
        "full_image_fallback_enabled": use_full_image_fallback,
        "full_image_added_count": full_image_added_count,
        "grid_fallback_enabled": use_grid_fallback,
        "grid_added_count": grid_added_count,
    }


def refresh_summary(result: ScanResponse) -> None:
    detections = [
        detection for frame in result.frames for detection in frame.detections
    ]
    result.summary = ScanSummary(
        frame_count=len(result.frames),
        detection_count=len(detections),
        track_candidate_count=sum(
            1 for detection in detections if detection.inventory_policy == "track"
        ),
        review_candidate_count=sum(
            1 for detection in detections if detection.inventory_policy == "review"
        ),
        ignored_detection_count=sum(
            1 for detection in detections if detection.inventory_policy == "ignore"
        ),
        detected_labels=sorted({detection.label for detection in detections}),
    )


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
    model_name: str = DEFAULT_DETECTION_MODEL,
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


@app.post("/detect/media")
def detect_media(
    media: UploadFile = File(...),
    media_kind: str = Form("photo"),
    detector: str = Form("yolo"),
    model_name: str = Form(DEFAULT_DETECTION_MODEL),
    classify_crops: bool = Form(False),
    classifier_run: str = Form(DEFAULT_CLASSIFIER_RUN),
    classifier_checkpoint: str | None = Form(None),
    classifier_top_k: int = Form(5),
    classifier_min_confidence: float = Form(0.15),
    classifier_relabel_enabled: bool = Form(False),
    use_full_image_fallback: bool = Form(False),
    full_image_min_confidence: float = Form(0.15),
    use_grid_fallback: bool = Form(False),
    grid_max_crops: int = Form(24),
    grid_crop_fraction: float = Form(0.35),
    grid_stride_fraction: float = Form(0.5),
    grid_min_confidence: float = Form(0.25),
    grid_max_additions: int = Form(8),
    ocr_enabled: bool = Form(False),
    ocr_provider: str = Form("rapidocr"),
    ocr_cache_enabled: bool = Form(True),
    ocr_mode: str = Form("intelligent_filtering"),
    ocr_container_only: bool = Form(True),
    ocr_min_confidence: float = Form(0.35),
    include_ignored: bool = Form(False),
    max_detections_per_frame: int = Form(12),
    confidence_threshold: float = Form(0.25),
    sampled_fps: float = Form(1.0),
    max_frames: int = Form(12),
) -> dict:
    suffix = Path(media.filename or "").suffix.lower()
    if not suffix:
        suffix = ".mp4" if media.content_type and media.content_type.startswith("video/") else ".jpg"

    with TemporaryDirectory(prefix="chef_vision_upload_") as temp_dir:
        temp_path = Path(temp_dir)
        media_path = temp_path / f"upload{suffix}"

        with media_path.open("wb") as handle:
            shutil.copyfileobj(media.file, handle)

        options = ScanOptions(
            include_ignored=include_ignored,
            max_detections_per_frame=max(1, min(max_detections_per_frame, 50)),
            confidence_threshold=max(0.0, min(confidence_threshold, 1.0)),
        )
        pipeline = VisionPipeline(detector_name=detector, model_name=model_name)

        is_video = (
            media_kind == "video"
            or bool(media.content_type and media.content_type.startswith("video/"))
        )

        if is_video:
            frames_dir = temp_path / "frames"
            extraction = extract_sampled_frames(
                str(media_path),
                str(frames_dir),
                target_fps=max(0.1, sampled_fps),
                max_frames=max(1, min(max_frames, 60)),
            )
            frames = [
                FrameInput(
                    frame_id=frame.frame_id,
                    image_path=frame.image_path,
                    zone_id="inventory_scan",
                    timestamp_ms=frame.timestamp_ms,
                )
                for frame in extraction.frames
            ]
        else:
            extraction = None
            frames = [
                FrameInput(
                    frame_id=1,
                    image_path=str(media_path),
                    zone_id="inventory_scan",
                )
            ]

        result = pipeline.analyze_scan(
            scan_session_id=f"media_{media_kind}",
            frames=frames,
            options=options,
        )
        classification = None
        if classify_crops:
            classification = classify_frame_crops(
                frames=frames,
                domain_frames=result.frames,
                classifier_run=classifier_run,
                classifier_checkpoint=classifier_checkpoint,
                classifier_top_k=classifier_top_k,
                classifier_min_confidence=classifier_min_confidence,
                classifier_relabel_enabled=classifier_relabel_enabled,
                use_full_image_fallback=use_full_image_fallback,
                full_image_min_confidence=full_image_min_confidence,
                use_grid_fallback=use_grid_fallback,
                grid_max_crops=grid_max_crops,
                grid_crop_fraction=grid_crop_fraction,
                grid_stride_fraction=grid_stride_fraction,
                grid_min_confidence=grid_min_confidence,
                grid_max_additions=grid_max_additions,
            )
            refresh_summary(result)

        ocr = None
        if ocr_enabled:
            ocr = _run_ocr_for_detections(
                frames=frames,
                domain_frames=result.frames,
                provider=ocr_provider,
                cache_enabled=ocr_cache_enabled,
                ocr_mode=ocr_mode,
                container_only=ocr_container_only,
                min_confidence=ocr_min_confidence,
            )

        payload = result.to_dict()
        payload["_domain_frames"] = result.frames
        enrich_payload_with_images(payload, frames)
        payload["classification"] = classification or {
            "enabled": False,
            "reason": "Crop classification was not requested for this scan.",
        }
        payload["ocr"] = ocr or {
            "enabled": False,
            "reason": "OCR was not requested for this scan.",
        }

        if extraction is not None:
            payload["video"] = {
                "total_frames": extraction.summary.total_frames,
                "source_fps": extraction.summary.source_fps,
                "sampled_frame_count": extraction.summary.sampled_frame_count,
                "duration_ms": extraction.summary.duration_ms,
            }

        return payload
