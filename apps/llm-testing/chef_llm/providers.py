from __future__ import annotations

import json
import os
from abc import ABC, abstractmethod
from copy import deepcopy
from typing import TypeVar

from pydantic import BaseModel, ValidationError

from .contracts import (
    DishIngredient,
    IngredientSwapResponse,
    MealGenerationResponse,
    MealStyle,
    RecipePreview,
    RecipeStep,
)

TModel = TypeVar("TModel", bound=BaseModel)

SYSTEM_PROMPT = """
You are Chef's recipe transformation engine.
Return only structured data that fits the requested schema.
Use Chef domain vocabulary: recipe previews, canonical ingredients, steps,
dietary tags, inventory awareness, and cost tradeoffs.
Do not perform retailer product matching or final price calculation.
Prefer ordinary US grocery availability unless the user asks otherwise.
When substituting ingredients, explain downsides before applying the update.
"""


class ChefLLMProvider(ABC):
    name: str

    @abstractmethod
    def generate_structured(
        self,
        *,
        schema_model: type[TModel],
        schema_name: str,
        task: str,
        payload: dict,
    ) -> TModel:
        raise NotImplementedError


class MockChefLLMProvider(ChefLLMProvider):
    name = "mock"

    def generate_structured(
        self,
        *,
        schema_model: type[TModel],
        schema_name: str,
        task: str,
        payload: dict,
    ) -> TModel:
        if schema_model is MealGenerationResponse:
            return schema_model.model_validate(self._meal_generation(payload))
        if schema_model is IngredientSwapResponse:
            return schema_model.model_validate(self._swap(payload))
        raise ValueError(f"Mock provider does not support {schema_name}")

    def _meal_generation(self, payload: dict) -> dict:
        request = payload.get("request", {})
        prompt = request.get("meal_prompt", "weeknight rice bowl")
        servings = int(request.get("servings_per_meal") or 4)
        meals_needed = int(request.get("meals_needed") or 1)
        inventory = [item.lower() for item in request.get("inventory", [])]
        style = request.get("meal_style", MealStyle.standard.value)
        budget_mode = request.get("budget_mode", "balanced")

        base_name = prompt.strip().title() or "Chef Test Meal"
        recipe_count = 1 if meals_needed <= 2 else min(3, meals_needed)
        recipes = []

        for index in range(recipe_count):
            protein = "chicken breast"
            if "vegan" in " ".join(request.get("dietary_preferences", [])).lower():
                protein = "chickpeas"
            elif style == MealStyle.high_protein.value:
                protein = "lean turkey"

            grain = "rice" if "rice" in inventory else "brown rice"
            vegetable = "frozen mixed vegetables" if budget_mode == "minimize_cost" else "bell pepper"

            recipes.append(
                RecipePreview(
                    name=base_name if recipe_count == 1 else f"{base_name} Variation {index + 1}",
                    cuisine="Flexible",
                    description=f"A structured test recipe for {prompt}.",
                    servings=servings,
                    ingredients=[
                        DishIngredient(canonical_ingredient=protein, amount=1.25, unit="lb"),
                        DishIngredient(canonical_ingredient=grain, amount=1.5, unit="cup"),
                        DishIngredient(canonical_ingredient=vegetable, amount=2, unit="cup"),
                        DishIngredient(canonical_ingredient="olive oil", amount=2, unit="tbsp"),
                        DishIngredient(canonical_ingredient="garlic", amount=3, unit="clove"),
                    ],
                    steps=[
                        RecipeStep(step=1, what_to_do=f"Prep ingredients for {prompt}."),
                        RecipeStep(step=2, what_to_do="Cook the protein and aromatics until browned."),
                        RecipeStep(step=3, what_to_do="Fold in vegetables and grain, then season to taste."),
                    ],
                    tags=["test", style, budget_mode],
                    estimated_cost_tier="low" if budget_mode == "minimize_cost" else "medium",
                    cost_notes=["Mock mode uses staple-friendly ingredients for predictable testing."],
                    quality_tradeoffs=["This is a deterministic placeholder, not culinary advice."],
                    assumptions=["Generated locally without calling a model."],
                ).model_dump()
            )

        return MealGenerationResponse(
            summary=f"Generated {len(recipes)} structured recipe preview(s) for {meals_needed} meal(s).",
            recipes=recipes,
            inventory_used=[item for item in inventory if item in {"rice", "olive oil", "garlic"}],
            cost_minimization_notes=[
                "Use frozen vegetables and pantry grains when minimizing cost."
            ],
            planning_notes=[
                "Mock mode is useful for UI and schema testing before using paid providers."
            ],
        ).model_dump()

    def _swap(self, payload: dict) -> dict:
        request = payload.get("request", {})
        recipe = RecipePreview.model_validate(request["recipe"])
        old = request.get("ingredient_to_replace", "").strip().lower()
        new = request.get("desired_replacement", "").strip().lower() or "suggested substitute"

        ingredients = []
        replaced = False
        for ingredient in recipe.ingredients:
            if not replaced and old in ingredient.canonical_ingredient.lower():
                ingredients.append(
                    ingredient.model_copy(
                        update={
                            "canonical_ingredient": new,
                            "display_ingredient": new,
                            "preparation": ingredient.preparation,
                        }
                    )
                )
                replaced = True
            else:
                ingredients.append(ingredient)

        updated = recipe.model_copy(
            update={
                "name": f"{recipe.name} with {new}",
                "ingredients": ingredients,
                "quality_tradeoffs": recipe.quality_tradeoffs
                + [f"Swapping {old} for {new} may change flavor, texture, or cook time."],
            }
        )

        return IngredientSwapResponse(
            confirmation_message=f"Replace {old or 'the selected ingredient'} with {new}?",
            original_ingredient=old,
            replacement_ingredient=new,
            should_apply=True,
            downsides=[
                "Flavor and texture may shift.",
                "Cooking time may need a small adjustment.",
            ],
            benefits=["Uses the requested replacement while preserving the recipe structure."],
            updated_recipe=updated,
            ingredient_delta_notes=[f"Changed one ingredient line from {old} to {new}."],
        ).model_dump()


class OpenAIProvider(ChefLLMProvider):
    name = "openai"

    def __init__(self, model: str | None = None):
        self.model = model or os.getenv("OPENAI_MODEL", "gpt-5.4-mini")

    def generate_structured(
        self,
        *,
        schema_model: type[TModel],
        schema_name: str,
        task: str,
        payload: dict,
    ) -> TModel:
        try:
            from openai import OpenAI
        except ImportError as exc:
            raise RuntimeError("Install the openai package to use OpenAIProvider.") from exc

        client = OpenAI()
        response = client.responses.create(
            model=self.model,
            input=[
                {"role": "system", "content": SYSTEM_PROMPT.strip()},
                {
                    "role": "user",
                    "content": json.dumps({"task": task, "payload": payload}, indent=2),
                },
            ],
            text={
                "format": {
                    "type": "json_schema",
                    "name": schema_name,
                    "schema": _to_openai_strict_schema(schema_model),
                    "strict": True,
                }
            },
        )
        return _parse_model(schema_model, response.output_text)


class AnthropicProvider(ChefLLMProvider):
    name = "anthropic"

    def __init__(self, model: str | None = None):
        self.model = model or os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6")

    def generate_structured(
        self,
        *,
        schema_model: type[TModel],
        schema_name: str,
        task: str,
        payload: dict,
    ) -> TModel:
        try:
            import anthropic
        except ImportError as exc:
            raise RuntimeError("Install the anthropic package to use AnthropicProvider.") from exc

        client = anthropic.Anthropic()
        response = client.messages.create(
            model=self.model,
            max_tokens=4096,
            system=SYSTEM_PROMPT.strip(),
            messages=[
                {
                    "role": "user",
                    "content": json.dumps({"task": task, "payload": payload}, indent=2),
                }
            ],
            output_config={
                "format": {
                    "type": "json_schema",
                    "schema": schema_model.model_json_schema(),
                }
            },
        )
        text = "".join(
            getattr(block, "text", "")
            for block in getattr(response, "content", [])
            if getattr(block, "type", "") == "text"
        )
        return _parse_model(schema_model, text)


def build_provider() -> ChefLLMProvider:
    provider = os.getenv("CHEF_LLM_PROVIDER", "mock").strip().lower()
    if provider == "openai":
        return OpenAIProvider()
    if provider == "anthropic":
        return AnthropicProvider()
    return MockChefLLMProvider()


def _parse_model(schema_model: type[TModel], raw_text: str) -> TModel:
    try:
        return schema_model.model_validate_json(raw_text)
    except ValidationError:
        raise
    except Exception as exc:
        try:
            return schema_model.model_validate(json.loads(raw_text))
        except Exception:
            raise RuntimeError(f"Provider returned invalid structured output: {raw_text[:500]}") from exc


def _to_openai_strict_schema(schema_model: type[BaseModel]) -> dict:
    schema = deepcopy(schema_model.model_json_schema())
    _normalize_openai_strict_object(schema)
    return schema


def _normalize_openai_strict_object(node: object) -> None:
    if isinstance(node, list):
        for item in node:
            _normalize_openai_strict_object(item)
        return

    if not isinstance(node, dict):
        return

    node.pop("default", None)

    properties = node.get("properties")
    if isinstance(properties, dict):
        node["required"] = list(properties.keys())
        node["additionalProperties"] = False
        for property_schema in properties.values():
            _normalize_openai_strict_object(property_schema)

    for key in ("$defs", "definitions"):
        definitions = node.get(key)
        if isinstance(definitions, dict):
            for definition_schema in definitions.values():
                _normalize_openai_strict_object(definition_schema)

    for key in ("items", "anyOf", "oneOf", "allOf"):
        if key in node:
            _normalize_openai_strict_object(node[key])
