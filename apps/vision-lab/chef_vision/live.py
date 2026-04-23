from __future__ import annotations

from dataclasses import dataclass
from threading import Lock

import av
import numpy as np

from chef_vision.contracts import Detection, FrameResult, PipelineConfig, ScanResponse, ScanSummary, ScanOptions
from chef_vision.detectors.yolo import YoloDetector
from chef_vision.render import draw_detections_on_bgr_array


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
