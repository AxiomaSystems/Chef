from __future__ import annotations

import json
import os

import streamlit as st

from chef_llm import build_default_engine
from chef_llm.contracts import (
    BudgetMode,
    IngredientSwapRequest,
    MealGenerationRequest,
    MealStyle,
    RecipePreview,
)


st.set_page_config(page_title="Chef LLM Testing Lab", layout="wide")


def csvish(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


def recipe_to_table(recipe: RecipePreview) -> list[dict]:
    return [
        {
            "ingredient": ingredient.canonical_ingredient,
            "amount": ingredient.amount,
            "unit": ingredient.unit,
            "preparation": ingredient.preparation or "",
            "optional": ingredient.optional,
        }
        for ingredient in recipe.ingredients
    ]


def replace_recipe(index: int, recipe: RecipePreview) -> None:
    recipes = list(st.session_state.get("recipes", []))
    recipes[index] = recipe
    st.session_state["recipes"] = recipes


engine = build_default_engine()

st.title("Chef LLM Testing Lab")
st.caption(
    "Structured recipe generation, swap confirmation, and cart-preview testing for Chef."
)

with st.sidebar:
    st.header("Provider")
    st.write(f"Active provider: `{engine.provider.name}`")
    st.write(f"CHEF_LLM_PROVIDER: `{os.getenv('CHEF_LLM_PROVIDER', 'mock')}`")
    if engine.provider.name == "openai":
        st.write(f"OPENAI_MODEL: `{os.getenv('OPENAI_MODEL', 'gpt-5.4-mini')}`")
    if engine.provider.name == "anthropic":
        st.write(f"ANTHROPIC_MODEL: `{os.getenv('ANTHROPIC_MODEL', 'claude-sonnet-4-6')}`")
    st.divider()
    st.write("Use `mock` for local schema/UI testing before spending tokens.")

left, right = st.columns([0.9, 1.1], gap="large")

with left:
    st.subheader("Meal Context")
    meal_prompt = st.text_area(
        "Meal, craving, or weekly planning request",
        value="Cheap high-protein chicken burrito bowls for weekday lunches",
        height=100,
    )

    servings_per_meal = st.number_input("Servings per meal", 1, 24, 4)
    meals_needed = st.number_input("Meals needed", 1, 21, 5)
    budget_mode = st.selectbox(
        "Budget mode",
        [mode.value for mode in BudgetMode],
        index=0,
    )
    meal_style = st.selectbox(
        "Output style",
        [style.value for style in MealStyle],
        index=0,
    )
    max_time = st.number_input("Max time minutes", 5, 360, 45)
    max_cost = st.number_input("Max cost per serving", 0.0, 50.0, 4.5, 0.5)

    dietary_preferences = st.text_input(
        "Dietary preferences",
        value="high protein",
        placeholder="halal, vegetarian, gluten-free",
    )
    allergies = st.text_input("Allergies", placeholder="peanuts, shellfish")
    disliked = st.text_input("Disliked ingredients", placeholder="mushrooms, cilantro")
    inventory = st.text_input(
        "Inventory / already have",
        value="rice, olive oil, garlic, salt",
        placeholder="rice, eggs, milk",
    )
    quality_goals = st.text_input(
        "Food qualities to optimize",
        value="filling, reheats well, not bland",
    )
    notes = st.text_area(
        "Extra context",
        value="Minimize new groceries and keep the output easy to meal prep.",
        height=80,
    )

    if st.button("Generate Structured Recipe(s)", type="primary", use_container_width=True):
        request = MealGenerationRequest(
            meal_prompt=meal_prompt,
            servings_per_meal=int(servings_per_meal),
            meals_needed=int(meals_needed),
            dietary_preferences=csvish(dietary_preferences),
            allergies=csvish(allergies),
            disliked_ingredients=csvish(disliked),
            inventory=csvish(inventory),
            budget_mode=BudgetMode(budget_mode),
            meal_style=MealStyle(meal_style),
            max_time_minutes=int(max_time),
            max_cost_per_serving=float(max_cost) if max_cost else None,
            quality_goals=csvish(quality_goals),
            notes=notes,
        )
        with st.spinner("Generating structured recipe data..."):
            try:
                result = engine.generate_meals(request)
            except Exception as exc:
                st.error(str(exc))
            else:
                st.session_state["request"] = request
                st.session_state["generation_result"] = result
                st.session_state["recipes"] = result.recipes
                st.session_state.pop("swap_response", None)

with right:
    result = st.session_state.get("generation_result")
    recipes: list[RecipePreview] = st.session_state.get("recipes", [])

    st.subheader("Generated Output")
    if not recipes:
        st.info("Generate a meal to see recipe previews, swaps, and cart lines.")
    else:
        if result:
            st.write(result.summary)
            if result.planning_notes:
                st.caption(" ".join(result.planning_notes))

        tabs = st.tabs([recipe.name for recipe in recipes])
        for index, tab in enumerate(tabs):
            recipe = recipes[index]
            with tab:
                st.markdown(f"**{recipe.description}**")
                st.write(
                    {
                        "cuisine": recipe.cuisine,
                        "servings": recipe.servings,
                        "tags": recipe.tags,
                        "estimated_cost_tier": recipe.estimated_cost_tier,
                    }
                )
                st.dataframe(recipe_to_table(recipe), use_container_width=True)
                st.markdown("**Steps**")
                for step in recipe.steps:
                    st.write(f"{step.step}. {step.what_to_do}")
                if recipe.cost_notes:
                    st.markdown("**Cost notes**")
                    st.write(recipe.cost_notes)
                if recipe.quality_tradeoffs:
                    st.markdown("**Quality tradeoffs**")
                    st.write(recipe.quality_tradeoffs)

        st.download_button(
            "Download recipe JSON",
            data=json.dumps([recipe.model_dump() for recipe in recipes], indent=2),
            file_name="chef-recipes.json",
            mime="application/json",
            use_container_width=True,
        )

st.divider()

recipes = st.session_state.get("recipes", [])
if recipes:
    swap_col, cart_col = st.columns(2, gap="large")

    with swap_col:
        st.subheader("Ingredient Swap")
        recipe_names = [recipe.name for recipe in recipes]
        recipe_index = st.selectbox(
            "Recipe to edit",
            range(len(recipe_names)),
            format_func=lambda idx: recipe_names[idx],
        )
        selected_recipe = recipes[recipe_index]
        ingredient_names = [
            ingredient.canonical_ingredient for ingredient in selected_recipe.ingredients
        ]
        ingredient_to_replace = st.selectbox("Ingredient", ingredient_names)
        desired_replacement = st.text_input("Desired replacement", value="black beans")
        swap_notes = st.text_area(
            "Swap context",
            value="Keep the meal affordable and preserve protein.",
            height=80,
        )

        if st.button("Ask AI For Swap Proposal", use_container_width=True):
            base_request = st.session_state.get("request")
            request = IngredientSwapRequest(
                recipe=selected_recipe,
                ingredient_to_replace=ingredient_to_replace,
                desired_replacement=desired_replacement,
                dietary_preferences=base_request.dietary_preferences if base_request else [],
                inventory=csvish(inventory),
                budget_mode=BudgetMode(budget_mode),
                notes=swap_notes,
            )
            with st.spinner("Evaluating swap and downsides..."):
                try:
                    st.session_state["swap_response"] = engine.propose_ingredient_swap(
                        request
                    )
                    st.session_state["swap_recipe_index"] = recipe_index
                except Exception as exc:
                    st.error(str(exc))

        swap_response = st.session_state.get("swap_response")
        if swap_response:
            st.markdown(f"**{swap_response.confirmation_message}**")
            st.markdown("**Downsides**")
            st.write(swap_response.downsides)
            st.markdown("**Benefits**")
            st.write(swap_response.benefits)
            st.markdown("**Ingredient delta**")
            st.write(swap_response.ingredient_delta_notes)

            if st.button("Confirm And Apply Swap", type="primary", use_container_width=True):
                replace_recipe(
                    st.session_state.get("swap_recipe_index", recipe_index),
                    swap_response.updated_recipe,
                )
                st.session_state.pop("swap_response", None)
                st.rerun()

    with cart_col:
        st.subheader("Cart Preview")
        current_request = st.session_state.get("request")
        inventory_items = current_request.inventory if current_request else csvish(inventory)
        cart_preview = engine.build_cart_preview(recipes, inventory_items)
        st.metric("Buy", cart_preview.buy_count)
        st.metric("Already have", cart_preview.already_have_count)
        st.dataframe(
            [line.model_dump() for line in cart_preview.lines],
            use_container_width=True,
        )
        st.download_button(
            "Download cart preview JSON",
            data=cart_preview.model_dump_json(indent=2),
            file_name="chef-cart-preview.json",
            mime="application/json",
            use_container_width=True,
        )
