# Vision Dataset and Classification Status

This document summarizes the current Chef vision-lab work: ingredient dataset import, crop classification, Streamlit testing, Modal GPU training support, and the next detector-training path.

## Current Direction

The practical runtime flow is now:

```text
image
  -> propose all likely food/object regions
  -> crop each region
  -> classify each crop against ingredient labels
  -> return ranked candidates for review
```

The important correction from the first prototype is that the app should not stop after the first detected object. It should return all reasonable food crops in the frame. Generic COCO YOLO is only a temporary crop proposer; it can miss herbs, leafy greens, small loose ingredients, and food classes that are not in COCO.

Current product stance:

- Use the model for review candidates, not automatic inventory writes.
- Track top-1 and top-5 accuracy.
- Treat detection quality and classification quality as separate problems.
- Train/infer expensive workloads on Modal GPU, not the local CPU machine.

## Current Pipeline

Offline training path:

```text
Teen-Different/Food-Ingredient archive
  -> import images, labels, and XML boxes
  -> prepare train/validation/test splits
  -> train ResNet18 ingredient classifier on crops
  -> evaluate top-1, top-5, per-class accuracy, and confusions
```

Runtime testing path:

```text
uploaded image
  -> YOLO all detections
  -> optional grid fallback crops
  -> ResNet18 ingredient classifier
  -> crop cards, overlay, and JSON result in Streamlit
```

Detector improvement path:

```text
imported XML boxes
  -> YOLO detection dataset
  -> Modal A10G YOLO detector training
  -> use trained detector checkpoint as the Streamlit crop proposer
```

## What Has Been Implemented

### Dataset Import

Importer:

```text
apps/vision-lab/import_hf_food_ingredient.py
```

What it does:

- Imports `Teen-Different/Food-Ingredient`.
- Supports direct ZIP archive import to bypass the broken Hugging Face `datasets` split builder.
- Preserves labels and Pascal/VOC-style XML annotations when present.
- Supports `--limit`, `--seed`, `--samples-per-label`, and `--max-labels`.

The regular `datasets.load_dataset()` path failed because the dataset builder emits an invalid class label like:

```text
Food-Ingredient@223495dd06ad46af9e63e6b62a0e4192c332ef49
```

So the archive-based importer is the right path for this dataset.

### Classifier Dataset Preparation

Script:

```text
apps/vision-lab/prepare_ingredient_training_data.py
```

What it does:

- Builds an ImageFolder-style dataset.
- Uses imported XML bounding boxes when available.
- Falls back to full image or YOLO crop behavior depending on flags.
- Creates train/validation/test splits with configurable ratios.
- Lets experiments control dataset size, for example 300 images or 5000 images.
- Writes `manifest.json`, `manifest.csv`, and `class_map.json`.

Output shape:

```text
apps/vision-lab/data/ingredient_training_dataset/
  train/<label>/*.jpg
  val/<label>/*.jpg
  test/<label>/*.jpg
```

### Ingredient Classifier Training

Scripts:

```text
apps/vision-lab/train_ingredient_classifier.py
apps/vision-lab/evaluate_ingredient_classifier.py
apps/vision-lab/modal_ingredient_training.py
apps/vision-lab/modal_ingredient_inference.py
```

What they do:

- Train a ResNet18 transfer-learning classifier.
- Support frozen-backbone training.
- Print epoch progress and batch progress.
- Save the best validation checkpoint.
- Evaluate on a held-out test split.
- Write `metrics.json`, `class_names.txt`, and prediction artifacts.
- Run training/inference on Modal GPU when requested.

### Streamlit Classifier Testing

App:

```text
apps/vision-lab/app.py
```

The `Ingredient Classifier` tab now:

- Loads local classifier checkpoints from `apps/vision-lab/data/ingredient_classifier_runs`.
- Defaults to `resnet18_ingredient_crops_5000_modal_frozen` when present.
- Shows saved test metrics from `metrics.json`.
- Accepts uploaded images.
- Supports:
  - `YOLO all object crops`
  - `YOLO all + grid fallback`
  - `Grid fallback crops`
  - `YOLO first object crop`
  - `Full image`
- Shows every crop sent to the classifier.
- Shows top-k predictions and probabilities.
- Shows an annotated overlay and JSON result.
- Does not train, call Modal, or write inventory.

The key fix here is all-crop behavior. The first-object-only path is still available for comparison, but it should not be the default mental model for the product.

### Ingredient Detector Training Setup

Scripts:

```text
apps/vision-lab/prepare_ingredient_detection_data.py
apps/vision-lab/train_yolo_ingredient_detector.py
apps/vision-lab/modal_ingredient_detector_training.py
```

What they do:

- Convert imported XML annotations into a YOLO detection dataset.
- Train YOLO locally only when a real CUDA GPU is available.
- Train YOLO on Modal A10G for normal use.
- Upload/download detector datasets and training artifacts through Modal.
- Normalize `data.yaml` paths inside Modal so Windows paths do not break remote training.

Output shape:

```text
apps/vision-lab/data/ingredient_detection_dataset/
  data.yaml
  images/train/*.jpg
  images/val/*.jpg
  images/test/*.jpg
  labels/train/*.txt
  labels/val/*.txt
  labels/test/*.txt
```

Generated data and model artifacts are ignored by git.

## Current Measured Results

### Local CPU Baseline

```text
run: resnet18_ingredient_crops_2500
device: cpu
classes: 100
images: 2500
train/val/test: 1700/400/400
epochs: 8
best validation accuracy: 0.380
test top-1 accuracy: 0.325
test top-5 accuracy: 0.6525
```

This was not good enough. It proved the pipeline worked, but it was too weak for product use.

### Modal Full Fine-Tune

```text
run: resnet18_ingredient_crops_5000_modal
device: cuda on Modal A10G
classes: 100
images: 4996
train/val/test: 3404/796/796
epochs: 18
best validation accuracy: 0.596734
test top-1 accuracy: 0.603015
test top-5 accuracy: 0.840452
```

### Modal Frozen Backbone

```text
run: resnet18_ingredient_crops_5000_modal_frozen
device: cuda on Modal A10G
classes: 100
images: 4996
train/val/test: 3404/796/796
epochs: 18
best validation accuracy: 0.653266
test top-1 accuracy: 0.685930
test top-5 accuracy: 0.880653
```

The frozen-backbone run is the current best classifier. It generalizes better than the full fine-tune, which likely means the dataset is still too small or too narrow for full backbone updates.

This is useful for a review UI, but still not reliable enough for automatic inventory mutation.

## Important Limitations

- Generic COCO YOLO is not ingredient-aware.
- The classifier only classifies crops it receives. If the detector misses parsley, the classifier never gets a parsley crop.
- The current imported label set includes herbs like `basil`, `cilantro`, `rosemary`, and `spinach`, but not `parsley`.
- Training an ingredient detector will improve crop proposals, but it will not create missing classes.
- Grid fallback is diagnostic. It can reveal missed regions, but it is noisy and should not be treated as a production detector.
- Accuracy on curated dataset images may be higher than accuracy on real fridge, pantry, and counter photos.
- Use validation accuracy for tuning; use test accuracy only for final reporting.

## Commands For Current Workflow

Install dependencies:

```powershell
.\.venv\Scripts\python.exe -m pip install -r apps\vision-lab\requirements.txt
```

Run Streamlit:

```powershell
.\.venv\Scripts\python.exe -m streamlit run apps\vision-lab\app.py
```

Import a balanced classification dataset:

```powershell
.\.venv\Scripts\python.exe apps\vision-lab\import_hf_food_ingredient.py `
  --full `
  --samples-per-label 25 `
  --max-labels 100 `
  --seed 42 `
  --output-dir apps\vision-lab\data\hf_food_ingredient_training_import
```

Prepare classifier data with a configurable limit:

```powershell
.\.venv\Scripts\python.exe apps\vision-lab\prepare_ingredient_training_data.py `
  --dataset-dir apps\vision-lab\data\hf_food_ingredient_training_import `
  --output-dir apps\vision-lab\data\ingredient_training_dataset `
  --limit 5000 `
  --val-ratio 0.15 `
  --test-ratio 0.15 `
  --fallback full-image `
  --overwrite
```

Train classifier locally only for small CPU experiments:

```powershell
.\.venv\Scripts\python.exe apps\vision-lab\train_ingredient_classifier.py `
  --data-dir apps\vision-lab\data\ingredient_training_dataset `
  --run-name resnet18_ingredient_crops_5000 `
  --epochs 12 `
  --batch-size 32 `
  --device auto
```

Train classifier on Modal GPU:

```powershell
$env:PYTHONIOENCODING="utf-8"
.\.venv\Scripts\python.exe -m modal run apps\vision-lab\modal_ingredient_training.py `
  --action train `
  --run-name resnet18_ingredient_crops_5000_modal_frozen `
  --epochs 18 `
  --batch-size 64 `
  --learning-rate 0.001 `
  --weight-decay 0.0001 `
  --num-workers 2 `
  --freeze-backbone
```

Prepare YOLO detector data:

```powershell
.\.venv\Scripts\python.exe apps\vision-lab\prepare_ingredient_detection_data.py `
  --dataset-dir apps\vision-lab\data\hf_food_ingredient_training_import_5000 `
  --output-dir apps\vision-lab\data\ingredient_detection_dataset `
  --overwrite
```

Upload detector data to Modal:

```powershell
$env:PYTHONIOENCODING="utf-8"
.\.venv\Scripts\python.exe -m modal run apps\vision-lab\modal_ingredient_detector_training.py `
  --action upload `
  --local-data-dir apps\vision-lab\data\ingredient_detection_dataset
```

Train detector on Modal GPU:

```powershell
$env:PYTHONIOENCODING="utf-8"
.\.venv\Scripts\python.exe -m modal run apps\vision-lab\modal_ingredient_detector_training.py `
  --action train `
  --run-name yolo11n_ingredient_detector_modal `
  --model-name yolo11n.pt `
  --epochs 75 `
  --imgsz 640 `
  --batch 16 `
  --patience 20
```

Download detector artifacts:

```powershell
$env:PYTHONIOENCODING="utf-8"
.\.venv\Scripts\python.exe -m modal run apps\vision-lab\modal_ingredient_detector_training.py `
  --action download `
  --run-name yolo11n_ingredient_detector_modal `
  --local-output-dir apps\vision-lab\data\ingredient_detector_runs
```

After detector training, point the Streamlit sidebar `YOLO model` field at:

```text
apps/vision-lab/data/ingredient_detector_runs/yolo11n_ingredient_detector_modal/weights/best.pt
```

Then test with:

```text
Ingredient Classifier -> Classification input -> YOLO all object crops
```

## Files To Include In Push

Tracked source/docs changes should include:

```text
.gitignore
apps/vision-lab/requirements.txt
apps/vision-lab/app.py
apps/vision-lab/import_hf_food_ingredient.py
apps/vision-lab/classify_first_object.py
apps/vision-lab/prepare_ingredient_training_data.py
apps/vision-lab/train_ingredient_classifier.py
apps/vision-lab/evaluate_ingredient_classifier.py
apps/vision-lab/modal_ingredient_training.py
apps/vision-lab/modal_ingredient_inference.py
apps/vision-lab/prepare_ingredient_detection_data.py
apps/vision-lab/train_yolo_ingredient_detector.py
apps/vision-lab/modal_ingredient_detector_training.py
docs/vision-dataset-classification-status.md
```

Generated data/model folders should stay out of git:

```text
apps/vision-lab/data/hf_food_ingredient*/
apps/vision-lab/data/first_object_runs/
apps/vision-lab/data/ingredient_training_dataset*/
apps/vision-lab/data/ingredient_classifier_runs/
apps/vision-lab/data/ingredient_detection_dataset*/
apps/vision-lab/data/ingredient_detector_runs/
```

## Verification Already Done

- Classifier training path ran locally on CPU.
- Classifier training path ran on Modal GPU.
- Best classifier checkpoint reached 68.593% test top-1 and 88.0653% test top-5.
- Streamlit classifier tab loads local checkpoints and can test uploaded images.
- All-crop and grid-fallback classification paths are implemented.
- Detector dataset export was smoke-tested.
- Modal detector wrapper was patched to normalize remote `data.yaml` paths before YOLO training.
- Python compile/help checks passed for the touched training and Modal helper scripts.

## Next Best Step

Train the ingredient detector on Modal, download the detector checkpoint, and use that checkpoint as the Streamlit crop proposer. That directly addresses the current weak link: generic YOLO misses too many ingredient regions.

After that, retest real kitchen/fridge/counter images with:

```text
YOLO all object crops
```

If herbs or missing labels still matter, add labeled examples for those classes or evaluate an open-vocabulary detector. The model cannot recognize a class that is absent from both the detector labels and classifier labels.
