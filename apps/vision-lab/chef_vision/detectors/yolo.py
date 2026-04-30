from __future__ import annotations

from pathlib import Path
from typing import Any
from uuid import uuid4

from chef_vision.contracts import BoundingBox, Detection, FrameInput, FrameResult, ScanOptions
from chef_vision.detectors.base import DetectorProvider
from chef_vision.ontology import DEFAULT_BOXES, ONTOLOGY


COCO_TO_ONTOLOGY = {
    "apple": "apple",
    "banana": "banana",
    "bottle": "bottle",
    "bowl": "container",
    "carrot": "carrot",
    "cup": "mug",
    "orange": "unknown_kitchen_item",
    "plate": "plate",
    "sandwich": "unknown_kitchen_item",
    "spoon": "utensil",
    "fork": "utensil",
    "knife": "utensil",
    "wine glass": "ignore",
}


class YoloDetector(DetectorProvider):
    def __init__(self, model_name: str = "yolo11n.pt") -> None:
        self.model_name = model_name
        self.name = f"ultralytics:{model_name}"
        self._model: Any | None = None

    def detect_frame(self, frame: FrameInput, options: ScanOptions) -> FrameResult:
        if frame.image_path:
            return self._detect_source(
                source=frame.image_path,
                frame_id=frame.frame_id,
                frame_ref=frame.frame_ref,
                zone_id=frame.zone_id,
                timestamp_ms=frame.timestamp_ms,
                options=options,
            )

        if frame.image_array is not None:
            return self._detect_source(
                source=frame.image_array,
                frame_id=frame.frame_id,
                frame_ref=frame.frame_ref,
                zone_id=frame.zone_id,
                timestamp_ms=frame.timestamp_ms,
                options=options,
            )

        raise ValueError(
            "YOLO detection requires frame.image_path or frame.image_array. Upload an image/video in Streamlit or send image_path to the FastAPI sidecar."
        )

    def detect_image_array(
        self,
        image_array: Any,
        frame_id: int,
        options: ScanOptions,
        frame_ref: str | None = None,
        zone_id: str | None = None,
        timestamp_ms: int | None = None,
    ) -> FrameResult:
        return self._detect_source(
            source=image_array,
            frame_id=frame_id,
            frame_ref=frame_ref,
            zone_id=zone_id,
            timestamp_ms=timestamp_ms,
            options=options,
        )

    def _load_model(self) -> Any:
        if self._model is not None:
            return self._model

        try:
            from ultralytics import YOLO
        except ImportError as exc:
            raise RuntimeError(
                "Ultralytics is not installed. Run `pip install -r apps/vision-lab/requirements.txt`."
            ) from exc

        model_source = self.model_name
        if Path(self.model_name).exists():
            model_source = str(Path(self.model_name).resolve())

        self._model = YOLO(model_source)
        return self._model

    def _detect_source(
        self,
        source: Any,
        frame_id: int,
        options: ScanOptions,
        frame_ref: str | None = None,
        zone_id: str | None = None,
        timestamp_ms: int | None = None,
    ) -> FrameResult:
        model = self._load_model()
        results = model(
            source,
            conf=options.confidence_threshold,
            iou=options.nms_iou_threshold,
            verbose=False,
        )
        result = results[0]
        names = result.names
        detections: list[Detection] = []
        boxes = getattr(result, "boxes", None)

        if boxes is not None:
            image_width = max(result.orig_shape[1], 1)
            image_height = max(result.orig_shape[0], 1)

            for index, box in enumerate(boxes):
                cls_id = int(box.cls[0].item())
                confidence = round(float(box.conf[0].item()), 2)
                raw_label = names.get(cls_id, str(cls_id))
                ontology_entry = _resolve_ontology_entry(raw_label)

                if ontology_entry["inventory_policy"] == "ignore" and not options.include_ignored:
                    continue

                x1, y1, x2, y2 = [float(value) for value in box.xyxy[0].tolist()]
                detections.append(
                    Detection(
                        observation_id=f"obs_{frame_id}_{index + 1}_{uuid4().hex[:8]}",
                        class_id=ontology_entry["id"],
                        label=ontology_entry["label"],
                        category=ontology_entry["category"],
                        granularity=ontology_entry["granularity"],
                        inventory_policy=ontology_entry["inventory_policy"],
                        bbox=BoundingBox(
                            x=round(max(0.0, min(1.0, x1 / image_width)), 4),
                            y=round(max(0.0, min(1.0, y1 / image_height)), 4),
                            width=round(max(0.0, min(1.0, (x2 - x1) / image_width)), 4),
                            height=round(max(0.0, min(1.0, (y2 - y1) / image_height)), 4),
                        ),
                        confidence=confidence,
                    )
                )

        return FrameResult(
            frame_id=frame_id,
            frame_ref=frame_ref,
            zone_id=zone_id,
            timestamp_ms=timestamp_ms,
            detections=detections[: options.max_detections_per_frame],
        )


def _resolve_ontology_entry(raw_label: str) -> dict:
    mapped_id = COCO_TO_ONTOLOGY.get(raw_label)

    if mapped_id == "ignore":
        return next(entry for entry in ONTOLOGY if entry["id"] == "plate")

    if mapped_id:
        return next(entry for entry in ONTOLOGY if entry["id"] == mapped_id)

    normalized_label = raw_label.lower().strip()
    for entry in ONTOLOGY:
        if any(alias == normalized_label for alias in entry["aliases"]):
            return entry

    if "bottle" in normalized_label:
        return next(entry for entry in ONTOLOGY if entry["id"] == "bottle")
    if "cup" in normalized_label or "mug" in normalized_label:
        return next(entry for entry in ONTOLOGY if entry["id"] == "mug")
    if "plate" in normalized_label:
        return next(entry for entry in ONTOLOGY if entry["id"] == "plate")

    return next(entry for entry in ONTOLOGY if entry["id"] == "unknown_kitchen_item")
