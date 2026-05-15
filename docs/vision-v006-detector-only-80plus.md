# Vision v006 Detector-Only Plan

## Goal

Train the next detector as the primary ingredient identifier:

- no ResNet crop classifier for ingredient identity
- 80+ food/ingredient classes
- generic `container` class for bottles/cans/boxes/cartons that are not obvious ingredients
- users can rename generic containers during review
- do not spend model capacity on spoons, cups, plates, mugs, or other kitchenware

The important product rule is:

```text
detector proposes food/ingredient or container -> user reviews/renames -> inventory stores user-facing item
```

## Why This Is Different From v005b

`chef-detector-v005b-openimages-filtered` performs well against the 8-class object-proposal task it was built for. That is useful for finding reviewable objects, but it does not prove exact ingredient identity.

v006 is a different task:

- v005b: `container`, `produce item`, `unknown` style proposals
- v006: exact food/ingredient classes where the dataset supports them, plus generic `container`

Do not compare v006 and v005b only by raw mAP without remembering that they are trained against different label spaces.

## Main Dataset Choice

Use FoodInsSeg as the main 80+ source because it already has instance annotations and 103 food categories locally:

```text
apps/vision-lab/data/FoodInsSeg/annotations/Train.json
apps/vision-lab/data/FoodInsSeg/images/train
```

Then add:

- `teen-food-ingredient-v1` for extra ingredient boxes and 84 food labels
- `open-images-v7-kitchen-object-proposal-train` only for useful containers and obvious produce

Avoid RPC for v006 by default. Its labels are broad retail categories, which can contaminate exact ingredient training.

## Build Dataset

From the repo root:

```powershell
.\apps\vision-lab\build_detector_v006_foodinsseg.ps1
```

This script runs:

1. `create_v006_detector_label_map.py`
2. `register_detection_dataset.py` for FoodInsSeg COCO annotations
3. `build_detector_training_dataset.py`
4. `report_detector_dataset_quality.py`
5. `create_detector_dataset_visual_qa.py`
6. copies the build into `apps/vision-lab/data/datasets/bounding-box/food-ingredient-yolo`

Outputs:

```text
apps/vision-lab/config/vision-label-mappings-v006-detector.json
apps/vision-lab/data/sources/foodinsseg-ingredient-detection-train-v1/source_manifest.json
apps/vision-lab/data/training-builds/detector/chef-detector-v006-foodinsseg-80plus/
apps/vision-lab/data/datasets/bounding-box/food-ingredient-yolo/
apps/vision-lab/reports/vision/dataset-qa/chef-detector-v006-foodinsseg-80plus/
```

The generated label map currently creates 132 exact food classes plus one generic `container` class. The build may include fewer classes if a source label does not meet the minimum sample threshold.

## Review Before Training

Open:

```text
apps/vision-lab/data/training-builds/detector/chef-detector-v006-foodinsseg-80plus/dataset_quality_report.md
apps/vision-lab/reports/vision/dataset-qa/chef-detector-v006-foodinsseg-80plus/
```

Check:

- class count is actually 80+
- weak classes are not absurdly under-sampled
- boxes are tight enough
- non-food labels did not leak in
- ambiguous classes such as `butter`, `chicken/duck`, or `cilantro/mint` are acceptable for the demo

## Train

Use Modal for the heavy run:

```powershell
.\apps\vision-lab\build_detector_v006_foodinsseg.ps1 -TrainOnModal
```

Or, after the dataset is already built and copied:

```powershell
.\.venv\Scripts\python.exe -m modal run apps\vision-lab\modal_ingredient_detector_training.py `
  --action all `
  --local-data-dir apps\vision-lab\data\datasets\bounding-box\food-ingredient-yolo `
  --run-name yolo11n_ingredient_detector_chef-detector-v006-foodinsseg-80plus `
  --model-name yolo11n.pt `
  --epochs 100 `
  --imgsz 640 `
  --batch 16 `
  --patience 25 `
  --local-output-dir apps\vision-lab\checkpoints\detectors\ingredient
```

Expected checkpoint:

```text
apps/vision-lab/checkpoints/detectors/ingredient/yolo11n_ingredient_detector_chef-detector-v006-foodinsseg-80plus/weights/best.pt
```

## Benchmark

After the checkpoint is downloaded:

```powershell
.\apps\vision-lab\benchmark_detector_v006.ps1
```

For a quick smoke benchmark:

```powershell
.\apps\vision-lab\benchmark_detector_v006.ps1 -LimitImages 200
```

This compares the v006 checkpoint, v005b, v004, and v002 when those checkpoints exist.

For detector-only comparison, read the candidate detector row in each output and ignore the `*_resnet` rows. The benchmark script still produces classifier rows for legacy comparison, but v006 product behavior should not use the classifier.

Reports:

```text
apps/vision-lab/reports/vision/chef-detector-v006-foodinsseg-80plus-benchmark/
```

## Streamlit Test

Start Streamlit:

```powershell
pnpm vision:streamlit
```

In the sidebar:

1. Detector: `yolo`
2. YOLO detector model: choose the v006 `best.pt` path
3. Keep crop classification disabled
4. Use BoundingBox photo/video/live tabs
5. Rename generic `container` detections during review

## Container Naming Rule

The detector should learn:

- exact food where the class is supported: `milk`, `yogurt`, `honey`, `rice`, `salt`, `sugar`, `pasta`, `tomato`, etc.
- generic `container` where the visual object is a bottle/can/box/carton without reliable ingredient identity

Do not add `oil bottle`, `peanut butter jar`, or similar exact packaged classes unless we have enough labeled boxes for those exact categories. Otherwise the model will confidently guess and create worse inventory.

## Missing Pieces

Before calling v006 better, we still need:

- a small kitchen livestream/photo benchmark set
- OCR/barcode path for exact packaged products
- persisted review corrections so user renames become training data
- a benchmark summary that separates exact food accuracy from container review usefulness
