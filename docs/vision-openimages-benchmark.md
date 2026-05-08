# Open Images Detector Benchmark

This workflow compares the original YOLO detector against a Chef-trained Open Images detector, with and without the existing ResNet crop classifier.

## Why Open Images Bounding Boxes

Use Open Images **Bounding boxes**, not image labels. Image labels only say an object appears somewhere in an image; detector training needs box coordinates.

Open Images box rows contain:

```text
ImageID, LabelName, XMin, XMax, YMin, YMax, IsGroupOf, ...
```

`IsGroupOf=1` means the box spans a group of touching objects. The importer excludes those by default because they can teach cluster boxes.

## Download Inputs

From the official Open Images V7 download page:

- boxable class names
- train/validation/test bounding-box CSVs
- image pixels for selected IDs, using the official downloader flow

Docs:

```text
https://storage.googleapis.com/openimages/web/download_v7.html
```

The repo wrapper downloads the small metadata files by default:

```powershell
.\apps\vision-lab\download_open_images_v7_assets.ps1
```

That writes:

```text
apps/vision-lab/data/open-images-v7/oidv7-class-descriptions-boxable.csv
apps/vision-lab/data/open-images-v7/downloader.py
```

Download the large train boxes only when you are ready to import/build:

```powershell
.\apps\vision-lab\download_open_images_v7_assets.ps1 -TrainBoxes
```

## Import Open Images

Default Open Images target labels use the exact boxable class names:

```text
Bottle, Bowl, Coffee cup, Mug, Measuring cup, Plate, Tin can, Box,
Apple, Banana, Orange (fruit), Carrot, Tomato
```

First run the importer without images if you need an image-id list for the official downloader:

```powershell
.\.venv\Scripts\python.exe apps\vision-lab\import_open_images_detection_source.py `
  --source-id open-images-v7-kitchen-object-proposal-train `
  --split train `
  --annotations-csv apps\vision-lab\data\open-images-v7\oidv6-train-annotations-bbox.csv `
  --class-descriptions-csv apps\vision-lab\data\open-images-v7\oidv7-class-descriptions-boxable.csv `
  --limit-images 8000 `
  --limit-boxes-per-class 2500 `
  --overwrite
```

This writes:

```text
apps/vision-lab/data/sources/open-images-v7-kitchen-object-proposal-train/open_images_image_ids.txt
```

Use that file with the official Open Images downloader:

```powershell
.\.venv\Scripts\python.exe apps\vision-lab\data\open-images-v7\downloader.py `
  apps\vision-lab\data\sources\open-images-v7-kitchen-object-proposal-train\open_images_image_ids.txt `
  --download_folder=apps\vision-lab\data\open-images-v7\images `
  --num_processes=5
```

Then rerun the importer with `--images-dir` and `--copy-images`, or use the build wrapper below.

## Build v005 Without FoodSeg103

```powershell
.\apps\vision-lab\build_openimages_detector_v005.ps1 `
  -OpenImagesAnnotationsCsv apps\vision-lab\data\open-images-v7\oidv6-train-annotations-bbox.csv `
  -OpenImagesClassDescriptionsCsv apps\vision-lab\data\open-images-v7\oidv7-class-descriptions-boxable.csv `
  -OpenImagesImagesDir apps\vision-lab\data\open-images-v7\images `
  -DetectorClassStrategy object_proposal
```

This includes:

```text
Open Images bounding boxes
TeenDifferent/Food-Ingredient
```

It excludes FoodSeg103. Add `-IncludeRpc` only for experimental packaged-product work after reviewing licensing.

The script writes a quality report before training:

```text
apps/vision-lab/data/training-builds/detector/chef-detector-v005-openimages/dataset_quality_report.md
```

Do not train until the report has sane class counts and no obvious cluster-box dominance.

## Visual QA Before Training

Render suspicious training boxes before spending GPU time:

```powershell
.\.venv\Scripts\python.exe apps\vision-lab\create_detector_dataset_visual_qa.py `
  --build-dir apps\vision-lab\data\training-builds\detector\chef-detector-v005-openimages `
  --mode oversized `
  --sample-count 120 `
  --overwrite
```

Open:

```text
apps/vision-lab/reports/vision/dataset-qa/chef-detector-v005-openimages/oversized/visual_qa.html
```

If the page shows full-scene or cluster boxes, create a filtered build rather than mutating the raw source manifests:

```powershell
.\.venv\Scripts\python.exe apps\vision-lab\build_detector_training_dataset.py `
  --build-id chef-detector-v005b-openimages-filtered `
  --source-manifest apps\vision-lab\data\sources\open-images-v7-kitchen-object-proposal-train\source_manifest.json `
  --source-manifest apps\vision-lab\data\sources\teen-food-ingredient-v1\source_manifest.json `
  --output-root apps\vision-lab\data\training-builds\detector `
  --detector-class-strategy object_proposal `
  --min-samples-per-label 3 `
  --max-box-area-ratio 0.65 `
  --overwrite

.\.venv\Scripts\python.exe apps\vision-lab\report_detector_dataset_quality.py `
  --build-dir apps\vision-lab\data\training-builds\detector\chef-detector-v005b-openimages-filtered
```

The `0.65` ratio is intentionally stricter than the raw dataset but looser than the `0.35` warning threshold. It removes near-full-frame boxes while retaining legitimate close-up object examples.

## Train v005

After reviewing the quality report:

```powershell
.\apps\vision-lab\build_openimages_detector_v005.ps1 `
  -OpenImagesAnnotationsCsv apps\vision-lab\data\open-images-v7\oidv6-train-annotations-bbox.csv `
  -OpenImagesClassDescriptionsCsv apps\vision-lab\data\open-images-v7\oidv7-class-descriptions-boxable.csv `
  -OpenImagesImagesDir apps\vision-lab\data\open-images-v7\images `
  -DetectorClassStrategy object_proposal `
  -TrainOnModal
```

Expected checkpoint:

```text
apps/vision-lab/checkpoints/detectors/ingredient/yolo11n_ingredient_detector_chef-detector-v005-openimages/weights/best.pt
```

## Run The 4-Way Benchmark

```powershell
$candidate = "apps\vision-lab\checkpoints\detectors\ingredient\yolo11n_ingredient_detector_chef-detector-v005-openimages\weights\best.pt"

.\.venv\Scripts\python.exe apps\vision-lab\benchmark_vision_detector_matrix.py `
  --dataset-build apps\vision-lab\data\training-builds\detector\chef-detector-v005-openimages `
  --baseline-model yolo11n.pt `
  --candidate-model $candidate `
  --output-dir apps\vision-lab\reports\vision\chef-detector-v005-openimages `
  --split test
```

The benchmark produces:

```text
apps/vision-lab/reports/vision/chef-detector-v005-openimages/
|-- comparison.json
|-- summary.md
|-- visual_qa.html
|-- A_original_yolo/
|-- B_original_yolo_resnet/
|-- C_openimages_detector/
`-- D_openimages_detector_resnet/
```

Use `summary.md` to choose the default model path for Streamlit/product testing.
