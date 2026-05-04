from chef_vision.contracts import BoundingBox, Detection, FrameResult, PipelineConfig, ScanResponse, ScanSummary
from chef_vision.tracking import bbox_iou, build_provisional_tracks, estimate_distinct_instances


def run_tracking_smoke() -> None:
    response = ScanResponse(
        scan_session_id="tracking_test",
        pipeline=PipelineConfig(
            provider="mock",
            stage="detection_only",
            tracking_enabled=False,
            embeddings_enabled=False,
            open_vocabulary_enabled=False,
            packaged_food_enrichment_enabled=False,
            segmentation_enabled=False,
            supported_classes=[],
            notes=[],
        ),
        frames=[
            FrameResult(
                frame_id=1,
                frame_ref=None,
                zone_id="pantry",
                timestamp_ms=0,
                detections=[
                    Detection(
                        observation_id="a1",
                        class_id="banana",
                        label="banana",
                        category="produce",
                        granularity="exact",
                        inventory_policy="track",
                        bbox=BoundingBox(0.1, 0.1, 0.2, 0.2),
                        confidence=0.81,
                    )
                ],
            ),
            FrameResult(
                frame_id=2,
                frame_ref=None,
                zone_id="pantry",
                timestamp_ms=500,
                detections=[
                    Detection(
                        observation_id="a2",
                        class_id="banana",
                        label="banana",
                        category="produce",
                        granularity="exact",
                        inventory_policy="track",
                        bbox=BoundingBox(0.11, 0.1, 0.2, 0.2),
                        confidence=0.86,
                    ),
                    Detection(
                        observation_id="b1",
                        class_id="bottle",
                        label="bottle",
                        category="container",
                        granularity="generic",
                        inventory_policy="review",
                        bbox=BoundingBox(0.6, 0.2, 0.15, 0.35),
                        confidence=0.74,
                    ),
                ],
            ),
            FrameResult(
                frame_id=4,
                frame_ref=None,
                zone_id="pantry",
                timestamp_ms=1500,
                detections=[
                    Detection(
                        observation_id="b2",
                        class_id="bottle",
                        label="bottle",
                        category="container",
                        granularity="generic",
                        inventory_policy="review",
                        bbox=BoundingBox(0.61, 0.2, 0.15, 0.35),
                        confidence=0.79,
                    )
                ],
            ),
        ],
        summary=ScanSummary(
            frame_count=3,
            detection_count=4,
            track_candidate_count=2,
            review_candidate_count=2,
            ignored_detection_count=0,
            detected_labels=["banana", "bottle"],
        ),
    )

    tracks = build_provisional_tracks(response)
    assert len(tracks) == 2
    assert tracks[0].label in {"banana", "bottle"}
    banana_track = next(track for track in tracks if track.label == "banana")
    bottle_track = next(track for track in tracks if track.label == "bottle")
    assert banana_track.frames_seen == 2
    assert bottle_track.frames_seen == 2
    assert bbox_iou(
        BoundingBox(0.1, 0.1, 0.2, 0.2),
        BoundingBox(0.11, 0.1, 0.2, 0.2),
    ) > 0.2

    estimates = estimate_distinct_instances(tracks)
    banana_estimate = next(item for item in estimates if item.label == "banana")
    bottle_estimate = next(item for item in estimates if item.label == "bottle")
    assert banana_estimate.likely_instances == 1
    assert bottle_estimate.likely_instances == 1
    assert banana_estimate.confidence_band in {"high", "medium"}


if __name__ == "__main__":
    run_tracking_smoke()
