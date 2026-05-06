from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Literal

from chef_vision.contracts import Detection, ScanResponse
from chef_vision.inventory import InventoryItem
from chef_vision.resolver import ResolvedItem, resolve_video_scan
from chef_vision.tracking import ProvisionalTrack, build_provisional_tracks, estimate_distinct_instances


PipelineVersion = Literal["v2"]


@dataclass(slots=True)
class ObjectObservation:
    frame_id: int
    timestamp_ms: int | None
    observation_id: str
    label: str
    confidence: float


@dataclass(slots=True)
class InventoryCandidate:
    candidate_id: str
    canonical_label: str
    display_label: str
    category: str
    inventory_policy: str
    likely_count: int
    confidence: float
    status: str
    evidence_frames: list[int]
    observation_count: int
    package_hint: str | None = None
    notes: list[str] = field(default_factory=list)


@dataclass(slots=True)
class PipelineV2Result:
    version: PipelineVersion
    response: ScanResponse
    tracks: list[ProvisionalTrack]
    candidates: list[InventoryCandidate]
    resolved_items: list[ResolvedItem]
    notes: list[str]

    def to_dict(self) -> dict:
        return {
            "version": self.version,
            "response": self.response.to_dict(),
            "tracks": [_track_to_dict(track) for track in self.tracks],
            "candidates": [asdict(candidate) for candidate in self.candidates],
            "resolved_items": [asdict(item) for item in self.resolved_items],
            "notes": self.notes,
        }


def resolve_scan_v2(
    response: ScanResponse,
    inventory_items: list[InventoryItem],
    iou_threshold: float = 0.2,
    max_frame_gap: int = 2,
) -> PipelineV2Result:
    tracks = build_provisional_tracks(
        response=response,
        iou_threshold=iou_threshold,
        max_frame_gap=max_frame_gap,
    )
    estimates = estimate_distinct_instances(tracks)
    resolved_items = resolve_video_scan(estimates, inventory_items)
    resolved_by_label = {item.label: item for item in resolved_items}
    candidates = [
        _candidate_from_track_group(
            label=label,
            tracks=label_tracks,
            resolved_item=resolved_by_label.get(label),
            index=index,
        )
        for index, (label, label_tracks) in enumerate(_group_tracks_by_label(tracks).items(), start=1)
    ]

    return PipelineV2Result(
        version="v2",
        response=response,
        tracks=tracks,
        candidates=sorted(
            candidates,
            key=lambda item: (item.status != "existing", -item.likely_count, -item.confidence, item.display_label),
        ),
        resolved_items=resolved_items,
        notes=[
            "Pipeline v2 creates physical-object track candidates before inventory resolution.",
            "canonical_label is the normalized ingredient identity used by inventory/recipes.",
            "display_label is user-facing text and may include packaging or source wording.",
        ],
    )


def _group_tracks_by_label(tracks: list[ProvisionalTrack]) -> dict[str, list[ProvisionalTrack]]:
    grouped: dict[str, list[ProvisionalTrack]] = {}
    for track in tracks:
        grouped.setdefault(track.label, []).append(track)
    return grouped


def _candidate_from_track_group(
    label: str,
    tracks: list[ProvisionalTrack],
    resolved_item: ResolvedItem | None,
    index: int,
) -> InventoryCandidate:
    best_detection = _best_detection(tracks)
    likely_count = resolved_item.likely_count if resolved_item else len(tracks)
    status = resolved_item.status if resolved_item else "review"
    confidence = resolved_item.max_confidence if resolved_item else round(best_detection.confidence, 2)
    policy = resolved_item.inventory_policy if resolved_item else best_detection.inventory_policy
    category = resolved_item.category if resolved_item else best_detection.category

    return InventoryCandidate(
        candidate_id=f"cand_{index:03d}",
        canonical_label=label,
        display_label=label,
        category=category,
        inventory_policy=policy,
        likely_count=likely_count,
        confidence=confidence,
        status=status,
        evidence_frames=sorted({item.frame_id for track in tracks for item in track.detections}),
        observation_count=sum(track.detection_count for track in tracks),
        notes=[
            f"{len(tracks)} track(s)",
            f"best detector label: {best_detection.detector_label or best_detection.label}",
        ],
    )


def _best_detection(tracks: list[ProvisionalTrack]) -> Detection:
    detections = [item.detection for track in tracks for item in track.detections]
    return max(detections, key=lambda detection: detection.confidence)


def _track_to_dict(track: ProvisionalTrack) -> dict:
    return {
        "track_id": track.track_id,
        "label": track.label,
        "category": track.category,
        "inventory_policy": track.inventory_policy,
        "frames_seen": track.frames_seen,
        "detection_count": track.detection_count,
        "first_seen_ms": track.first_seen_ms,
        "last_seen_ms": track.last_seen_ms,
        "max_confidence": round(track.max_confidence, 2),
        "observations": [
            {
                "frame_id": item.frame_id,
                "timestamp_ms": item.timestamp_ms,
                "observation_id": item.detection.observation_id,
                "label": item.detection.label,
                "confidence": item.detection.confidence,
            }
            for item in track.detections
        ],
    }

