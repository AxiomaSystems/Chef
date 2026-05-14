# Vision Main Convention

Date: 2026-05-08

This document records the current main-product convention for Chef vision after the detector/classifier integration work.

## Current Main Models

Use these as the default main-app pair:

| Role       | Model/run                                                             | Path                                                                                                                                   |
| ---------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Detector   | `yolo11n_ingredient_detector_chef-detector-v005b-openimages-filtered` | `apps/vision-lab/checkpoints/detectors/ingredient/yolo11n_ingredient_detector_chef-detector-v005b-openimages-filtered/weights/best.pt` |
| Classifier | `resnet18_ingredient_crops_5000_modal_frozen_v2`                      | `apps/vision-lab/checkpoints/classifiers/ingredient/resnet18_ingredient_crops_5000_modal_frozen_v2/best_model.pt`                      |

The detector finds object boxes. The classifier only classifies crops from those boxes.

Do not describe ResNet18 as a detector. It cannot find boxes.

## Detector Training Data

The current detector checkpoint was trained from the `chef-detector-v005b-openimages-filtered` YOLO build.

Source manifests:

- `apps/vision-lab/data/sources/open-images-v7-kitchen-object-proposal-train/source_manifest.json`
- `apps/vision-lab/data/sources/teen-food-ingredient-v1/source_manifest.json`

Build manifest:

- `apps/vision-lab/data/training-builds/detector/chef-detector-v005b-openimages-filtered/build_manifest.json`

Build summary:

- 6,614 images
- 4,630 train images
- 992 validation images
- 992 test images
- `object_proposal` strategy
- max box area filter: `0.65`

Internal trained detector classes:

```text
bag
bottle
box
can
carton
egg_carton
produce_item
unknown_kitchen_item
```

## Product-Facing Detector Labels

For the main product, do not expose the full 8-class detector vocabulary as item names.

Runtime detector labels are collapsed to:

```text
container
produce item
unknown
```

Mapping:

| Internal detector labels                              | Product-facing item name |
| ----------------------------------------------------- | ------------------------ |
| `bag`, `bottle`, `box`, `can`, `carton`, `egg_carton` | `container`              |
| `produce_item`                                        | `produce item`           |
| `unknown_kitchen_item`                                | `unknown`                |

This collapse happens in the YOLO adapter at runtime. Do not rename the YOLO dataset `data.yaml` classes for an existing checkpoint unless retraining the model. The checkpoint still depends on its original class ID order.

The raw detector label remains available as `detector_label` for debugging.

## Classifier Training Data

The current classifier is `resnet18_ingredient_crops_5000_modal_frozen_v2`.

Training dataset:

- `apps/vision-lab/data/ingredient_training_dataset_5000`

Source import:

- `apps/vision-lab/data/hf_food_ingredient_training_import_5000`

Dataset summary:

- 100 classes
- 3,404 train crops
- 796 validation crops
- 796 test crops

Recorded metrics:

- best validation accuracy: `0.660804`
- test accuracy: `0.689698`
- test top-5 accuracy: `0.895729`

Classifier predictions are exposed as dropdown options in the inventory review UI.

## Main App Behavior

The inventory vision modal supports:

- photo upload
- video upload
- live camera scan
- crop thumbnails
- annotated detection frames
- grouped review candidates
- discard per detection
- discard per group
- add one reviewed item
- add grouped reviewed items

Main scan policy:

1. Use YOLO to find boxes.
2. Collapse YOLO labels to `container`, `produce item`, or `unknown`.
3. Crop each detected box.
4. Run ResNet18 on each crop.
5. Show ResNet18 top-k labels in a dropdown.
6. Let the user choose a classifier suggestion or type `Other`.
7. Add only the approved label to inventory.

Important: classifier relabeling is disabled by default. The classifier should suggest names, not silently overwrite detector labels.

## API Behavior

The product app calls:

```text
web /api/vision/analyze
  -> Nest /api/v1/vision/detect/media
  -> FastAPI /detect/media
```

Relevant request fields:

| Field                        | Main value                                       |
| ---------------------------- | ------------------------------------------------ |
| `detector`                   | `yolo`                                           |
| `classifier_run`             | `resnet18_ingredient_crops_5000_modal_frozen_v2` |
| `classify_crops`             | `true`                                           |
| `classifier_relabel_enabled` | `false`                                          |
| `use_full_image_fallback`    | `false`                                          |
| `use_grid_fallback`          | `false`                                          |

The response may include:

- `label`: product-facing detector label
- `detector_label`: raw model label
- `classification_predictions`: classifier top-k suggestions
- `thumbnail_data_url`: crop preview for review

## Why This Is The Current Standard

The detector is currently better at finding object-like regions than identifying exact ingredients.

The classifier has broader ingredient vocabulary, but its prediction should be reviewed because crop quality, packaging, lighting, and kitchen clutter can mislead it.

So the product should not pretend the pipeline is fully automatic inventory recognition yet. The reliable pattern is:

```text
detect object -> suggest identity -> user approves -> inventory changes
```

## Known Limits

- The detector is not a fine-grained ingredient detector.
- Generic containers such as oil bottles, peanut butter jars, cans, and boxes need human review.
- OCR/barcode/package text recognition is not yet part of the main flow.
- Live scan classification may be slower than detection-only live scan.
- User corrections are not yet persisted as training feedback.
- Inventory insertion still depends on the authenticated product API path.

## Validation Commands

After the latest convention changes, these passed:

```powershell
pnpm --filter @cart/shared build
pnpm --filter api build
pnpm --filter web build
.\.venv\Scripts\python.exe -m py_compile apps\vision-lab\fastapi_app.py
```
