from __future__ import annotations

from uuid import uuid4

from chef_vision.contracts import BoundingBox, Detection, FrameInput, FrameResult, ScanOptions
from chef_vision.detectors.base import DetectorProvider
from chef_vision.ontology import DEFAULT_BOXES, ONTOLOGY


class MockDetector(DetectorProvider):
    name = "mock-stage1-detector"

    def detect_frame(self, frame: FrameInput, options: ScanOptions) -> FrameResult:
        raw_detections = (
            [
                self._map_debug_object(
                    frame.frame_id,
                    entry.label,
                    index,
                    entry.bbox,
                    entry.confidence,
                )
                for index, entry in enumerate(frame.debug_objects)
            ]
            if frame.debug_objects
            else self._infer_from_frame_ref(frame.frame_id, frame.frame_ref)
        )

        detections = [
            detection
            for detection in raw_detections
            if options.include_ignored or detection.inventory_policy != "ignore"
        ][: options.max_detections_per_frame]

        return FrameResult(
            frame_id=frame.frame_id,
            frame_ref=frame.frame_ref,
            zone_id=frame.zone_id,
            timestamp_ms=frame.timestamp_ms,
            detections=detections,
        )

    def _infer_from_frame_ref(self, frame_id: int, frame_ref: str | None) -> list[Detection]:
        if not frame_ref:
            return []

        normalized_ref = _normalize_text(frame_ref)
        exact_matches = [
            entry
            for entry in ONTOLOGY
            if entry["granularity"] == "exact"
            and any(_contains_term(normalized_ref, alias) for alias in entry["aliases"])
        ]
        generic_matches = (
            []
            if exact_matches
            else [
                entry
                for entry in ONTOLOGY
                if entry["granularity"] == "generic"
                and entry["id"] != "unknown_kitchen_item"
                and any(_contains_term(normalized_ref, alias) for alias in entry["aliases"])
            ]
        )
        matches = [*exact_matches, *generic_matches]

        return [
            self._create_detection(
                frame_id=frame_id,
                entry=entry,
                index=index,
                bbox=None,
                confidence=_default_confidence_for(entry),
            )
            for index, entry in enumerate(matches)
        ]

    def _map_debug_object(
        self,
        frame_id: int,
        label: str,
        index: int,
        bbox: BoundingBox | None,
        confidence: float | None,
    ) -> Detection:
        entry = self._find_ontology_entry(label)
        return self._create_detection(
            frame_id=frame_id,
            entry=entry,
            index=index,
            bbox=bbox,
            confidence=_clamp_confidence(confidence or _default_confidence_for(entry)),
        )

    def _find_ontology_entry(self, label: str) -> dict:
        normalized_label = _normalize_text(label)
        return next(
            (
                entry
                for entry in ONTOLOGY
                if any(_contains_term(normalized_label, alias) for alias in entry["aliases"])
            ),
            next(entry for entry in ONTOLOGY if entry["id"] == "unknown_kitchen_item"),
        )

    def _create_detection(
        self,
        frame_id: int,
        entry: dict,
        index: int,
        bbox: BoundingBox | None,
        confidence: float,
    ) -> Detection:
        return Detection(
            observation_id=f"obs_{frame_id}_{index + 1}_{uuid4().hex[:8]}",
            class_id=entry["id"],
            label=entry["label"],
            category=entry["category"],
            granularity=entry["granularity"],
            inventory_policy=entry["inventory_policy"],
            bbox=bbox or DEFAULT_BOXES[index % len(DEFAULT_BOXES)],
            confidence=confidence,
        )


def _normalize_text(value: str) -> str:
    return "".join(char.lower() if char.isalnum() else " " for char in value).strip()


def _contains_term(haystack: str, needle: str) -> bool:
    return _normalize_text(needle) in haystack


def _default_confidence_for(entry: dict) -> float:
    if entry["inventory_policy"] == "ignore":
        return 0.81
    if entry["granularity"] == "generic":
        return 0.72
    return 0.91


def _clamp_confidence(value: float) -> float:
    return round(max(0.0, min(1.0, value)), 2)
