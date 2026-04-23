from __future__ import annotations

from .contracts import BoundingBox, PipelineConfig, VisionClassDefinition


DEFAULT_BOXES: list[BoundingBox] = [
    BoundingBox(x=0.08, y=0.12, width=0.22, height=0.48),
    BoundingBox(x=0.36, y=0.10, width=0.20, height=0.50),
    BoundingBox(x=0.62, y=0.16, width=0.24, height=0.42),
    BoundingBox(x=0.18, y=0.58, width=0.26, height=0.26),
    BoundingBox(x=0.56, y=0.60, width=0.24, height=0.24),
]


ONTOLOGY: list[dict] = [
    {
        "id": "onion",
        "label": "onion",
        "aliases": ["onion", "red onion", "yellow onion"],
        "category": "produce",
        "granularity": "exact",
        "inventory_policy": "track",
    },
    {
        "id": "carrot",
        "label": "carrot",
        "aliases": ["carrot", "carrots"],
        "category": "produce",
        "granularity": "exact",
        "inventory_policy": "track",
    },
    {
        "id": "banana",
        "label": "banana",
        "aliases": ["banana", "bananas"],
        "category": "produce",
        "granularity": "exact",
        "inventory_policy": "track",
    },
    {
        "id": "apple",
        "label": "apple",
        "aliases": ["apple", "apples"],
        "category": "produce",
        "granularity": "exact",
        "inventory_policy": "track",
    },
    {
        "id": "tomato",
        "label": "tomato",
        "aliases": ["tomato", "tomatoes"],
        "category": "produce",
        "granularity": "exact",
        "inventory_policy": "track",
    },
    {
        "id": "milk_carton",
        "label": "milk carton",
        "aliases": ["milk carton", "milk jug", "milk"],
        "category": "packaged_food",
        "granularity": "exact",
        "inventory_policy": "track",
    },
    {
        "id": "egg_carton",
        "label": "egg carton",
        "aliases": ["egg carton", "egg tray", "eggs"],
        "category": "packaged_food",
        "granularity": "exact",
        "inventory_policy": "track",
    },
    {
        "id": "cereal_box",
        "label": "cereal box",
        "aliases": ["cereal box", "cereal"],
        "category": "packaged_food",
        "granularity": "exact",
        "inventory_policy": "track",
    },
    {
        "id": "rice_bag",
        "label": "rice bag",
        "aliases": ["rice bag", "bag of rice", "rice"],
        "category": "packaged_food",
        "granularity": "exact",
        "inventory_policy": "track",
    },
    {
        "id": "flour_bag",
        "label": "flour bag",
        "aliases": ["flour bag", "bag of flour", "flour"],
        "category": "packaged_food",
        "granularity": "exact",
        "inventory_policy": "track",
    },
    {
        "id": "spice_bottle",
        "label": "spice bottle",
        "aliases": ["spice bottle", "spice jar", "seasoning bottle"],
        "category": "container",
        "granularity": "exact",
        "inventory_policy": "track",
    },
    {
        "id": "olive_oil_bottle",
        "label": "olive oil bottle",
        "aliases": ["olive oil bottle", "oil bottle", "olive oil"],
        "category": "container",
        "granularity": "exact",
        "inventory_policy": "track",
    },
    {
        "id": "soda_can",
        "label": "soda can",
        "aliases": ["soda can", "can of soda", "soft drink can"],
        "category": "packaged_food",
        "granularity": "exact",
        "inventory_policy": "track",
    },
    {
        "id": "leftovers_container",
        "label": "leftovers container",
        "aliases": ["leftovers container", "meal prep container", "food container"],
        "category": "prepared_food",
        "granularity": "exact",
        "inventory_policy": "review",
    },
    {
        "id": "bottle",
        "label": "bottle",
        "aliases": ["bottle", "water bottle"],
        "category": "container",
        "granularity": "generic",
        "inventory_policy": "review",
    },
    {
        "id": "jar",
        "label": "jar",
        "aliases": ["jar", "glass jar"],
        "category": "container",
        "granularity": "generic",
        "inventory_policy": "review",
    },
    {
        "id": "container",
        "label": "container",
        "aliases": ["container", "plastic container"],
        "category": "container",
        "granularity": "generic",
        "inventory_policy": "review",
    },
    {
        "id": "plate",
        "label": "plate",
        "aliases": ["plate", "dish"],
        "category": "kitchenware",
        "granularity": "generic",
        "inventory_policy": "ignore",
    },
    {
        "id": "mug",
        "label": "mug",
        "aliases": ["mug", "cup"],
        "category": "kitchenware",
        "granularity": "generic",
        "inventory_policy": "ignore",
    },
    {
        "id": "utensil",
        "label": "utensil",
        "aliases": ["utensil", "fork", "knife", "spoon"],
        "category": "kitchenware",
        "granularity": "generic",
        "inventory_policy": "ignore",
    },
    {
        "id": "unknown_kitchen_item",
        "label": "unknown kitchen item",
        "aliases": ["unknown", "unknown kitchen item"],
        "category": "unknown",
        "granularity": "generic",
        "inventory_policy": "review",
    },
]


PIPELINE_NOTES = [
    "Stage 1 is detection only. Tracking, embeddings, OCR, barcode, and DINO-style fallback are off.",
    "The current detector is a mock harness for scan-session testing and UI iteration.",
    "Downstream systems should treat track vs review vs ignore as separate actions instead of using raw labels alone.",
]


def supported_classes() -> list[VisionClassDefinition]:
    return [
        VisionClassDefinition(
            id=entry["id"],
            label=entry["label"],
            category=entry["category"],
            granularity=entry["granularity"],
            inventory_policy=entry["inventory_policy"],
        )
        for entry in ONTOLOGY
    ]


def build_pipeline_config(provider: str) -> PipelineConfig:
    return PipelineConfig(
        provider=provider,
        stage="detection_only",
        tracking_enabled=False,
        embeddings_enabled=False,
        open_vocabulary_enabled=False,
        packaged_food_enrichment_enabled=False,
        segmentation_enabled=False,
        supported_classes=supported_classes(),
        notes=PIPELINE_NOTES,
    )
