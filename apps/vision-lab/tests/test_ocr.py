from __future__ import annotations

import unittest

from chef_vision.ocr import suggest_label_from_text


class OcrLabelSuggestionTests(unittest.TestCase):
    def test_prefers_known_food_container_terms(self) -> None:
        self.assertEqual(
            suggest_label_from_text("Nutrition Facts\nExtra Virgin Olive Oil\n500 ml"),
            "olive oil",
        )
        self.assertEqual(
            suggest_label_from_text("CREAMY Peanut Butter\nIngredients peanuts salt"),
            "peanut butter",
        )
        self.assertEqual(suggest_label_from_text("PEANUTBUTTER"), "peanut butter")

    def test_returns_reviewable_line_when_no_keyword_matches(self) -> None:
        self.assertEqual(suggest_label_from_text("Acme Pantry Mix\nServing size 30g"), "Acme Pantry Mix")


if __name__ == "__main__":
    unittest.main()
