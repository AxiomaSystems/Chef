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

## Legacy Local Folders

Older folders such as `foodseg103_segmentation_dataset`, `foodseg103_segmentation_dataset_smoke`, `ingredient_detection_dataset`, and `segmentation_dataset_previews` are legacy generated outputs. Keep them only for provenance or old comparisons; active training should use `datasets/bounding-box/food-ingredient-yolo/`.

Do not commit generated datasets or model binaries. Share durable model artifacts through `apps/vision-lab/checkpoints/` using the layout documented in `checkpoints/README.md`.
