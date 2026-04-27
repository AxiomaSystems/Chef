from __future__ import annotations

import os
from collections import defaultdict
from pathlib import Path

from .contracts import (
    CartPreview,
    CartPreviewLine,
    IngredientSwapRequest,
    IngredientSwapResponse,
    MealGenerationRequest,
    MealGenerationResponse,
    RecipePreview,
)
from .providers import ChefLLMProvider, build_provider


class ChefLLMEngine:
    def __init__(self, provider: ChefLLMProvider):
        self.provider = provider

    def generate_meals(self, request: MealGenerationRequest) -> MealGenerationResponse:
        return self.provider.generate_structured(
            schema_model=MealGenerationResponse,
            schema_name="chef_meal_generation",
            task=(
                "Generate one or more structured recipe previews from the meal prompt. "
                "Respect dietary preferences, allergies, disliked ingredients, inventory, "
                "meal quantity, budget mode, cooking time, and quality goals. "
                "Use ingredients and steps that can flow into Chef's deterministic cart pipeline."
            ),
            payload={"request": request.model_dump()},
        )

    def propose_ingredient_swap(
        self, request: IngredientSwapRequest
    ) -> IngredientSwapResponse:
        return self.provider.generate_structured(
            schema_model=IngredientSwapResponse,
            schema_name="chef_ingredient_swap",
            task=(
                "Evaluate an ingredient swap. Explain benefits and downsides, then return "
                "an updated recipe preview. Do not silently apply the swap in the UI; the "
                "caller will ask the user to confirm first."
            ),
            payload={"request": request.model_dump()},
        )

    def build_cart_preview(
        self, recipes: list[RecipePreview], inventory: list[str]
    ) -> CartPreview:
        inventory_keys = {_normalize(value) for value in inventory}
        grouped: dict[tuple[str, str], dict] = defaultdict(
            lambda: {"amount": 0.0, "sources": set()}
        )

        for recipe in recipes:
            for ingredient in recipe.ingredients:
                key = (
                    _normalize(ingredient.canonical_ingredient),
                    ingredient.unit.strip().lower(),
                )
                grouped[key]["amount"] += float(ingredient.amount)
                grouped[key]["sources"].add(recipe.name)

        lines: list[CartPreviewLine] = []
        for (ingredient, unit), data in sorted(grouped.items()):
            in_inventory = ingredient in inventory_keys
            lines.append(
                CartPreviewLine(
                    canonical_ingredient=ingredient,
                    total_amount=round(data["amount"], 2),
                    unit=unit,
                    action="already_have" if in_inventory else "buy",
                    source_dishes=sorted(data["sources"]),
                    notes="Matched by canonical ingredient name." if in_inventory else "",
                )
            )

        return CartPreview(
            lines=lines,
            buy_count=sum(1 for line in lines if line.action == "buy"),
            already_have_count=sum(1 for line in lines if line.action == "already_have"),
        )


def build_default_engine() -> ChefLLMEngine:
    try:
        from dotenv import load_dotenv
    except ImportError:
        load_dotenv = None

    if load_dotenv:
        load_dotenv(override=True)
    else:
        _load_local_env_file()
    return ChefLLMEngine(build_provider())


def _normalize(value: str) -> str:
    return " ".join(value.strip().lower().replace("_", " ").split())


def _load_local_env_file() -> None:
    env_path = Path.cwd() / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key:
            os.environ[key] = value
