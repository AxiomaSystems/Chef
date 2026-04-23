from __future__ import annotations

from dataclasses import dataclass

from chef_vision.contracts import Detection, ScanResponse


@dataclass(slots=True)
class LabelSessionSummary:
    label: str
    category: str
    inventory_policy: str
    detections: int
    frames_seen: int
    max_confidence: float
    first_seen_ms: int | None
    last_seen_ms: int | None
    persistence: str


@dataclass(slots=True)
class BestDetection:
    frame_id: int
    timestamp_ms: int | None
    label: str
    confidence: float
    detection: Detection


def summarize_scan_labels(response: ScanResponse) -> list[LabelSessionSummary]:
    grouped: dict[str, dict] = {}

    for frame in response.frames:
        seen_in_frame: set[str] = set()
        for detection in frame.detections:
            bucket = grouped.setdefault(
                detection.label,
                {
                    "category": detection.category,
                    "inventory_policy": detection.inventory_policy,
                    "detections": 0,
                    "frames_seen": 0,
                    "max_confidence": 0.0,
                    "first_seen_ms": frame.timestamp_ms,
                    "last_seen_ms": frame.timestamp_ms,
                },
            )
            bucket["detections"] += 1
            bucket["max_confidence"] = max(bucket["max_confidence"], detection.confidence)

            if detection.label not in seen_in_frame:
                bucket["frames_seen"] += 1
                seen_in_frame.add(detection.label)

            if frame.timestamp_ms is not None:
                if bucket["first_seen_ms"] is None:
                    bucket["first_seen_ms"] = frame.timestamp_ms
                else:
                    bucket["first_seen_ms"] = min(bucket["first_seen_ms"], frame.timestamp_ms)

                if bucket["last_seen_ms"] is None:
                    bucket["last_seen_ms"] = frame.timestamp_ms
                else:
                    bucket["last_seen_ms"] = max(bucket["last_seen_ms"], frame.timestamp_ms)

    summaries = [
        LabelSessionSummary(
            label=label,
            category=data["category"],
            inventory_policy=data["inventory_policy"],
            detections=data["detections"],
            frames_seen=data["frames_seen"],
            max_confidence=round(data["max_confidence"], 2),
            first_seen_ms=data["first_seen_ms"],
            last_seen_ms=data["last_seen_ms"],
            persistence=_persistence_label(data["frames_seen"], response.summary.frame_count),
        )
        for label, data in grouped.items()
    ]

    return sorted(
        summaries,
        key=lambda item: (-item.frames_seen, -item.max_confidence, item.label),
    )


def best_detections_by_label(
    response: ScanResponse,
    limit: int = 8,
) -> list[BestDetection]:
    best_by_label: dict[str, BestDetection] = {}

    for frame in response.frames:
        for detection in frame.detections:
            current = best_by_label.get(detection.label)
            candidate = BestDetection(
                frame_id=frame.frame_id,
                timestamp_ms=frame.timestamp_ms,
                label=detection.label,
                confidence=detection.confidence,
                detection=detection,
            )
            if current is None or candidate.confidence > current.confidence:
                best_by_label[detection.label] = candidate

    return sorted(
        best_by_label.values(),
        key=lambda item: (-item.confidence, item.label),
    )[:limit]


def _persistence_label(frames_seen: int, total_frames: int) -> str:
    if total_frames <= 0:
        return "unknown"

    ratio = frames_seen / total_frames
    if ratio >= 0.6:
        return "persistent"
    if ratio >= 0.3:
        return "intermittent"
    return "sporadic"
