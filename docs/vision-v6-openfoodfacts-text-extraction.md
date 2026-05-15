# Vision v6: OpenFoodFacts Ingredient Text Lane

## Decision

`openfoodfacts/ingredient-detection` is not a YOLO-style visual detector. It is a text token-classification model trained to detect ingredient-list spans in product text.

That means it should not replace `chef-detector-v005b-openimages-filtered` for Streamlit live camera detection. The useful v6 role is:

1. YOLO detects a reviewable `container`, `produce item`, or `unknown`.
2. A user, OCR step, or future package-text extractor supplies visible package text.
3. The OpenFoodFacts text lane extracts the ingredient-list span from that text.
4. The app splits candidate ingredients for user review.
5. Approved items can be used for inventory or recipe reasoning.

## Why v005b Can Look Better

`chef-detector-v005b-openimages-filtered` is evaluated against the newly built 8-class proposal task. It is therefore better at the task it was trained for: proposing reviewable kitchen objects like containers and produce.

That does not prove it is better at exact ingredient identity. In the benchmark report, classifier relabeling lowered identity accuracy, so the main convention remains:

- detector label is the item name
- classifier predictions are dropdown suggestions
- user approval is required before inventory write

## Streamlit Test Path

Run:

```powershell
pnpm --filter vision-lab run streamlit
```

Open the `OpenFoodFacts Text v6` tab.

Default mode uses a no-download heuristic extractor for fast demo testing. To run the actual Hugging Face model, enable `Use OpenFoodFacts HF model`. Expect a large model download and slower local inference.

## Current Limitation

This lane does not detect objects in images. It needs text input. To make it fully visual, the missing component is OCR or barcode lookup for package labels.

## Better Next Step Than an Immediate 80+ Class Detector

Do not jump straight from 3 product-facing labels to 80+ exact detector classes. A more reliable path is:

1. Keep the 3-label detector for reviewable object proposals.
2. Log user corrections, discards, and selected classifier suggestions.
3. Add OCR/barcode lookup for containers.
4. Train `v006` on 15-25 high-value classes with enough real kitchen boxes.
5. Expand toward 80+ only when each class has enough varied examples and unknown negatives.
