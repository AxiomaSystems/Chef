from __future__ import annotations

from dataclasses import dataclass, field

from chef_vision.contracts import BoundingBox, Detection, ScanResponse


@dataclass(slots=True)
class TrackDetection:
    frame_id: int
    timestamp_ms: int | None
    detection: Detection


@dataclass(slots=True)
class ProvisionalTrack:
    track_id: str
    label: str
    category: str
    inventory_policy: str
    detections: list[TrackDetection] = field(default_factory=list)
    first_seen_ms: int | None = None
    last_seen_ms: int | None = None
    max_confidence: float = 0.0

    @property
    def frames_seen(self) -> int:
        return len({item.frame_id for item in self.detections})

    @property
    def detection_count(self) -> int:
        return len(self.detections)


@dataclass(slots=True)
class DistinctInstanceEstimate:
    label: str
    category: str
    inventory_policy: str
    provisional_tracks: int
    strong_tracks: int
    likely_instances: int
    max_confidence: float
    confidence_band: str


def build_provisional_tracks(
    response: ScanResponse,
    iou_threshold: float = 0.2,
    max_frame_gap: int = 2,
) -> list[ProvisionalTrack]:
    tracks: list[ProvisionalTrack] = []
    next_track_index = 1

    for frame in response.frames:
        for detection in frame.detections:
            matched_track = _find_matching_track(
                tracks=tracks,
                detection=detection,
                frame_id=frame.frame_id,
                iou_threshold=iou_threshold,
                max_frame_gap=max_frame_gap,
            )

            if matched_track is None:
                matched_track = ProvisionalTrack(
                    track_id=f"trk_{next_track_index:03d}",
                    label=detection.label,
                    category=detection.category,
                    inventory_policy=detection.inventory_policy,
                )
                tracks.append(matched_track)
                next_track_index += 1

            matched_track.detections.append(
                TrackDetection(
                    frame_id=frame.frame_id,
                    timestamp_ms=frame.timestamp_ms,
                    detection=detection,
                )
            )
            matched_track.max_confidence = max(
                matched_track.max_confidence,
                detection.confidence,
            )

            if frame.timestamp_ms is not None:
                if matched_track.first_seen_ms is None:
                    matched_track.first_seen_ms = frame.timestamp_ms
                else:
                    matched_track.first_seen_ms = min(
                        matched_track.first_seen_ms,
                        frame.timestamp_ms,
                    )

                if matched_track.last_seen_ms is None:
                    matched_track.last_seen_ms = frame.timestamp_ms
                else:
                    matched_track.last_seen_ms = max(
                        matched_track.last_seen_ms,
                        frame.timestamp_ms,
                    )

    return sorted(
        tracks,
        key=lambda track: (-track.frames_seen, -track.max_confidence, track.track_id),
    )


def estimate_distinct_instances(
    tracks: list[ProvisionalTrack],
) -> list[DistinctInstanceEstimate]:
    grouped: dict[str, list[ProvisionalTrack]] = {}

    for track in tracks:
        grouped.setdefault(track.label, []).append(track)

    estimates: list[DistinctInstanceEstimate] = []
    for label, label_tracks in grouped.items():
        strong_tracks = [track for track in label_tracks if _is_strong_track(track)]
        likely_instances = len(strong_tracks) if strong_tracks else len(label_tracks)
        max_confidence = max(track.max_confidence for track in label_tracks)

        estimates.append(
            DistinctInstanceEstimate(
                label=label,
                category=label_tracks[0].category,
                inventory_policy=label_tracks[0].inventory_policy,
                provisional_tracks=len(label_tracks),
                strong_tracks=len(strong_tracks),
                likely_instances=likely_instances,
                max_confidence=round(max_confidence, 2),
                confidence_band=_confidence_band(
                    total_tracks=len(label_tracks),
                    strong_tracks=len(strong_tracks),
                    max_confidence=max_confidence,
                ),
            )
        )

    return sorted(
        estimates,
        key=lambda item: (-item.likely_instances, -item.strong_tracks, -item.max_confidence, item.label),
    )


def _find_matching_track(
    tracks: list[ProvisionalTrack],
    detection: Detection,
    frame_id: int,
    iou_threshold: float,
    max_frame_gap: int,
) -> ProvisionalTrack | None:
    candidates: list[tuple[float, ProvisionalTrack]] = []

    for track in tracks:
        if track.label != detection.label:
            continue
        if not track.detections:
            continue

        previous = track.detections[-1]
        if frame_id - previous.frame_id > max_frame_gap:
            continue

        overlap = bbox_iou(previous.detection.bbox, detection.bbox)
        if overlap >= iou_threshold:
            candidates.append((overlap, track))

    if not candidates:
        return None

    candidates.sort(key=lambda item: item[0], reverse=True)
    return candidates[0][1]


def bbox_iou(left: BoundingBox, right: BoundingBox) -> float:
    left_x1 = left.x
    left_y1 = left.y
    left_x2 = left.x + left.width
    left_y2 = left.y + left.height

    right_x1 = right.x
    right_y1 = right.y
    right_x2 = right.x + right.width
    right_y2 = right.y + right.height

    inter_x1 = max(left_x1, right_x1)
    inter_y1 = max(left_y1, right_y1)
    inter_x2 = min(left_x2, right_x2)
    inter_y2 = min(left_y2, right_y2)

    inter_width = max(0.0, inter_x2 - inter_x1)
    inter_height = max(0.0, inter_y2 - inter_y1)
    intersection = inter_width * inter_height

    left_area = max(0.0, left.width) * max(0.0, left.height)
    right_area = max(0.0, right.width) * max(0.0, right.height)
    union = left_area + right_area - intersection

    if union <= 0:
        return 0.0

    return intersection / union


def _is_strong_track(track: ProvisionalTrack) -> bool:
    return track.frames_seen >= 2 or track.max_confidence >= 0.9


def _confidence_band(
    total_tracks: int,
    strong_tracks: int,
    max_confidence: float,
) -> str:
    if strong_tracks == total_tracks and strong_tracks > 0:
        return "high"
    if strong_tracks > 0 or max_confidence >= 0.85:
        return "medium"
    return "low"
