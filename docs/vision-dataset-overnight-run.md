# Vision Dataset Overnight Run

This is the fastest repeatable path for improving detector recall when the model misses multiple ingredients, chopped ingredients, jars, boxes, cartons, and pantry objects.

## Critical Choice

Use detection datasets first.

```text
bounding boxes > classification-only images
```

Classification datasets cannot teach YOLO where multiple objects are in one image. They are useful later for crop relabeling, but they do not fix missed boxes.

## Sources Pulled By The Overnight Script

The script imports three complementary sources:

1. `Teen-Different/Food-Ingredient`
   - Ingredient images with Pascal/VOC-style XML boxes.
   - Imported through `import_hf_food_ingredient.py` because plain `load_dataset("Teen-Different/Food-Ingredient")` is known to fail for this dataset.

2. `EduardoPacheco/FoodSeg103`
   - Food/ingredient images with semantic masks.
   - Converted into detection boxes only.
   - Useful for overhead/chopped/served ingredient appearances.
   - This does not reopen segmentation as the product path.

3. `benjamintli/retail-product-checkout`
   - Packaged retail product boxes.
   - Useful for jars, cartons, cans, dense packaged objects, and “something is here” recall.
   - Labels are coarse and should mostly route through canonical mapping or review.
   - License is non-commercial research oriented; confirm usage before production use.

## One Command: Download And Build Dataset

From repo root:

```powershell
.\apps\vision-lab\overnight_detector_data_pipeline.ps1
```

This downloads/imports data, creates source manifests, builds a canonicalized YOLO dataset, and creates a label review packet.

Output:

```text
apps/vision-lab/data/datasets/bounding-box/food-ingredient-yolo/
apps/vision-lab/data/training-builds/detector/chef-detector-v002/
```

Review:

```text
apps/vision-lab/data/training-builds/detector/chef-detector-v002/label_map_report.json
apps/vision-lab/data/training-builds/detector/chef-detector-v002/canonical_label_review.json
```

## One Command: Download, Build, Train On Modal

This spends Modal GPU credits.

```powershell
.\apps\vision-lab\overnight_detector_data_pipeline.ps1 -TrainOnModal
```

The script uploads the generated dataset, trains YOLO on Modal, and downloads the checkpoint into:

```text
apps/vision-lab/checkpoints/detectors/ingredient/yolo11n_ingredient_detector_chef-detector-v002/weights/best.pt
```

## Tunable Run Sizes

For a cheaper smoke run:

```powershell
.\apps\vision-lab\overnight_detector_data_pipeline.ps1 `
  -TeenSamplesPerLabel 5 `
  -TeenMaxLabels 20 `
  -FoodSegLimit 200 `
  -RpcLimit 300
```

For a larger overnight run:

```powershell
.\apps\vision-lab\overnight_detector_data_pipeline.ps1 `
  -TeenSamplesPerLabel 75 `
  -TeenMaxLabels 100 `
  -FoodSegLimit 4500 `
  -RpcLimit 12000 `
  -TrainOnModal
```

For the v3 high-recall detector/classifier path:

```powershell
.\apps\vision-lab\overnight_detector_data_pipeline.ps1 `
  -BuildId chef-detector-v003 `
  -DetectorClassStrategy broad `
  -TrainOnModal
```

Use `canonical` when you want detector labels to be inventory labels. Use `broad` when you want the detector to find boxes first and let the crop classifier/resolver decide the exact ingredient/package identity.

Use `object_proposal` when you want the most rudimentary high-recall detector labels:

```text
bottle
jar
can
box
bag
carton
packet
produce_item
cup
bowl
plate
```

This is the right path when the detector should see non-ingredients too. The ontology then decides whether each detection should be tracked, reviewed, or ignored.

## What To Check In The Morning

Open:

```text
apps/vision-lab/data/training-builds/detector/chef-detector-v002/label_map_report.json
```

Look for:

- high-value labels that were excluded
- packaged labels routed to `unknown_packaged_food`
- ingredient labels mapped to wrong canonical classes
- class imbalance from RPC packaged products

If many useful labels are excluded, create/edit mappings in:

```text
packages/shared/vision-label-mappings.json
```

Then rerun the build step or rerun the full script.

## Resume After Upload

If the local dataset upload succeeded but Modal training failed before YOLO started, do not rebuild the whole dataset. Resume from the uploaded Modal volume:

```powershell
$env:PYTHONIOENCODING="utf-8"
.\.venv\Scripts\python.exe -m modal run apps\vision-lab\modal_ingredient_detector_training.py `
  --action train `
  --run-name yolo11n_ingredient_detector_chef-detector-v002 `
  --model-name yolo11n.pt `
  --epochs 75 `
  --imgsz 640 `
  --batch 16 `
  --patience 20
```

Then download:

```powershell
$env:PYTHONIOENCODING="utf-8"
.\.venv\Scripts\python.exe -m modal run apps\vision-lab\modal_ingredient_detector_training.py `
  --action download `
  --run-name yolo11n_ingredient_detector_chef-detector-v002 `
  --local-output-dir apps\vision-lab\checkpoints\detectors\ingredient
```

## Why This Is Structured This Way

Raw datasets stay separate:

```text
apps/vision-lab/data/sources/<source-id>/source_manifest.json
```

Training builds are generated:

```text
apps/vision-lab/data/training-builds/detector/<build-id>/
```

The actual YOLO training path uses:

```text
apps/vision-lab/data/datasets/bounding-box/food-ingredient-yolo/
```

Do not manually merge images or annotation files across datasets. That destroys provenance and makes model failures hard to debug.
