from chef_vision.contracts import BoundingBox, Detection, FrameResult, PipelineConfig, ScanResponse, ScanSummary
from chef_vision.session_summary import best_detections_by_label, summarize_scan_labels


def run_summary_smoke() -> None:
    response = ScanResponse(
        scan_session_id="summary_test",
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
                zone_id="kitchen",
                timestamp_ms=0,
                detections=[
                    Detection(
                        observation_id="1",
                        class_id="banana",
                        label="banana",
                        category="produce",
                        granularity="exact",
                        inventory_policy="track",
                        bbox=BoundingBox(0.1, 0.1, 0.2, 0.2),
                        confidence=0.8,
                    ),
                    Detection(
                        observation_id="2",
                        class_id="bottle",
                        label="bottle",
                        category="container",
                        granularity="generic",
                        inventory_policy="review",
                        bbox=BoundingBox(0.2, 0.2, 0.2, 0.3),
                        confidence=0.7,
                    ),
                ],
            ),
            FrameResult(
                frame_id=2,
                frame_ref=None,
                zone_id="kitchen",
                timestamp_ms=500,
                detections=[
                    Detection(
                        observation_id="3",
                        class_id="banana",
                        label="banana",
                        category="produce",
                        granularity="exact",
                        inventory_policy="track",
                        bbox=BoundingBox(0.15, 0.1, 0.2, 0.2),
                        confidence=0.9,
                    )
                ],
            ),
        ],
        summary=ScanSummary(
            frame_count=2,
            detection_count=3,
            track_candidate_count=2,
            review_candidate_count=1,
            ignored_detection_count=0,
            detected_labels=["banana", "bottle"],
        ),
    )

    label_summary = summarize_scan_labels(response)
    best = best_detections_by_label(response)

    assert label_summary[0].label == "banana"
    assert label_summary[0].frames_seen == 2
    assert label_summary[0].persistence == "persistent"
    assert any(item.label == "bottle" for item in label_summary)
    assert any(item.label == "banana" and item.confidence == 0.9 for item in best)


if __name__ == "__main__":
    run_summary_smoke()
