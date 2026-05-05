# Vision Checkpoints

This directory is the shared runtime location for model checkpoints.

The folder structure is tracked, but checkpoint binaries are ignored by Git. Share the actual `.pt`, `.pth`, or `.ckpt` files through Google Drive or another artifact store, then place them at the paths below.

## Expected Layout

```text
apps/vision-lab/checkpoints/
|-- base/
|   |-- yolo11n.pt
|   `-- yolo11n-seg.pt
|-- classifiers/
|   `-- ingredient/
|       `-- resnet18_ingredient_crops_5000_modal_frozen_v2/
|           `-- best_model.pt
|-- detectors/
|   `-- ingredient/
|       `-- yolo11n_ingredient_detector_modal/
|           `-- weights/
|               `-- best.pt
`-- segmenters/
    `-- foodseg103/
        `-- yolo11n_foodseg103_segmenter_modal/
            `-- weights/
                `-- best.pt
```

## Runtime Defaults

- General YOLO detection first looks for `checkpoints/base/yolo11n.pt`, then falls back to the Ultralytics model name `yolo11n.pt`.
- YOLO segmentation first looks for `checkpoints/segmenters/foodseg103/yolo11n_foodseg103_segmenter_modal/weights/best.pt`, then `checkpoints/base/yolo11n-seg.pt`, then falls back to `yolo11n-seg.pt`.
- Ingredient classification first looks for `checkpoints/classifiers/ingredient/resnet18_ingredient_crops_5000_modal_frozen_v2/best_model.pt`.

## Training Convention

Training scripts should write shareable runtime checkpoints here:

- ingredient classifiers: `checkpoints/classifiers/ingredient/<run-name>/best_model.pt`
- ingredient YOLO detectors: `checkpoints/detectors/ingredient/<run-name>/weights/best.pt`
- FoodSeg103 segmenters: `checkpoints/segmenters/foodseg103/<run-name>/weights/best.pt`

Keep raw datasets, previews, temporary imports, and exploratory run output under `apps/vision-lab/data/`. That directory is local scratch and remains ignored.

## Updating Shared Checkpoints

When replacing a checkpoint:

1. Upload the binary to the shared Drive folder.
2. Update `manifest.example.json` with the intended path, source link or description, date, and metric summary.
3. Tell teammates which files changed and where to place them locally.

