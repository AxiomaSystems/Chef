from __future__ import annotations

import argparse
import json
from pathlib import Path

from prepare_ingredient_detection_data import DEFAULT_LABEL_MAP


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create a human/LLM review packet for unmapped detector-training labels."
    )
    parser.add_argument("--label-map-report", type=Path, required=True)
    parser.add_argument("--label-map", type=Path, default=DEFAULT_LABEL_MAP)
    parser.add_argument("--output", type=Path, required=True)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    report = json.loads(args.label_map_report.read_text(encoding="utf-8"))
    label_map = json.loads(args.label_map.read_text(encoding="utf-8"))
    canonical_classes = [
        {
            "id": entry["id"],
            "label": entry["label"],
            "category": entry["category"],
            "inventory_policy": entry["inventory_policy"],
            "aliases": entry.get("aliases", []),
        }
        for entry in label_map.get("classes", [])
        if entry.get("stage_1_enabled", True)
    ]
    unmapped = [
        {"source_label": label, "count": count}
        for label, count in sorted(
            report.get("excluded_label_counts", {}).items(),
            key=lambda item: (-item[1], item[0]),
        )
    ]
    packet = {
        "instructions": [
            "Review each source_label and decide whether it maps to an existing canonical class, needs a new canonical class, should remain excluded, or should route to unknown_kitchen_item review.",
            "Prefer existing canonical ingredient identities over creating package-specific classes.",
            "Use package_hint for words like jar, bag, carton, bottle, pouch, box, and can when the ingredient identity is clear.",
            "Do not approve mappings that are ambiguous without image review.",
        ],
        "allowed_actions": [
            "map_existing",
            "new_canonical_class",
            "route_review",
            "exclude",
        ],
        "canonical_classes": canonical_classes,
        "unmapped_labels": unmapped,
        "decisions": [
            {
                "source_label": item["source_label"],
                "count": item["count"],
                "action": "exclude",
                "class_id": None,
                "new_class": None,
                "package_hint": None,
                "rationale": "",
            }
            for item in unmapped
        ],
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(packet, indent=2), encoding="utf-8")
    print(json.dumps({"review_packet": str(args.output), "unmapped_label_count": len(unmapped)}, indent=2))


if __name__ == "__main__":
    main()

