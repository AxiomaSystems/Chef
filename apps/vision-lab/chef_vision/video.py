from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import cv2


@dataclass(slots=True)
class SampledVideoFrame:
    frame_id: int
    image_path: str
    timestamp_ms: int


@dataclass(slots=True)
class VideoExtractionSummary:
    total_frames: int
    source_fps: float
    sampled_frame_count: int
    duration_ms: int


@dataclass(slots=True)
class VideoExtractionResult:
    frames: list[SampledVideoFrame]
    summary: VideoExtractionSummary


def extract_sampled_frames(
    video_path: str,
    output_dir: str,
    target_fps: float = 1.0,
    max_frames: int = 30,
    image_extension: str = ".jpg",
) -> VideoExtractionResult:
    capture = cv2.VideoCapture(video_path)

    if not capture.isOpened():
        raise ValueError(f"Unable to open video file: {video_path}")

    source_fps = float(capture.get(cv2.CAP_PROP_FPS) or 0.0)
    total_frames = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    source_fps = source_fps if source_fps > 0 else 30.0
    target_fps = max(0.1, float(target_fps))
    sample_every_n = max(1, int(round(source_fps / target_fps)))
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    sampled_frames: list[SampledVideoFrame] = []
    frame_index = 0

    while capture.isOpened() and len(sampled_frames) < max_frames:
        success, frame = capture.read()
        if not success:
            break

        if frame_index % sample_every_n == 0:
            sampled_index = len(sampled_frames) + 1
            timestamp_ms = int((frame_index / source_fps) * 1000)
            frame_filename = output_path / f"frame_{sampled_index:04d}{image_extension}"
            cv2.imwrite(str(frame_filename), frame)
            sampled_frames.append(
                SampledVideoFrame(
                    frame_id=sampled_index,
                    image_path=str(frame_filename),
                    timestamp_ms=timestamp_ms,
                )
            )

        frame_index += 1

    capture.release()

    duration_ms = int((total_frames / source_fps) * 1000) if total_frames else 0

    return VideoExtractionResult(
        frames=sampled_frames,
        summary=VideoExtractionSummary(
            total_frames=total_frames,
            source_fps=round(source_fps, 2),
            sampled_frame_count=len(sampled_frames),
            duration_ms=duration_ms,
        ),
    )
