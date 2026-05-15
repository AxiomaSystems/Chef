from __future__ import annotations

import unittest

from chef_vision.ingredient_text import extract_package_ingredient_text


class IngredientTextExtractionTests(unittest.TestCase):
    def test_extracts_ingredients_after_header(self) -> None:
        result = extract_package_ingredient_text(
            "Ingredients: peanuts, sugar, vegetable oil, salt. Allergens: contains peanuts.",
        )

        self.assertEqual(result.mode, "heuristic")
        self.assertEqual(len(result.spans), 1)
        self.assertEqual(
            result.ingredient_candidates,
            ["peanuts", "sugar", "vegetable oil", "salt"],
        )

    def test_returns_no_span_without_header(self) -> None:
        result = extract_package_ingredient_text("Peanut butter smooth 454g")

        self.assertEqual(result.spans, [])
        self.assertEqual(result.ingredient_candidates, [])


if __name__ == "__main__":
    unittest.main()
