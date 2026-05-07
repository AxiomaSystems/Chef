# Vision Lab Dataset Layout

`apps/vision-lab/data/` is local scratch space and is ignored by Git. Use it for generated datasets, imports, previews, and one-off experiments.

## Canonical Local Layout

```text
apps/vision-lab/data/
|-- datasets/
|   `-- bounding-box/
|       `-- food-ingredient-yolo/
|-- sources/
|   `-- <source-id>/
|       `-- source_manifest.json
|-- training-builds/
|   `-- detector/
|       `-- <build-id>/
|-- previews/
`-- runtime_inventory.json
```

## Dataset Types

- `bounding-box/`: YOLO detection datasets. Labels are boxes only.
- `sources/`: normalized raw dataset manifests. Keep sources separate for provenance.
- `training-builds/`: generated versioned datasets used for training. Regenerate these instead of editing them by hand.
- `*-smoke`: tiny throwaway validation datasets used to check converters before full export.
- `previews/`: generated contact sheets for visual QA.

## Adding A New Detection Dataset

Do not merge raw images or annotations into an existing dataset folder. Register each new source separately:

```powershell
.\.venv\Scripts\python.exe apps\vision-lab\register_detection_dataset.py `
  --source-id pantry-jars-v1 `
  --images-dir C:\path\to\images `
  --annotations C:\path\to\annotations `
  --format pascal-voc `
  --copy-images `
  --overwrite
```

Supported annotation formats:

- `pascal-voc`: one XML file per image
- `coco`: one COCO JSON annotation file
- `yolo`: YOLO txt labels plus `--class-names`

Then build a versioned YOLO training dataset:

```powershell
.\.venv\Scripts\python.exe apps\vision-lab\build_detector_training_dataset.py `
  --build-id chef-detector-v002 `
  --source-manifest apps\vision-lab\data\sources\pantry-jars-v1\source_manifest.json `
  --overwrite
```

Review the generated `label_map_report.json`. If labels are excluded, create a review packet:

```powershell
.\.venv\Scripts\python.exe apps\vision-lab\create_label_mapping_review.py `
  --label-map-report apps\vision-lab\data\training-builds\detector\chef-detector-v002\label_map_report.json `
  --output apps\vision-lab\data\training-builds\detector\chef-detector-v002\canonical_label_review.json
```

## Overnight Starter Pipeline

For the current detector-recall push, use:

```powershell
.\apps\vision-lab\overnight_detector_data_pipeline.ps1
```

Add `-TrainOnModal` only when you want the script to spend Modal GPU credits:

```powershell
.\apps\vision-lab\overnight_detector_data_pipeline.ps1 -TrainOnModal
```

See `docs/vision-dataset-overnight-run.md` for the exact sources and morning review checklist.

## Canonical Modal Volume Layout

The Modal volume mirrors the same vocabulary:

```text
/mnt/chef-vision/
|-- datasets/
|   `-- bounding-box/
|       `-- food-ingredient-yolo/
`-- runs/
    `-- bounding-box/
        `-- ingredient-detector/
```

After changing to this layout, re-run the relevant `--action upload` command before training so Modal has the dataset in the canonical location.

## Open Images v005 Benchmark

Use `docs/vision-openimages-benchmark.md` for the Open Images detector benchmark path.

This path intentionally excludes FoodSeg103 and uses Open Images bounding boxes plus TeenDifferent. It creates a quality report before any Modal training and then supports a 4-way benchmark:

```text
original YOLO
original YOLO + ResNet
Open Images detector
Open Images detector + ResNet
```

## Legacy Local Folders

Older folders such as `foodseg103_segmentation_dataset`, `foodseg103_segmentation_dataset_smoke`, `ingredient_detection_dataset`, and `segmentation_dataset_previews` are legacy generated outputs. Keep them only for provenance or old comparisons; active training should use `datasets/bounding-box/food-ingredient-yolo/`.

Do not commit generated datasets or model binaries. Share durable model artifacts through `apps/vision-lab/checkpoints/` using the layout documented in `checkpoints/README.md`.
