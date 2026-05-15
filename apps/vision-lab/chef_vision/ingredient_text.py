from __future__ import annotations

from dataclasses import asdict, dataclass
import os
import re
from functools import lru_cache
from typing import Any


OPENFOODFACTS_INGREDIENT_DETECTION_MODEL = "openfoodfacts/ingredient-detection"

_INGREDIENT_HEADER_RE = re.compile(
    r"\b(?:ingredients?|ingr[eé]dients?|contains?)\s*[:\-]\s*",
    flags=re.IGNORECASE,
)
_STOP_HEADER_RE = re.compile(
    r"\b(?:nutrition facts|allergen(?:s)?|serving size|directions|storage|best before|"
    r"manufactured|distributed by|warning|may contain)\b",
    flags=re.IGNORECASE,
)


@dataclass(slots=True)
class IngredientTextSpan:
    text: str
    start: int
    end: int
    confidence: float | None
    source: str

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass(slots=True)
class IngredientTextExtraction:
    model_name: str
    mode: str
    spans: list[IngredientTextSpan]
    ingredient_candidates: list[str]
    warnings: list[str]

    def to_dict(self) -> dict:
        return {
            "model_name": self.model_name,
            "mode": self.mode,
            "spans": [span.to_dict() for span in self.spans],
            "ingredient_candidates": self.ingredient_candidates,
            "warnings": self.warnings,
        }


def extract_package_ingredient_text(
    text: str,
    *,
    use_hf_model: bool = False,
    model_name: str = OPENFOODFACTS_INGREDIENT_DETECTION_MODEL,
) -> IngredientTextExtraction:
    cleaned_text = _normalize_text(text)
    warnings: list[str] = []
    spans: list[IngredientTextSpan]
    mode = "heuristic"

    if not cleaned_text:
        return IngredientTextExtraction(
            model_name=model_name,
            mode=mode,
            spans=[],
            ingredient_candidates=[],
            warnings=["No package text was provided."],
        )

    if use_hf_model:
        try:
            spans = _extract_with_hf_model(cleaned_text, model_name=model_name)
            mode = "openfoodfacts_hf_model"
            if not spans:
                warnings.append(
                    "The OpenFoodFacts model returned no ingredient span; heuristic extraction was used as a fallback."
                )
                spans = _extract_with_heuristics(cleaned_text)
                mode = "openfoodfacts_hf_model_with_heuristic_fallback"
        except Exception as exc:  # pragma: no cover - depends on optional local model setup
            warnings.append(f"OpenFoodFacts model unavailable: {exc}")
            warnings.append("Heuristic extraction was used instead.")
            spans = _extract_with_heuristics(cleaned_text)
            mode = "heuristic_fallback"
    else:
        spans = _extract_with_heuristics(cleaned_text)

    candidates = _split_ingredient_candidates([span.text for span in spans])
    return IngredientTextExtraction(
        model_name=model_name,
        mode=mode,
        spans=spans,
        ingredient_candidates=candidates,
        warnings=warnings,
    )


def _normalize_text(text: str) -> str:
    return " ".join(text.replace("\r", "\n").split())


def _extract_with_heuristics(text: str) -> list[IngredientTextSpan]:
    match = _INGREDIENT_HEADER_RE.search(text)
    if not match:
        return []

    start = match.end()
    stop_match = _STOP_HEADER_RE.search(text, pos=start)
    end = stop_match.start() if stop_match else len(text)
    span_text = text[start:end].strip(" .;")
    if not span_text:
        return []

    return [
        IngredientTextSpan(
            text=span_text,
            start=start,
            end=end,
            confidence=None,
            source="heuristic_header",
        )
    ]


def _extract_with_hf_model(text: str, *, model_name: str) -> list[IngredientTextSpan]:
    extractor = _load_hf_token_classifier(model_name)
    predictions = extractor(text)
    spans: list[IngredientTextSpan] = []
    for prediction in predictions:
        entity = str(prediction.get("entity_group") or prediction.get("entity") or "")
        if entity.upper() == "O":
            continue
        start = int(prediction.get("start", 0))
        end = int(prediction.get("end", 0))
        span_text = text[start:end].strip()
        if not span_text:
            continue
        spans.append(
            IngredientTextSpan(
                text=span_text,
                start=start,
                end=end,
                confidence=_round_score(prediction.get("score")),
                source=f"hf:{entity}",
            )
        )
    return _merge_overlapping_spans(spans)


@lru_cache(maxsize=2)
def _load_hf_token_classifier(model_name: str) -> Any:
    try:
        from transformers import pipeline
    except ImportError as exc:  # pragma: no cover - optional dependency
        raise RuntimeError(
            "Install `transformers` to run the OpenFoodFacts ingredient text model locally."
        ) from exc

    token = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_HUB_TOKEN")
    kwargs: dict[str, Any] = {
        "task": "token-classification",
        "model": model_name,
        "tokenizer": model_name,
        "aggregation_strategy": "simple",
    }
    if token:
        kwargs["token"] = token
    return pipeline(**kwargs)


def _merge_overlapping_spans(spans: list[IngredientTextSpan]) -> list[IngredientTextSpan]:
    if not spans:
        return spans
    sorted_spans = sorted(spans, key=lambda span: (span.start, span.end))
    merged = [sorted_spans[0]]
    for span in sorted_spans[1:]:
        previous = merged[-1]
        if span.start <= previous.end + 1:
            previous.text = f"{previous.text} {span.text}".strip()
            previous.end = max(previous.end, span.end)
            if previous.confidence is not None and span.confidence is not None:
                previous.confidence = round((previous.confidence + span.confidence) / 2, 4)
            previous.source = f"{previous.source}+{span.source}"
        else:
            merged.append(span)
    return merged


def _split_ingredient_candidates(spans: list[str]) -> list[str]:
    candidates: list[str] = []
    for span in spans:
        normalized = re.sub(r"\([^)]*\)", " ", span)
        normalized = re.sub(r"\b\d+(?:[.,]\d+)?\s*%", " ", normalized)
        for piece in re.split(r"[,;•]", normalized):
            candidate = " ".join(piece.strip(" .:-").split())
            if not candidate:
                continue
            if len(candidate) < 2:
                continue
            candidates.append(candidate)
    return _dedupe_preserve_order(candidates)


def _dedupe_preserve_order(values: list[str]) -> list[str]:
    seen: set[str] = set()
    output: list[str] = []
    for value in values:
        key = value.casefold()
        if key in seen:
            continue
        seen.add(key)
        output.append(value)
    return output


def _round_score(score: object) -> float | None:
    if score is None:
        return None
    try:
        return round(float(score), 4)
    except (TypeError, ValueError):
        return None
