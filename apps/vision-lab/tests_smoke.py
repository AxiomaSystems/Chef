from chef_vision.contracts import DebugObjectInput, FrameInput, ScanOptions
from chef_vision.pipeline import VisionPipeline


def run_smoke() -> None:
    pipeline = VisionPipeline()
    result = pipeline.analyze_scan(
        scan_session_id="smoke_scan",
        frames=[
            FrameInput(
                frame_id=1,
                frame_ref="fridge shelf milk carton egg carton mug",
            ),
            FrameInput(
                frame_id=2,
                zone_id="pantry_middle",
                debug_objects=[
                    DebugObjectInput(label="olive oil bottle", confidence=0.98),
                    DebugObjectInput(label="plate", confidence=0.81),
                ],
            ),
        ],
        options=ScanOptions(include_ignored=False, max_detections_per_frame=8),
    )
    assert result.summary.frame_count == 2
    assert result.summary.detection_count >= 3
    assert "milk carton" in result.summary.detected_labels
    assert any(frame.detections for frame in result.frames)


if __name__ == "__main__":
    run_smoke()
