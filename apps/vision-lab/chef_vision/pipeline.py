from __future__ import annotations

from chef_vision.contracts import FrameInput, PipelineConfig, ScanOptions, ScanResponse, ScanSummary
from chef_vision.detectors import MockDetector, YoloDetector
from chef_vision.ontology import build_pipeline_config


class VisionPipeline:
    def __init__(
        self,
        detector_name: str = "mock",
        model_name: str = "yolo11n.pt",
    ) -> None:
        self.detector_name = detector_name
        self.model_name = model_name
        self.detector = self._build_detector()

    def describe_pipeline(self) -> PipelineConfig:
        return build_pipeline_config(self.detector.name)

    def analyze_scan(
        self,
        scan_session_id: str,
        frames: list[FrameInput],
        options: ScanOptions | None = None,
    ) -> ScanResponse:
        resolved_options = options or ScanOptions()
        frame_results = [
            self.detector.detect_frame(frame=frame, options=resolved_options)
            for frame in frames
        ]
        detections = [detection for frame in frame_results for detection in frame.detections]
        detected_labels = sorted({detection.label for detection in detections})

        return ScanResponse(
            scan_session_id=scan_session_id,
            pipeline=self.describe_pipeline(),
            frames=frame_results,
            summary=ScanSummary(
                frame_count=len(frame_results),
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
                detected_labels=detected_labels,
            ),
        )

    def _build_detector(self):
        if self.detector_name == "yolo":
            return YoloDetector(model_name=self.model_name)

        return MockDetector()
