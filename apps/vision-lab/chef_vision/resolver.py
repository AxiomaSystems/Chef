from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from chef_vision.contracts import Detection, ScanResponse
from chef_vision.inventory import InventoryItem, load_inventory, now_iso, save_inventory
from chef_vision.tracking import DistinctInstanceEstimate, estimate_distinct_instances

ResolvedStatus = Literal["existing", "new", "review", "ignored"]


@dataclass(slots=True)
class ResolvedItem:
    label: str
    category: str
    inventory_policy: str
    likely_count: int
    max_confidence: float
    status: ResolvedStatus
    existing_estimated_count: int
    action: str


def resolve_video_scan(
    instance_estimates: list[DistinctInstanceEstimate],
    inventory_items: list[InventoryItem],
) -> list[ResolvedItem]:
    inventory_lookup = {item.label: item for item in inventory_items}
    resolved_items: list[ResolvedItem] = []

    for estimate in instance_estimates:
        existing = inventory_lookup.get(estimate.label)
        status = _resolve_status(
            inventory_policy=estimate.inventory_policy,
            has_existing=existing is not None,
        )
        resolved_items.append(
            ResolvedItem(
                label=estimate.label,
                category=estimate.category,
                inventory_policy=estimate.inventory_policy,
                likely_count=estimate.likely_instances,
                max_confidence=estimate.max_confidence,
                status=status,
                existing_estimated_count=existing.estimated_count if existing else 0,
                action=_resolve_action(status),
            )
        )

    return sorted(
        resolved_items,
        key=lambda item: (item.status != "existing", -item.likely_count, -item.max_confidence, item.label),
    )


def resolve_single_frame(
    detections: list[Detection],
    inventory_items: list[InventoryItem],
) -> list[ResolvedItem]:
    grouped: dict[str, dict] = {}
    for detection in detections:
        bucket = grouped.setdefault(
            detection.label,
            {
                "category": detection.category,
                "inventory_policy": detection.inventory_policy,
                "count": 0,
                "max_confidence": 0.0,
            },
        )
        bucket["count"] += 1
        bucket["max_confidence"] = max(bucket["max_confidence"], detection.confidence)

    inventory_lookup = {item.label: item for item in inventory_items}
    resolved_items: list[ResolvedItem] = []
    for label, data in grouped.items():
        existing = inventory_lookup.get(label)
        status = _resolve_status(
            inventory_policy=data["inventory_policy"],
            has_existing=existing is not None,
        )
        resolved_items.append(
            ResolvedItem(
                label=label,
                category=data["category"],
                inventory_policy=data["inventory_policy"],
                likely_count=data["count"],
                max_confidence=round(data["max_confidence"], 2),
                status=status,
                existing_estimated_count=existing.estimated_count if existing else 0,
                action=_resolve_action(status),
            )
        )

    return sorted(
        resolved_items,
        key=lambda item: (item.status != "existing", -item.likely_count, -item.max_confidence, item.label),
    )


def apply_resolved_items_to_inventory(
    inventory_path: str,
    resolved_items: list[ResolvedItem],
    source: str,
) -> list[InventoryItem]:
    existing_items = load_inventory(inventory_path)
    inventory_lookup = {item.label: item for item in existing_items}
    timestamp = now_iso()

    for resolved in resolved_items:
        if resolved.status in {"ignored", "review"}:
            continue

        existing = inventory_lookup.get(resolved.label)
        if existing is None:
            inventory_lookup[resolved.label] = InventoryItem(
                label=resolved.label,
                category=resolved.category,
                inventory_policy=resolved.inventory_policy,
                estimated_count=max(1, resolved.likely_count),
                max_confidence=resolved.max_confidence,
                source=source,
                first_added_at=timestamp,
                last_seen_at=timestamp,
            )
            continue

        existing.estimated_count = max(existing.estimated_count, resolved.likely_count)
        existing.max_confidence = max(existing.max_confidence, resolved.max_confidence)
        existing.last_seen_at = timestamp
        existing.source = source

    updated_items = sorted(inventory_lookup.values(), key=lambda item: item.label)
    save_inventory(inventory_path, updated_items)
    return updated_items


def build_label_status_map(
    resolved_items: list[ResolvedItem],
) -> dict[str, ResolvedStatus]:
    return {item.label: item.status for item in resolved_items}


def _resolve_status(inventory_policy: str, has_existing: bool) -> ResolvedStatus:
    if inventory_policy == "ignore":
        return "ignored"
    if inventory_policy == "review":
        return "review"
    if has_existing:
        return "existing"
    return "new"


def _resolve_action(status: ResolvedStatus) -> str:
    if status == "existing":
        return "match_inventory"
    if status == "new":
        return "add_inventory"
    if status == "review":
        return "needs_review"
    return "ignore"
