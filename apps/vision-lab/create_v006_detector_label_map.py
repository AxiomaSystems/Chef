from __future__ import annotations

import argparse
import json
from pathlib import Path


APP_DIR = Path(__file__).resolve().parent
DEFAULT_OUTPUT = APP_DIR / "config" / "vision-label-mappings-v006-detector.json"

CONTAINER_SOURCE_LABELS = {
    "bag",
    "bottle",
    "box",
    "tin can",
    "can",
    "carton",
    "egg carton",
    "package",
    "packet",
    "jar",
}

IGNORED_SOURCE_LABELS = {
    "bowl",
    "coffee cup",
    "cup",
    "mug",
    "plate",
    "spoon",
    "fork",
    "knife",
    "tableware",
}

# The initial v006 detector taxonomy is intentionally built from labels that are
# present in FoodInsSeg and Teen-Different/Food-Ingredient. Do not add classes
# here unless a source dataset actually has bounding boxes for them.
FOOD_CLASSES: list[tuple[str, str, str, list[str]]] = [
    ("almond", "almond", "packaged_food", ["almonds"]),
    ("apple", "apple", "produce", []),
    ("apricot", "apricot", "produce", []),
    ("asparagus", "asparagus", "produce", []),
    ("avocado", "avocado", "produce", []),
    ("bacon", "bacon", "packaged_food", []),
    ("banana", "banana", "produce", []),
    ("barley", "barley", "packaged_food", []),
    ("basil", "basil", "produce", []),
    ("bean", "bean", "produce", ["beans"]),
    ("bean_sprout", "bean sprout", "produce", ["bean sprouts"]),
    ("beef", "beef", "packaged_food", ["steak"]),
    ("beet", "beet", "produce", ["beets"]),
    ("berry", "berry", "produce", ["berries"]),
    ("biscuit", "biscuit", "packaged_food", ["biscuits"]),
    ("blackberry", "blackberry", "produce", ["blackberries"]),
    ("blueberry", "blueberry", "produce", ["blueberries"]),
    ("bread", "bread", "packaged_food", []),
    ("broccoli", "broccoli", "produce", []),
    ("butter", "butter", "packaged_food", ["cheese butter"]),
    ("cabbage", "cabbage", "produce", []),
    ("cake", "cake", "prepared_food", []),
    ("candy", "candy", "packaged_food", []),
    ("cardamom", "cardamom", "packaged_food", []),
    ("carrot", "carrot", "produce", []),
    ("cashew", "cashew", "packaged_food", ["cashews"]),
    ("cauliflower", "cauliflower", "produce", []),
    ("celery", "celery", "produce", ["celery stick"]),
    ("cereal", "cereal", "packaged_food", []),
    ("cheese", "cheese", "packaged_food", []),
    ("cherry", "cherry", "produce", ["cherries"]),
    ("chicken", "chicken", "packaged_food", []),
    ("chicken_duck", "chicken/duck", "packaged_food", ["chicken duck"]),
    ("chickpea", "chickpea", "packaged_food", ["chickpeas"]),
    ("chocolate", "chocolate", "packaged_food", []),
    ("cilantro", "cilantro", "produce", []),
    ("cilantro_mint", "cilantro/mint", "produce", ["cilantro mint"]),
    ("cinnamon", "cinnamon", "packaged_food", []),
    ("clove", "clove", "packaged_food", []),
    ("coconut", "coconut", "produce", []),
    ("coffee", "coffee", "packaged_food", []),
    ("cookie", "cookie", "packaged_food", ["cookies"]),
    ("corn", "corn", "produce", []),
    ("crab", "crab", "packaged_food", []),
    ("cranberry", "cranberry", "produce", ["dried cranberries"]),
    ("cucumber", "cucumber", "produce", []),
    ("date", "date", "produce", ["dates"]),
    ("egg", "egg", "packaged_food", ["eggs"]),
    ("egg_tart", "egg tart", "prepared_food", []),
    ("eggplant", "eggplant", "produce", []),
    ("enoki_mushroom", "enoki mushroom", "produce", []),
    ("fig", "fig", "produce", []),
    ("fish", "fish", "packaged_food", []),
    ("french_bean", "French bean", "produce", ["French beans"]),
    ("french_fries", "french fries", "prepared_food", []),
    ("fried_meat", "fried meat", "prepared_food", []),
    ("garlic", "garlic", "produce", []),
    ("ginger", "ginger", "produce", []),
    ("grape", "grape", "produce", ["grapes"]),
    ("green_bean", "green bean", "produce", ["green beans"]),
    ("hamburg", "hamburg", "prepared_food", []),
    ("honey", "honey", "packaged_food", []),
    ("ice_cream", "ice cream", "prepared_food", []),
    ("jalapeno", "jalapeno", "produce", []),
    ("juice", "juice", "packaged_food", []),
    ("kelp", "kelp", "produce", []),
    ("king_oyster_mushroom", "king oyster mushroom", "produce", []),
    ("kiwi", "kiwi", "produce", []),
    ("lamb", "lamb", "packaged_food", []),
    ("lemon", "lemon", "produce", []),
    ("lettuce", "lettuce", "produce", []),
    ("mango", "mango", "produce", []),
    ("marshmallow", "marshmallow", "packaged_food", ["marshmallows"]),
    ("melon", "melon", "produce", []),
    ("milk", "milk", "packaged_food", []),
    ("milkshake", "milkshake", "prepared_food", []),
    ("mint", "mint", "produce", []),
    ("muffin", "muffin", "prepared_food", ["muffins"]),
    ("mushroom", "mushroom", "produce", []),
    ("noodle", "noodle", "packaged_food", ["noodles"]),
    ("nut", "nut", "packaged_food", ["nuts"]),
    ("oat", "oat", "packaged_food", ["oats"]),
    ("okra", "okra", "produce", []),
    ("olive", "olive", "produce", ["olives"]),
    ("onion", "onion", "produce", []),
    ("orange", "orange", "produce", []),
    ("oyster_mushroom", "oyster mushroom", "produce", []),
    ("pasta", "pasta", "packaged_food", []),
    ("peach", "peach", "produce", []),
    ("peanut", "peanut", "packaged_food", []),
    ("pear", "pear", "produce", []),
    ("pepper", "pepper", "produce", []),
    ("pie", "pie", "prepared_food", []),
    ("pineapple", "pineapple", "produce", []),
    ("pistachio", "pistachio", "packaged_food", ["pistachios"]),
    ("pizza", "pizza", "prepared_food", []),
    ("popcorn", "popcorn", "prepared_food", []),
    ("pork", "pork", "packaged_food", []),
    ("potato", "potato", "produce", []),
    ("pudding", "pudding", "prepared_food", []),
    ("pumpkin", "pumpkin", "produce", []),
    ("radish", "radish", "produce", ["radishes", "white radish"]),
    ("raisin", "raisin", "packaged_food", ["raisins"]),
    ("raspberry", "raspberry", "produce", []),
    ("red_bean", "red bean", "produce", ["red beans"]),
    ("rice", "rice", "packaged_food", []),
    ("rosemary", "rosemary", "produce", []),
    ("salad", "salad", "prepared_food", []),
    ("salmon", "salmon", "packaged_food", []),
    ("salt", "salt", "packaged_food", []),
    ("sauce", "sauce", "packaged_food", []),
    ("sausage", "sausage", "packaged_food", []),
    ("seaweed", "seaweed", "produce", []),
    ("shellfish", "shellfish", "packaged_food", []),
    ("shiitake", "shiitake", "produce", []),
    ("shrimp", "shrimp", "packaged_food", []),
    ("snow_pea", "snow pea", "produce", ["snow peas"]),
    ("soup", "soup", "prepared_food", []),
    ("soy", "soy", "packaged_food", []),
    ("spinach", "spinach", "produce", []),
    ("spring_onion", "spring onion", "produce", []),
    ("strawberry", "strawberry", "produce", ["strawberries"]),
    ("sugar", "sugar", "packaged_food", []),
    ("tea", "tea", "packaged_food", []),
    ("tofu", "tofu", "packaged_food", []),
    ("tomato", "tomato", "produce", []),
    ("walnut", "walnut", "packaged_food", ["walnuts"]),
    ("watermelon", "watermelon", "produce", []),
    ("white_button_mushroom", "white button mushroom", "produce", []),
    ("wine", "wine", "packaged_food", []),
    ("wonton_dumpling", "wonton dumpling", "prepared_food", ["wonton dumplings"]),
    ("yogurt", "yogurt", "packaged_food", []),
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create the v006 detector label map used by chef-detector-v006-foodinsseg-80plus."
    )
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--overwrite", action="store_true")
    return parser.parse_args()


def normalize(value: str) -> str:
    normalized = value.lower().strip()
    for character in ("_", "-", "/", "\\", ".", ",", "(", ")"):
        normalized = normalized.replace(character, " ")
    return " ".join(normalized.split())


def class_entry(class_id: str, label: str, category: str, aliases: list[str]) -> dict:
    unique_aliases = []
    for alias in aliases:
        if normalize(alias) == normalize(label):
            continue
        if alias not in unique_aliases:
            unique_aliases.append(alias)
    return {
        "id": class_id,
        "label": label,
        "category": category,
        "granularity": "exact" if category != "container" else "generic",
        "inventory_policy": "review",
        "stage_1_enabled": True,
        "aliases": unique_aliases,
    }


def build_mapping() -> dict:
    classes = [class_entry("container", "container", "container", sorted(CONTAINER_SOURCE_LABELS))]
    classes.extend(class_entry(class_id, label, category, aliases) for class_id, label, category, aliases in FOOD_CLASSES)

    overrides: dict[str, str] = {}
    for source_label in CONTAINER_SOURCE_LABELS:
        overrides[source_label] = "container"
    for source_label in IGNORED_SOURCE_LABELS:
        overrides[source_label] = "ignore"
    for class_id, label, _category, aliases in FOOD_CLASSES:
        overrides[label] = class_id
        overrides[class_id] = class_id
        for alias in aliases:
            overrides[alias] = class_id

    return {
        "schema_version": 1,
        "purpose": "v006 detector-only ingredient labels: 80+ food classes plus generic container review.",
        "classes": classes,
        "model_mappings": {
            "coco": {}
        },
        "training_label_mappings": {
            "unmapped_label_policy": "exclude",
            "source_label_overrides": dict(sorted(overrides.items(), key=lambda item: normalize(item[0]))),
            "package_terms": {},
        },
    }


def main() -> None:
    args = parse_args()
    if args.output.exists() and not args.overwrite:
        raise SystemExit(f"{args.output} already exists. Use --overwrite to replace it.")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    payload = build_mapping()
    exact_food_count = sum(1 for entry in payload["classes"] if entry["granularity"] == "exact")
    if exact_food_count < 80:
        raise SystemExit(f"v006 requires at least 80 exact food classes; generated {exact_food_count}.")
    args.output.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(
        json.dumps(
            {
                "label_map": str(args.output),
                "class_count": len(payload["classes"]),
                "exact_food_class_count": exact_food_count,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
