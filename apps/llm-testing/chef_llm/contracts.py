from __future__ import annotations

from enum import Enum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class BudgetMode(str, Enum):
    minimize_cost = "minimize_cost"
    balanced = "balanced"
    premium = "premium"


class MealStyle(str, Enum):
    standard = "standard"
    inventory_first = "inventory_first"
    high_protein = "high_protein"
    low_calorie = "low_calorie"
    meal_prep = "meal_prep"
    quick = "quick"


class MealGenerationRequest(StrictModel):
    meal_prompt: str = Field(..., min_length=2)
    servings_per_meal: int = Field(default=4, ge=1, le=24)
    meals_needed: int = Field(default=1, ge=1, le=21)
    dietary_preferences: list[str] = Field(default_factory=list)
    allergies: list[str] = Field(default_factory=list)
    disliked_ingredients: list[str] = Field(default_factory=list)
    inventory: list[str] = Field(default_factory=list)
    budget_mode: BudgetMode = BudgetMode.balanced
    meal_style: MealStyle = MealStyle.standard
    max_time_minutes: int | None = Field(default=None, ge=5, le=360)
    max_cost_per_serving: float | None = Field(default=None, ge=0)
    quality_goals: list[str] = Field(default_factory=list)
    notes: str = ""


class RecipeStep(StrictModel):
    step: int = Field(..., ge=1)
    what_to_do: str


class DishIngredient(StrictModel):
    canonical_ingredient: str
    amount: float = Field(..., gt=0)
    unit: str
    display_ingredient: str | None = None
    preparation: str | None = None
    optional: bool = False
    group: str | None = None


class NutritionEstimate(StrictModel):
    calories: float | None = None
    protein_g: float | None = None
    carbs_g: float | None = None
    fat_g: float | None = None
    fiber_g: float | None = None
    sodium_mg: float | None = None


class RecipePreview(StrictModel):
    name: str
    cuisine: str
    description: str
    servings: int = Field(..., ge=1)
    ingredients: list[DishIngredient] = Field(..., min_length=1)
    steps: list[RecipeStep] = Field(..., min_length=1)
    tags: list[str] = Field(default_factory=list)
    nutrition_estimate: NutritionEstimate | None = None
    estimated_cost_tier: Literal["low", "medium", "high"] = "medium"
    cost_notes: list[str] = Field(default_factory=list)
    quality_tradeoffs: list[str] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)


class MealGenerationResponse(StrictModel):
    summary: str
    recipes: list[RecipePreview] = Field(..., min_length=1)
    inventory_used: list[str] = Field(default_factory=list)
    cost_minimization_notes: list[str] = Field(default_factory=list)
    planning_notes: list[str] = Field(default_factory=list)


class IngredientSwapRequest(StrictModel):
    recipe: RecipePreview
    ingredient_to_replace: str
    desired_replacement: str
    dietary_preferences: list[str] = Field(default_factory=list)
    inventory: list[str] = Field(default_factory=list)
    budget_mode: BudgetMode = BudgetMode.balanced
    notes: str = ""


class IngredientSwapResponse(StrictModel):
    confirmation_message: str
    original_ingredient: str
    replacement_ingredient: str
    should_apply: bool
    downsides: list[str] = Field(default_factory=list)
    benefits: list[str] = Field(default_factory=list)
    updated_recipe: RecipePreview
    ingredient_delta_notes: list[str] = Field(default_factory=list)


class CartPreviewLine(StrictModel):
    canonical_ingredient: str
    total_amount: float
    unit: str
    action: Literal["buy", "already_have"]
    source_dishes: list[str]
    notes: str = ""


class CartPreview(StrictModel):
    lines: list[CartPreviewLine]
    buy_count: int
    already_have_count: int
