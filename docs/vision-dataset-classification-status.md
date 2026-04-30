# Vision Dataset and Classification Status

This document summarizes the current Chef vision dataset work and the new two-stage detection/classification prototype.

## Current Goal

We are testing whether Chef can:

```text
image
  -> detect/localize first visible object
  -> crop the detected box
  -> classify the crop against an ingredient dataset
  -> return a proposed ingredient label
```

This is a practical bridge between generic object detection and ingredient-aware inventory recognition.

## What We Have Done

### 1. Verified The Existing Vision Lab

The repo already had a Python vision lab at:

```text
apps/vision-lab
```

The lab supports:

- Streamlit UI
- YOLO detector mode through Ultralytics
- mock detector mode for contract testing
- image, video, and early live camera workflows
- inventory-aware overlays and local runtime inventory resolution

We confirmed:

- `yolo11n.pt` loads locally
- Ultralytics is installed in `.venv`
- the mock smoke test path works
- Streamlit can run at `http://localhost:8501`
- YOLO can draw bounding boxes on uploaded/local images

### 2. Imported The Hugging Face Ingredient Dataset

The dataset used is:

```text
Teen-Different/Food-Ingredient
```

Source:

```text
https://huggingface.co/datasets/Teen-Different/Food-Ingredient
```

Importer:

```text
apps/vision-lab/import_hf_food_ingredient.py
```

Requirements added:

```text
datasets
huggingface-hub
```

Local preview output:

```text
apps/vision-lab/data/hf_food_ingredient_preview
```

Partial balanced preview output:

```text
apps/vision-lab/data/hf_food_ingredient_balanced_preview
```

These folders are ignored by git because dataset images can become large.

Important dataset caveat:

- the Hugging Face page describes the dataset as object-detection-related
- the accessible import/viewer shape we used exposes `image` and `label`
- we did not get bounding boxes from this dataset
- so it is currently useful as a classification dataset, not a YOLO detection training set

### 3. Built A Two-Stage Prototype

New script:

```text
apps/vision-lab/classify_first_object.py
```

Current flow:

```text
input image
  -> YOLO detects objects
  -> choose highest-confidence detection
  -> crop detection bounding box
  -> compare crop against imported ingredient examples
  -> write crop, annotated image, and JSON result
```

Example command:

```powershell
$env:PYTHONPATH="apps/vision-lab"
.\.venv\Scripts\python.exe apps\vision-lab\classify_first_object.py apps\web\public\images\tomato.png --embedding resnet18 --top-k 5
```

Generated outputs:

```text
apps/vision-lab/data/first_object_runs
```

Those outputs are ignored by git.

## What Worked

- YOLO can localize an object and produce a normalized bounding box.
- The script can crop the detected object region.
- The script can build a small local ingredient image index.
- The script can compare the crop against the ingredient examples.
- The script writes useful debugging artifacts:
  - cropped object image
  - annotated source image
  - structured JSON result

## What Did Not Work Well Yet

The prototype is wired correctly, but classification quality is not good enough yet.

Observed example:

- input: local tomato image
- YOLO detection: `unknown kitchen item`
- color histogram classifier guessed `beans`
- ResNet18 nearest-neighbor classifier guessed `broccoli`

Why this happened:

- the local imported dataset sample is partial
- the balanced import hit Hugging Face rate limits before all labels were downloaded
- nearest-neighbor classification with one example per label is weak
- ImageNet ResNet18 embeddings are general-purpose, not tuned for our ingredient set
- YOLO's crop may include only part of the object or background context

## Current Files Changed

Code and config:

```text
.gitignore
apps/vision-lab/requirements.txt
apps/vision-lab/import_hf_food_ingredient.py
apps/vision-lab/classify_first_object.py
```

Local/generated data:

```text
apps/vision-lab/data/hf_food_ingredient_preview
apps/vision-lab/data/hf_food_ingredient_balanced_preview
apps/vision-lab/data/first_object_runs
```

The generated data folders are intentionally ignored.

## How To Reproduce

Install/update lab dependencies:

```powershell
.\.venv\Scripts\python.exe -m pip install -r apps\vision-lab\requirements.txt
```

Run Streamlit:

```powershell
.\.venv\Scripts\python.exe -m streamlit run apps\vision-lab\app.py
```

Import a small preview:

```powershell
.\.venv\Scripts\python.exe apps\vision-lab\import_hf_food_ingredient.py --limit 24
```

Import a balanced preview when Hugging Face is not rate-limiting:

```powershell
.\.venv\Scripts\python.exe apps\vision-lab\import_hf_food_ingredient.py --samples-per-label 1 --max-labels 30 --output-dir apps\vision-lab\data\hf_food_ingredient_balanced_preview
```

Run the two-stage detector/classifier:

```powershell
$env:PYTHONPATH="apps/vision-lab"
.\.venv\Scripts\python.exe apps\vision-lab\classify_first_object.py <image-path> --embedding resnet18 --top-k 5
```

## Recommended Next Steps

### Short Term

1. Finish a clean local import of `Teen-Different/Food-Ingredient`.
2. Build a YOLO-cropped training dataset while keeping the dataset's original ingredient labels.
3. Train a small ingredient classifier on those crops with proper train/validation/test splits.
4. Evaluate validation accuracy during training and final accuracy on a held-out test split.
5. Add the first-object classification flow into the Streamlit UI as a debug tab.
6. Show the crop and top-5 classification candidates beside the YOLO overlay.

## Best Training Path Forward

The best next step is not segmentation-first and not ResNet-as-labeler.

Use YOLO as an automatic cropper and keep the imported dataset label as truth:

```text
training image + dataset label
  -> YOLO detects likely object box
  -> crop object box with small padding
  -> save crop under the original ingredient label
  -> split into train/validation/test
  -> train ingredient classifier
  -> measure validation and held-out test accuracy
```

Why this is the right next path:

- YOLO boxes make training images look more like inference crops.
- The original dataset label is safer than a generic ResNet guess.
- Validation data lets us tune training without touching the final test set.
- Test data gives a cleaner estimate of real model quality.
- Segmentation can be added later only if boxed crops are still too noisy.

The critical rule:

```text
YOLO can choose the crop.
YOLO or ResNet should not create the ingredient label.
```

If YOLO finds no good box, the current prep script can either keep the full image or skip the image. The default is `full-image` because it preserves data while still recording the fallback in the manifest.

## Training Files Added

Dataset import:

```text
apps/vision-lab/import_hf_food_ingredient.py
```

Now supports:

- `--limit` for total import size
- `--seed` for reproducible shuffled imports
- `--samples-per-label` with `--full` for balanced full-cache imports
- `--max-labels` to constrain early experiments
- direct ZIP archive import for `Teen-Different/Food-Ingredient`, bypassing the broken Hugging Face `datasets` split builder

Training dataset preparation:

```text
apps/vision-lab/prepare_ingredient_training_data.py
```

This script:

- reads imported dataset metadata
- optionally limits total images, for example 300 or 5000
- optionally caps samples per label
- drops labels with too few examples for train/validation/test by default
- uses imported XML annotation boxes when available
- runs YOLO only when no annotation box is available
- saves cropped images in ImageFolder format:

```text
apps/vision-lab/data/ingredient_training_dataset/
  train/<label>/*.jpg
  val/<label>/*.jpg
  test/<label>/*.jpg
```

It also writes:

```text
manifest.json
manifest.csv
class_map.json
```

Classifier training:

```text
apps/vision-lab/train_ingredient_classifier.py
```

This script:

- trains a ResNet18 transfer-learning classifier
- tracks train and validation accuracy per epoch
- saves the best validation checkpoint
- evaluates final test accuracy
- writes top-1 accuracy, top-5 accuracy, per-class accuracy, and top confusions

Outputs:

```text
apps/vision-lab/data/ingredient_classifier_runs/<run-name>/
  best_model.pt
  metrics.json
  class_names.txt
```

Generated training artifacts are ignored by git.

## How To Train

Install/update dependencies:

```powershell
.\.venv\Scripts\python.exe -m pip install -r apps\vision-lab\requirements.txt
```

Import a small shuffled dataset, for example 300 images:

```powershell
.\.venv\Scripts\python.exe apps\vision-lab\import_hf_food_ingredient.py `
  --full `
  --limit 300 `
  --seed 42 `
  --output-dir apps\vision-lab\data\hf_food_ingredient_training_import
```

Import a larger shuffled dataset, for example 5000 images:

```powershell
.\.venv\Scripts\python.exe apps\vision-lab\import_hf_food_ingredient.py `
  --full `
  --limit 5000 `
  --seed 42 `
  --output-dir apps\vision-lab\data\hf_food_ingredient_training_import
```

For a more balanced experiment, prefer samples per label:

```powershell
.\.venv\Scripts\python.exe apps\vision-lab\import_hf_food_ingredient.py `
  --full `
  --samples-per-label 25 `
  --max-labels 100 `
  --seed 42 `
  --output-dir apps\vision-lab\data\hf_food_ingredient_training_import
```

Build YOLO-cropped train/validation/test data:

```powershell
.\.venv\Scripts\python.exe apps\vision-lab\prepare_ingredient_training_data.py `
  --dataset-dir apps\vision-lab\data\hf_food_ingredient_training_import `
  --output-dir apps\vision-lab\data\ingredient_training_dataset `
  --limit 300 `
  --val-ratio 0.15 `
  --test-ratio 0.15 `
  --fallback full-image `
  --overwrite
```

To use more data, change `--limit`:

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

Train and evaluate:

```powershell
.\.venv\Scripts\python.exe apps\vision-lab\train_ingredient_classifier.py `
  --data-dir apps\vision-lab\data\ingredient_training_dataset `
  --run-name resnet18_yolo_crops_300 `
  --epochs 8 `
  --batch-size 32 `
  --device auto
```

For a larger run:

```powershell
.\.venv\Scripts\python.exe apps\vision-lab\train_ingredient_classifier.py `
  --data-dir apps\vision-lab\data\ingredient_training_dataset `
  --run-name resnet18_yolo_crops_5000 `
  --epochs 12 `
  --batch-size 32 `
  --device auto
```

Review accuracy:

```powershell
Get-Content apps\vision-lab\data\ingredient_classifier_runs\resnet18_yolo_crops_300\metrics.json
```

Important metric convention:

- Use validation accuracy to decide epoch count, learning rate, fallback mode, and crop settings.
- Use test accuracy only after a run is chosen.
- Do not tune repeatedly against test accuracy or it stops being a clean test.

## Local Smoke Verification

The training path has been smoke-tested against the current local preview data:

```powershell
.\.venv\Scripts\python.exe apps\vision-lab\prepare_ingredient_training_data.py `
  --dataset-dir apps\vision-lab\data\hf_food_ingredient_preview `
  --output-dir apps\vision-lab\data\ingredient_training_dataset `
  --limit 6 `
  --min-samples-per-label 3 `
  --fallback full-image `
  --overwrite

.\.venv\Scripts\python.exe apps\vision-lab\train_ingredient_classifier.py `
  --data-dir apps\vision-lab\data\ingredient_training_dataset `
  --run-name smoke_resnet18_yolo_crops `
  --epochs 1 `
  --batch-size 2 `
  --device auto
```

Result:

```text
prepared images: 6
classes: 1
validation accuracy: 1.000
test accuracy: 1.000
```

This only verifies the machinery. It is not a meaningful accuracy result because the current local preview contains one class.

## Current Measured Baselines

CPU baseline:

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

This is not product-ready. It is useful only as a pipeline baseline.

Modal GPU run:

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

Frozen-backbone Modal GPU run:

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

The frozen-backbone run is the current best checkpoint. It generalizes better than full fine-tuning, which suggests the dataset is still too small for updating the full ResNet18 backbone.

This is a meaningful improvement, but still not enough for automatic inventory writes. It is good enough to drive a review UI with ranked candidates.

Local baseline evaluation artifact:

```text
apps/vision-lab/data/ingredient_classifier_runs/resnet18_ingredient_crops_2500/baseline_test_predictions.json
```

Modal run artifacts:

```text
apps/vision-lab/data/ingredient_classifier_runs/resnet18_ingredient_crops_5000_modal/
  best_model.pt
  metrics.json
  class_names.txt

apps/vision-lab/data/ingredient_classifier_runs/resnet18_ingredient_crops_5000_modal_frozen/
  best_model.pt
  metrics.json
  class_names.txt
  modal_frozen_test_predictions.json
```

## Modal GPU Training

Modal helper:

```text
apps/vision-lab/modal_ingredient_training.py
```

Upload prepared data:

```powershell
$env:PYTHONIOENCODING="utf-8"
.\.venv\Scripts\python.exe -m modal run apps\vision-lab\modal_ingredient_training.py `
  --action upload `
  --local-data-dir apps\vision-lab\data\ingredient_training_dataset_5000
```

Train on Modal A10G:

```powershell
$env:PYTHONIOENCODING="utf-8"
.\.venv\Scripts\python.exe -m modal run apps\vision-lab\modal_ingredient_training.py `
  --action train `
  --run-name resnet18_ingredient_crops_5000_modal `
  --epochs 18 `
  --batch-size 64 `
  --learning-rate 0.001 `
  --weight-decay 0.0001 `
  --num-workers 2
```

Download artifacts:

```powershell
$env:PYTHONIOENCODING="utf-8"
.\.venv\Scripts\python.exe -m modal run apps\vision-lab\modal_ingredient_training.py `
  --action download `
  --run-name resnet18_ingredient_crops_5000_modal `
  --local-output-dir apps\vision-lab\data\ingredient_classifier_runs
```

For the current best frozen run, use:

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

## Modal GPU Inference

Modal inference helper:

```text
apps/vision-lab/modal_ingredient_inference.py
```

Run GPU inference on a local image with the current best checkpoint:

```powershell
$env:PYTHONIOENCODING="utf-8"
.\.venv\Scripts\python.exe -m modal run apps\vision-lab\modal_ingredient_inference.py `
  --image-path <path-to-image> `
  --run-name resnet18_ingredient_crops_5000_modal_frozen `
  --top-k 5
```

Inference smoke test:

```text
image: apps/vision-lab/data/ingredient_training_dataset_5000/test/tomato/000982.jpg
run: resnet18_ingredient_crops_5000_modal_frozen
top prediction: tomato
probability: 0.242705
top-5: tomato, watermelon, orange, strawberries, onion
```

The top prediction was correct, but confidence was low. This reinforces the current product stance: show ranked candidates for review; do not auto-apply inventory changes yet.

## Streamlit Classifier Testing

The lab app now includes a local testing tab:

```text
Ingredient Classifier
```

This tab:

- loads local checkpoints from `apps/vision-lab/data/ingredient_classifier_runs`
- defaults to `resnet18_ingredient_crops_5000_modal_frozen` when present
- shows saved test top-1/top-5 metrics from `metrics.json`
- accepts an uploaded image
- can classify the full image, the highest-confidence YOLO crop, or all YOLO crops in the frame
- can add grid fallback crops to diagnose food regions YOLO missed
- shows every crop sent to the classifier
- shows top-k ingredient predictions and probabilities
- does not train, call Modal, or write inventory

Important limitation:

- The classifier only sees crops that the detector proposes.
- COCO YOLO is not ingredient-aware and may miss foods like parsley, cilantro-like herbs, leafy greens, small loose ingredients, or ambiguous piles.
- If YOLO does not box parsley, the classifier cannot classify parsley from a crop.
- Grid fallback can reveal whether the classifier recognizes a missed region, but it is noisy and not a production detector.
- Fixing that requires a better localization stage: fine-tuned YOLO on ingredient boxes, an open-vocabulary detector, or a segmentation/detection model trained on food ingredients.

Run the app:

```powershell
.\.venv\Scripts\python.exe -m streamlit run apps\vision-lab\app.py
```

## Ingredient Detector Training Setup

The current classifier can only classify crops that a detector proposes. Generic COCO YOLO is a weak crop proposer for ingredients, especially herbs, leafy greens, small loose foods, and ambiguous piles.

New detector dataset exporter:

```text
apps/vision-lab/prepare_ingredient_detection_data.py
```

It converts imported XML bounding boxes into YOLO format:

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

Export the full current ingredient detection dataset:

```powershell
.\.venv\Scripts\python.exe apps\vision-lab\prepare_ingredient_detection_data.py `
  --dataset-dir apps\vision-lab\data\hf_food_ingredient_training_import_5000 `
  --output-dir apps\vision-lab\data\ingredient_detection_dataset `
  --overwrite
```

Local YOLO training wrapper:

```text
apps/vision-lab/train_yolo_ingredient_detector.py
```

Train locally if you have a CUDA GPU:

```powershell
.\.venv\Scripts\python.exe apps\vision-lab\train_yolo_ingredient_detector.py `
  --data-yaml apps\vision-lab\data\ingredient_detection_dataset\data.yaml `
  --model yolo11n.pt `
  --epochs 75 `
  --imgsz 640 `
  --batch 16 `
  --device 0 `
  --name yolo11n_ingredient_detector
```

If you only have CPU locally, do not train YOLO locally. Use Modal or another GPU.

Modal YOLO detector training helper:

```text
apps/vision-lab/modal_ingredient_detector_training.py
```

Upload the YOLO detection dataset to Modal:

```powershell
$env:PYTHONIOENCODING="utf-8"
.\.venv\Scripts\python.exe -m modal run apps\vision-lab\modal_ingredient_detector_training.py `
  --action upload `
  --local-data-dir apps\vision-lab\data\ingredient_detection_dataset
```

Train on Modal A10G:

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

The Modal wrapper rewrites the uploaded `data.yaml` path to `/mnt/chef-vision/ingredient_detection_dataset` before training. This matters because a locally exported YOLO dataset may contain a Windows path that is invalid inside Modal.

Download detector artifacts:

```powershell
$env:PYTHONIOENCODING="utf-8"
.\.venv\Scripts\python.exe -m modal run apps\vision-lab\modal_ingredient_detector_training.py `
  --action download `
  --run-name yolo11n_ingredient_detector_modal `
  --local-output-dir apps\vision-lab\data\ingredient_detector_runs
```

After training, point the Streamlit sidebar `YOLO model` field at the detector checkpoint, usually:

```text
apps/vision-lab/data/ingredient_detector_runs/yolo11n_ingredient_detector_modal/weights/best.pt
```

Then test:

```text
Ingredient Classifier -> Classification input -> YOLO all object crops
```

Critical caveat:

- A detector can only learn labels that exist in the detection dataset.
- The current imported 100-class setup includes herbs like `cilantro`, `basil`, and `rosemary`, but not `parsley`.
- To detect parsley specifically, add parsley-labeled bounding-box images or use an open-vocabulary detector.
- Training an ingredient YOLO should improve crop proposals, but it will not magically add missing classes.

### Model Quality

1. Train the ResNet18 crop classifier as the baseline.
2. Compare against CLIP, SigLIP, or a food-specific embedding model after the baseline is measurable.
3. Evaluate classification accuracy on held-out ingredient images.
4. Add confidence thresholds so uncertain crops stay in `review` instead of being auto-added.
5. Inspect `top_confusions` in `metrics.json` before deciding whether to merge labels, collect more data, or change crop settings.

### Detection Quality

1. Keep YOLO for coarse object localization.
2. Add segmentation later with FoodSeg103 or YOLO segmentation if we need precise masks.
3. Fine-tune detection on pantry/fridge/counter photos from the target environment.
4. Add packaged-food recognition through OCR/barcode later.

### Product Integration

1. Keep this in `apps/vision-lab` until the model path is stable.
2. Once stable, expose the flow through the FastAPI sidecar.
3. Let the Nest API call the Python vision service instead of trying to run CV in TypeScript.
4. Store scan sessions and classification candidates before writing inventory changes.

## Current Recommendation

Use the two-stage flow as the next prototype and training direction:

```text
offline:
  import labeled ingredient images
  -> YOLO crop
  -> train/validation/test split
  -> train ingredient classifier
  -> measure validation and test accuracy

runtime:
  YOLO box
  -> crop
  -> ingredient classifier
  -> confidence threshold
  -> review/apply
```

Do not treat the current classifier as production-quality yet. The architecture is sound, but the classification model and dataset import need measurable training and evaluation before they should influence real inventory state.

## Open Risks And Missing Pieces

- The Hugging Face viewer exposes only `image` and `label`, but the downloaded archive includes Pascal/VOC-style XML bounding boxes.
- XML boxes should be preferred over YOLO pseudo-boxes for training crops when available.
- YOLO crops remain fallback geometry. They improve training focus but can still crop the wrong object.
- Some labels may not have enough examples for a meaningful train/validation/test split.
- A high top-1 accuracy on curated ingredient images may still underperform on real fridge, pantry, and counter photos.
- We still need runtime confidence calibration before auto-writing inventory.
- We measure top-5 accuracy as well as top-1 because review UI can benefit from ranked candidates.
