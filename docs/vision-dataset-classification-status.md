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
- Keep customer-facing UI language about the kitchen workflow, not model/vendor implementation names.

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
  -> optional lab-only grid fallback crops
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

Integrated app testing path:

```text
inventory page
  -> live camera, photo upload, video upload, or barcode action
  -> web API media proxy
  -> Nest vision endpoint
  -> Python vision sidecar
  -> YOLO object crops
  -> ResNet18 top-k crop classification
  -> grouped detections, crop thumbnails, annotated frame, top-k picker, and add-to-inventory review controls
```

The web app should remain a review surface. It can show suggested items, counts, crops, and bounding boxes, but it should not silently mutate inventory from raw model output.

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
- Defaults to `resnet18_ingredient_crops_5000_modal_frozen_v2` when present.
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

### FoodSeg103 Segmentation Training Setup

Scripts:

```text
apps/vision-lab/prepare_foodseg103_segmentation_data.py
apps/vision-lab/train_yolo_foodseg_segmenter.py
apps/vision-lab/modal_foodseg_segmentation_training.py
```

What they do:

- Load `EduardoPacheco/FoodSeg103` from Hugging Face.
- Convert semantic ingredient masks into Ultralytics YOLO segmentation labels.
- Treat each connected class region as a segmentation instance.
- Train YOLO segmentation locally only when a real CUDA GPU is available.
- Train YOLO segmentation on Modal A10G for normal use.
- Upload/download segmentation datasets and training artifacts through Modal.

Important limitation:

- FoodSeg103 is semantic segmentation, not true instance segmentation. The converter creates YOLO-style instances from connected regions. This is useful for mask/crop experiments, but it is not a perfect duplicate-counting dataset.
- FoodSeg103 images are food/recipe scenes, not fridge shelves. It can improve food masks, but real fridge/pantry data is still required before product auto-add decisions.

Output shape:

```text
apps/vision-lab/data/foodseg103_segmentation_dataset/
  data.yaml
  class_map.json
  summary.json
  images/train/*.jpg
  images/val/*.jpg
  labels/train/*.txt
  labels/val/*.txt
```

Generated data and model artifacts are ignored by git.

### App Integration

Files:

```text
apps/web/src/app/inventory/inventory-client.tsx
apps/web/src/app/inventory/vision-scan-modal.tsx
apps/web/src/app/api/vision/analyze/route.ts
apps/api/src/vision/vision.controller.ts
apps/api/src/vision/vision.service.ts
apps/api/src/vision/dto/analyze-vision-media.dto.ts
apps/vision-lab/fastapi_app.py
packages/shared/src/vision.ts
packages/shared/src/ingredient.ts
```

What is now wired:

- The inventory hero exposes four user actions: live scan, photo upload, video upload, and barcode.
- Photo/video/live scan go through a real media upload path instead of a mock-only UI.
- The scan result can display an annotated image or sampled video frame with bounding boxes.
- Detections are grouped by item name, for example `3x apple`.
- Each group shows a detected crop thumbnail.
- Expanding a group shows each individual crop so the user can add one item or the whole group.
- Each crop has a dropdown with the classifier top-k predictions plus `Other`.
- Choosing a different top-k label changes the item that would be added to inventory.
- Add-to-inventory supports optional quantity fields for grouped detections.
- Barcode scanning remains separate from the vision media scan flow.
- Customer-facing scan copy avoids terms like model names, sidecars, and developer pipeline language.

### Product App Runtime Policy

The product app and Streamlit lab intentionally do not use the exact same defaults.

Streamlit remains the experiment bench. It supports:

- `YOLO all object crops`
- `YOLO all + grid fallback`
- `Grid fallback crops`
- `YOLO first object crop`
- `Full image`

The product app currently forces the safer review flow:

```text
photo/live/video media
  -> YOLO object boxes only
  -> classify each YOLO crop
  -> show top-k options for each crop
  -> user chooses what to add
```

The product app disables:

- grid fallback crops
- full-image fallback detections

Reason: grid/full-image fallback can invent objects from background or arbitrary image regions. A rice bowl test produced false items like `fish` and extra `coconut` because the classifier was asked to classify random grid crops. That behavior is useful for lab diagnosis, but it is too noisy for a customer inventory review UI.

Current product env defaults:

```text
VISION_DETECTOR=yolo
VISION_YOLO_MODEL=yolo11n.pt
VISION_CLASSIFY_CROPS=true
VISION_CLASSIFIER_RUN=resnet18_ingredient_crops_5000_modal_frozen_v2
VISION_CLASSIFIER_TOP_K=5
VISION_USE_FULL_IMAGE_FALLBACK=false
VISION_USE_GRID_FALLBACK=false
VISION_GRID_MAX_ADDITIONS=0
```

The main app checkpoint is therefore:

```text
detector: yolo11n.pt
classifier: resnet18_ingredient_crops_5000_modal_frozen_v2
```

Streamlit should be manually set to the same classifier run when comparing app vs lab behavior.

### Debugging Product Scans

The inventory scan modal exposes the last scan response in development builds:

```js
window.__chefLastVisionScan
```

After a scan, this browser console snippet shows the actual model handoff:

```js
const r = window.__chefLastVisionScan;
console.log(r.pipeline.provider, r.classification);
console.table(r.frames.flatMap(f => f.detections).map(d => ({
  label: d.label,
  detector: d.detector_label,
  predictions: (d.classification_predictions || []).map(p => p.label).join(", ")
})));
```

Expected healthy output:

```text
pipeline.provider = ultralytics:yolo11n.pt
classification.enabled = true
classification_predictions = top-k labels for each crop
```

If `classification` is missing or `undefined`, the running Python sidecar is probably stale. We already saw this once when two `uvicorn` processes were listening on port `8000`; the app was hitting the older process. Stop duplicate sidecars and restart with:

```powershell
pnpm dev
```

If `classification.enabled` is false, read the `classification.reason` value first. It usually means the classifier checkpoint is missing or the sidecar is running from the wrong environment.

### Shared Vision Label Mapping

File:

```text
packages/shared/vision-label-mappings.json
```

This is the current shared mapping file for the vision integration. It contains:

- Canonical stage-1 vision classes.
- Aliases, categories, granularity, and inventory policy.
- Default mock boxes.
- Model adapter mappings, currently COCO label names to Chef canonical ids.
- Pipeline notes used by the API contract.

Both the API and Python vision adapter read from this file now, instead of maintaining separate hardcoded class lists. That keeps labels like `broccoli`, `orange`, containers, utensils, and ignored kitchenware aligned across the stack.

Long term, the database should own the canonical ingredient and inventory ontology. This JSON file is a practical transitional source of truth while the detector and UX are still moving quickly. When the database ontology is ready, this file should either become a generated seed/config artifact or shrink down to only model-specific adapter mappings.

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
run: resnet18_ingredient_crops_5000_modal_frozen_v2
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

### Modal FoodSeg103 Segmenter

```text
run: yolo11n_foodseg103_segmenter_modal
device: cuda on Modal A10G
model: yolo11n-seg.pt
classes: 36 fridge-oriented FoodSeg103 classes
images: 4293 train / 1838 validation
polygons: 15146 train / 6532 validation
epochs: 75
best mask mAP50: 0.42195 at epoch 51
best mask mAP50-95: 0.31869 at epoch 63
final mask mAP50: 0.41789
final mask mAP50-95: 0.31595
final mask precision: 0.55768
final mask recall: 0.41304
```

This is a useful food-aware segmentation baseline, not a product-ready fridge model. The validation numbers are modest and the dataset remains food-scene biased. Its value is in the Streamlit Segmentation tab comparison against generic `yolo11n-seg.pt` and against the current YOLO-box-plus-classifier pipeline.

## Important Limitations

- Generic COCO YOLO is not ingredient-aware.
- The classifier only classifies crops it receives. If the detector misses parsley, the classifier never gets a parsley crop.
- The current imported label set includes herbs like `basil`, `cilantro`, `rosemary`, and `spinach`, but not `parsley`.
- Training an ingredient detector will improve crop proposals, but it will not create missing classes.
- Grid fallback is diagnostic. It can reveal missed regions, but it is noisy and should not be treated as a production detector or product inventory source.
- Full-image classification is also diagnostic for now. It can identify the main image subject, but it should not create extra inventory rows unless a real detector box exists.
- FoodSeg103 segmentation improves the mask training signal, but it is still not fridge/pantry data and should not drive automatic inventory writes.
- Accuracy on curated dataset images may be higher than accuracy on real fridge, pantry, and counter photos.
- Use validation accuracy for tuning; use test accuracy only for final reporting.

## Future Training Data To Collect

Do not execute this yet; this is the next data-expansion plan.

The next detector/classifier data should include:

- Ingredients in jars, bottles, bags, boxes, and other real pantry containers.
- Half-cut, peeled, sliced, chopped, and partially used produce.
- Overhead counter views, fridge views, pantry shelf views, and cluttered prep surfaces.
- Multiple instances of the same item in one frame, such as three apples or several onions.
- Small herbs and leafy items, especially parsley and other classes missing or weak in the current dataset.
- Occluded or stacked items where only part of the food is visible.
- Different lighting, phone cameras, backgrounds, and distances.

This matters because retraining on the same clean dataset is unlikely to fix poor real-kitchen accuracy. The model needs examples that match how people actually store, cut, and photograph food.

## Commands For Current Workflow

Install dependencies:

```powershell
.\.venv\Scripts\python.exe -m pip install -r apps\vision-lab\requirements.txt
```

Preferred workspace setup command:

```powershell
pnpm vision:setup
```

Run the full local app stack:

```powershell
pnpm dev
```

This starts:

```text
web: http://localhost:3000
api: http://localhost:3001
vision sidecar: http://localhost:8000
```

If the backend crashes with `EADDRINUSE`, another API process is already using the port. Find and stop the duplicate process before restarting `pnpm dev`.

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
  --run-name resnet18_ingredient_crops_5000_modal_frozen_v2 `
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

Prepare a FoodSeg103 YOLO segmentation dataset:

```powershell
.\.venv\Scripts\python.exe apps\vision-lab\prepare_foodseg103_segmentation_data.py `
  --output-dir apps\vision-lab\data\foodseg103_segmentation_dataset `
  --preset fridge `
  --train-limit 0 `
  --val-limit 0 `
  --min-mask-area-pixels 128 `
  --min-mask-area-percent 0.05 `
  --overwrite
```

The converter streams from Hugging Face by default so the smoke test does not need to materialize the full dataset first. Use `--no-streaming` only if you explicitly want Hugging Face `datasets` to cache/materialize the split locally.

For a cheap converter smoke test before the full export:

```powershell
.\.venv\Scripts\python.exe apps\vision-lab\prepare_foodseg103_segmentation_data.py `
  --output-dir apps\vision-lab\data\foodseg103_segmentation_dataset_smoke `
  --preset fridge `
  --train-limit 100 `
  --val-limit 40 `
  --overwrite
```

Render visual QA contact sheets for the smoke dataset:

```powershell
.\.venv\Scripts\python.exe apps\vision-lab\preview_yolo_segmentation_dataset.py `
  --dataset-dir apps\vision-lab\data\foodseg103_segmentation_dataset_smoke `
  --split train `
  --limit 12

.\.venv\Scripts\python.exe apps\vision-lab\preview_yolo_segmentation_dataset.py `
  --dataset-dir apps\vision-lab\data\foodseg103_segmentation_dataset_smoke `
  --split val `
  --limit 12
```

Inspect:

```text
apps/vision-lab/data/segmentation_dataset_previews/foodseg103_segmentation_dataset_smoke_train_contact_sheet.jpg
apps/vision-lab/data/segmentation_dataset_previews/foodseg103_segmentation_dataset_smoke_val_contact_sheet.jpg
```

Upload FoodSeg103 segmentation data to Modal:

```powershell
$env:PYTHONIOENCODING="utf-8"
.\.venv\Scripts\python.exe -m modal run apps\vision-lab\modal_foodseg_segmentation_training.py `
  --action upload `
  --local-data-dir apps\vision-lab\data\foodseg103_segmentation_dataset
```

Train the FoodSeg103 segmenter on Modal GPU:

```powershell
$env:PYTHONIOENCODING="utf-8"
.\.venv\Scripts\python.exe -m modal run apps\vision-lab\modal_foodseg_segmentation_training.py `
  --action train `
  --run-name yolo11n_foodseg103_segmenter_modal `
  --model-name yolo11n-seg.pt `
  --epochs 75 `
  --imgsz 640 `
  --batch 16 `
  --patience 20
```

Download FoodSeg103 segmenter artifacts:

```powershell
$env:PYTHONIOENCODING="utf-8"
.\.venv\Scripts\python.exe -m modal run apps\vision-lab\modal_foodseg_segmentation_training.py `
  --action download `
  --run-name yolo11n_foodseg103_segmenter_modal `
  --local-output-dir apps\vision-lab\data\foodseg103_segmenter_runs
```

After segmentation training, test the checkpoint in Streamlit:

```text
Segmentation -> YOLO segmentation model:
apps/vision-lab/data/foodseg103_segmenter_runs/yolo11n_foodseg103_segmenter_modal/weights/best.pt
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
apps/vision-lab/prepare_foodseg103_segmentation_data.py
apps/vision-lab/preview_yolo_segmentation_dataset.py
apps/vision-lab/train_yolo_foodseg_segmenter.py
apps/vision-lab/modal_foodseg_segmentation_training.py
apps/vision-lab/fastapi_app.py
apps/api/src/vision/
apps/web/src/app/api/vision/analyze/route.ts
apps/web/src/app/inventory/vision-scan-modal.tsx
packages/shared/src/ingredient.ts
packages/shared/src/vision.ts
packages/shared/vision-label-mappings.json
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
apps/vision-lab/data/foodseg103_segmentation_dataset*/
apps/vision-lab/data/foodseg103_segmenter_runs/
apps/vision-lab/data/segmentation_dataset_previews/
```

## Verification Already Done

- Classifier training path ran locally on CPU.
- Classifier training path ran on Modal GPU.
- Best classifier checkpoint reached 68.593% test top-1 and 88.0653% test top-5.
- Streamlit classifier tab loads local checkpoints and can test uploaded images.
- All-crop and grid-fallback classification paths are implemented.
- Product app top-k dropdowns were wired to `classification_predictions`.
- Product app scan debug now exposes `window.__chefLastVisionScan` in development.
- Product app was changed to disable grid and full-image fallbacks after false positives appeared on a rice bowl image.
- Detector dataset export was smoke-tested.
- Modal detector wrapper was patched to normalize remote `data.yaml` paths before YOLO training.
- Inventory UI media scan path was wired to the web API, Nest API, and Python sidecar.
- Scan UI now shows grouped detections, crop thumbnails, annotated frames, and per-item add controls.
- Shared label mappings were centralized in `packages/shared/vision-label-mappings.json`.
- FoodSeg103 segmentation dataset conversion, Modal upload, Modal training, and artifact download completed.
- Streamlit now defaults to the trained FoodSeg103 segmenter checkpoint when `best.pt` exists locally.
- Python compile/help checks passed for the touched training and Modal helper scripts.

## Next Best Step

Compare the trained FoodSeg103 segmenter against generic `yolo11n-seg.pt` in Streamlit using the same real fridge/pantry/counter images. Count expected objects manually and track misses, false positives, and useful masks. Do not promote segmentation into the product flow until it beats the current YOLO-box-plus-classifier review flow on real images.

After that, retest real kitchen/fridge/counter images with:

```text
Segmentation -> trained FoodSeg103 segmenter checkpoint
```

If herbs, sideways items, or fridge packaging still fail, collect real fridge/pantry data. FoodSeg103 improves food masks, but it does not remove the need for environment-matched data.

## Future Steps

Highest priority:

1. Run the FoodSeg103 segmentation smoke export and inspect `summary.json`.
2. Train and evaluate the FoodSeg103 YOLO segmenter on Modal.
3. Compare generic `yolo11n-seg.pt` vs the trained segmenter in the Streamlit Segmentation tab.
4. Compare trained segmentation masks against the current YOLO-box-plus-classifier path on the same fridge/pantry images.
5. Only promote segmentation into product app flows if it improves real item recall without flooding review with false masks.
6. Keep grid/full-image fallback off in the product app until there is a confidence/duplicate policy strong enough to prevent fake inventory items.

Data expansion:

1. Add real kitchen photos: fridge shelves, pantry shelves, counters, bags, jars, bowls, and partial packages.
2. Add half-cut, sliced, chopped, peeled, and partially used ingredients.
3. Add repeated instances: multiple apples, onions, potatoes, lemons, etc.
4. Add weak and missing classes, especially parsley and other small herbs.
5. Add overhead views and cluttered scenes because clean dataset images overstate real-world accuracy.

Product hardening:

1. Store scan sessions so users can reopen past scans.
2. Let users correct labels and save those corrections as future training/evaluation examples.
3. Disable add buttons for non-inventory detections such as bottles, plates, mugs, or generic containers unless the user manually maps them to an ingredient.
4. Move the canonical inventory/ingredient ontology into the database once the mapping stabilizes; keep `packages/shared/vision-label-mappings.json` as the model adapter bridge.
5. Add a small admin/debug view for scan payloads so future issues can be diagnosed without browser-console spelunking.
