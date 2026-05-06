from chef_vision.contracts import BoundingBox, Detection
from chef_vision.inventory import InventoryItem
from chef_vision.resolver import build_label_status_map, resolve_single_frame


def run_resolver_smoke() -> None:
    inventory = [
        InventoryItem(
            label="banana",
            category="produce",
            inventory_policy="track",
            estimated_count=1,
            max_confidence=0.9,
            source="seed",
            first_added_at="2026-01-01T00:00:00+00:00",
            last_seen_at="2026-01-01T00:00:00+00:00",
        )
    ]

    detections = [
        Detection(
            observation_id="1",
            class_id="banana",
            label="banana",
            category="produce",
            granularity="exact",
            inventory_policy="track",
            bbox=BoundingBox(0.1, 0.1, 0.2, 0.2),
            confidence=0.88,
        ),
        Detection(
            observation_id="2",
            class_id="bottle",
            label="bottle",
            category="container",
            granularity="generic",
            inventory_policy="review",
            bbox=BoundingBox(0.4, 0.2, 0.15, 0.3),
            confidence=0.71,
        ),
    ]

    resolved = resolve_single_frame(detections, inventory)
    status_map = build_label_status_map(resolved)
    banana = next(item for item in resolved if item.label == "banana")
    bottle = next(item for item in resolved if item.label == "bottle")

    assert banana.status == "existing"
    assert banana.action == "match_inventory"
    assert bottle.status == "review"
    assert status_map["banana"] == "existing"
    assert status_map["bottle"] == "review"


if __name__ == "__main__":
    run_resolver_smoke()
