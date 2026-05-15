from __future__ import annotations

import inspect
from dataclasses import dataclass
from pathlib import Path
from threading import Lock

import av
import numpy as np
from PIL import Image

from chef_vision.contracts import Detection, FrameResult, PipelineConfig, ScanResponse, ScanSummary, ScanOptions
from chef_vision.classifier import (
    apply_classification_to_detection,
    classify_ingredient_image,
    crop_detection,
)
from chef_vision.detectors.yolo import YoloDetector
from chef_vision.ocr import run_ocr_for_frame_image
from chef_vision.render import draw_detections_on_bgr_array


def _run_ocr_for_frame_image(
    *,
    image,
    frame_result,
    provider,
    ocr_mode,
    container_only,
    min_confidence,
):
    kwargs = {
        "image": image,
        "frame_result": frame_result,
        "provider": provider,
        "min_confidence": min_confidence,
    }
    sig = inspect.signature(run_ocr_for_frame_image)
    if "ocr_mode" in sig.parameters:
        kwargs["ocr_mode"] = ocr_mode
    if "container_only" in sig.parameters and container_only is not None:
        kwargs["container_only"] = container_only
    return run_ocr_for_frame_image(**kwargs)


@dataclass(slots=True)
class LiveFrameRecord:
    frame_id: int
    timestamp_ms: int
    detections: list[Detection]


class LiveSessionBuffer:
    def __init__(self) -> None:
        self._lock = Lock()
        self._frames: list[LiveFrameRecord] = []
        self._active = False

    def start(self) -> None:
        with self._lock:
            self._frames = []
            self._active = True

    def stop(self) -> None:
        with self._lock:
            self._active = False

    def is_active(self) -> bool:
        with self._lock:
            return self._active

    def append(self, frame_id: int, timestamp_ms: int, detections: list[Detection]) -> None:
        with self._lock:
            if not self._active:
                return
            self._frames.append(
                LiveFrameRecord(
                    frame_id=frame_id,
                    timestamp_ms=timestamp_ms,
                    detections=detections,
                )
            )

    def snapshot(self) -> list[LiveFrameRecord]:
        with self._lock:
            return list(self._frames)

    def clear(self) -> None:
        with self._lock:
            self._frames = []


def create_live_video_processor(
    model_name: str,
    confidence_threshold: float,
    nms_iou_threshold: float,
    include_ignored: bool,
    max_detections_per_frame: int,
    existing_labels: set[str],
    session_buffer: LiveSessionBuffer,
    ocr_enabled: bool = False,
    ocr_provider: str = "rapidocr",
    ocr_mode: str = "intelligent_filtering",
    ocr_container_only: bool | None = None,
    ocr_min_confidence: float = 0.35,
    ocr_every_n_frames: int = 8,
    classifier_enabled: bool = False,
    classifier_checkpoint: Path | None = None,
    classifier_top_k: int = 1,
    classifier_min_confidence: float = 0.0,
    classifier_every_n_frames: int = 10,
):
    class LiveVideoProcessor:
        def __init__(self) -> None:
            self.detector = YoloDetector(model_name=model_name)
            self.frame_counter = 0
            self.existing_labels = set(existing_labels)
            self.session_buffer = session_buffer
            self.options = ScanOptions(
                include_ignored=include_ignored,
                max_detections_per_frame=max_detections_per_frame,
                confidence_threshold=confidence_threshold,
                nms_iou_threshold=nms_iou_threshold,
            )

        def recv(self, frame: av.VideoFrame) -> av.VideoFrame:
            image_bgr = frame.to_ndarray(format="bgr24")
            self.frame_counter += 1
            timestamp_ms = int((self.frame_counter - 1) * 100)
            result = self.detector.detect_image_array(
                image_array=image_bgr,
                frame_id=self.frame_counter,
                options=self.options,
                timestamp_ms=timestamp_ms,
            )
            if ocr_enabled and self.frame_counter % max(1, ocr_every_n_frames) == 0:
                _run_ocr_for_frame_image(
                    image=Image.fromarray(image_bgr[:, :, ::-1]),
                    frame_result=result,
                    provider=ocr_provider,
                    ocr_mode=ocr_mode,
                    container_only=ocr_container_only,
                    min_confidence=ocr_min_confidence,
                )

            if classifier_enabled and classifier_checkpoint and self.frame_counter % max(1, classifier_every_n_frames) == 0:
                for detection in result.detections:
                    crop = crop_detection(Image.fromarray(image_bgr[:, :, ::-1]), detection)
                    if crop is None:
                        continue
                    try:
                        predictions = classify_ingredient_image(
                            crop,
                            checkpoint_path=classifier_checkpoint,
                            top_k=classifier_top_k,
                        )
                    except Exception:
                        continue
                    apply_classification_to_detection(
                        detection,
                        predictions,
                        min_confidence=classifier_min_confidence,
                    )

            self.session_buffer.append(
                frame_id=result.frame_id,
                timestamp_ms=timestamp_ms,
                detections=result.detections,
            )
            label_statuses = {
                detection.label: ("existing" if detection.label in self.existing_labels else detection.inventory_policy)
                for detection in result.detections
            }

            rendered = draw_detections_on_bgr_array(
                image_bgr,
                result.detections,
                label_statuses=label_statuses,
            )
            rendered_bgr = np.array(rendered)[:, :, ::-1]
            return av.VideoFrame.from_ndarray(rendered_bgr, format="bgr24")

    return LiveVideoProcessor


def frame_results_from_live_records(records: list[LiveFrameRecord]) -> list[FrameResult]:
    return [
        FrameResult(
            frame_id=record.frame_id,
            frame_ref=None,
            zone_id="live_stream",
            timestamp_ms=record.timestamp_ms,
            detections=record.detections,
        )
        for record in records
    ]


def scan_response_from_live_records(
    scan_session_id: str,
    pipeline_config: PipelineConfig,
    records: list[LiveFrameRecord],
) -> ScanResponse:
    frames = frame_results_from_live_records(records)
    detections = [detection for frame in frames for detection in frame.detections]

    return ScanResponse(
        scan_session_id=scan_session_id,
        pipeline=pipeline_config,
        frames=frames,
        summary=ScanSummary(
            frame_count=len(frames),
            detection_count=len(detections),
            track_candidate_count=sum(
                detection.inventory_policy == "track" for detection in detections
            ),
            review_candidate_count=sum(
                detection.inventory_policy == "review" for detection in detections
            ),
            ignored_detection_count=sum(
                detection.inventory_policy == "ignore" for detection in detections
            ),
            detected_labels=sorted({detection.label for detection in detections}),
        ),
    )
