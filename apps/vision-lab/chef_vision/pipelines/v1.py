from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Literal

from chef_vision.contracts import ScanResponse
from chef_vision.inventory import InventoryItem
from chef_vision.resolver import ResolvedItem, resolve_single_frame, resolve_video_scan
from chef_vision.tracking import build_provisional_tracks, estimate_distinct_instances


PipelineVersion = Literal["v1"]


@dataclass(slots=True)
class PipelineV1Result:
    version: PipelineVersion
    response: ScanResponse
    resolved_items: list[ResolvedItem]
    notes: list[str]

    def to_dict(self) -> dict:
        return {
            "version": self.version,
            "response": self.response.to_dict(),
            "resolved_items": [asdict(item) for item in self.resolved_items],
            "notes": self.notes,
        }


def resolve_photo_v1(
    response: ScanResponse,
    inventory_items: list[InventoryItem],
) -> PipelineV1Result:
    detections = response.frames[0].detections if response.frames else []
    return PipelineV1Result(
        version="v1",
        response=response,
        resolved_items=resolve_single_frame(detections, inventory_items),
        notes=[
            "Pipeline v1 groups detections by final label inside a single frame.",
            "It does not create durable physical-object candidates before inventory resolution.",
        ],
    )


def resolve_video_v1(
    response: ScanResponse,
    inventory_items: list[InventoryItem],
) -> PipelineV1Result:
    tracks = build_provisional_tracks(response)
    estimates = estimate_distinct_instances(tracks)
    return PipelineV1Result(
        version="v1",
        response=response,
        resolved_items=resolve_video_scan(estimates, inventory_items),
        notes=[
            "Pipeline v1 estimates instances from label-based provisional tracks.",
            "It is kept as the fallback path while Pipeline v2 is evaluated.",
        ],
    )

