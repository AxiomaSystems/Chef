# Vision Detector + Classifier v3

v3 separates object discovery from fine-grained inventory identity.

## Core Decision

Do not train one detector class for every inventory phrase.

The detector should answer:

```text
Where are the visible food-relevant objects?
```

The classifier/resolver should answer:

```text
What is this object, and how should it stack in inventory?
```

For the highest-recall path, use the `object_proposal` detector strategy. It is deliberately rudimentary: it can surface objects such as cups, bowls, bottles, boxes, cans, bags, cartons, packets, jars, and produce items. The ontology decides which are inventory candidates.

This matters for labels such as `tomato jar`, `tomato can`, `diced tomatoes can`, and `milk carton`. Those distinctions are useful, but they are better represented as identity plus package metadata than as hundreds of sparse detector classes.

## Compared With Current Work

| Version | Detector classes | Classifier | Strength | Main weakness |
|---|---|---|---|---|
| Generic YOLO | COCO/general objects | optional ResNet | high broad recall | labels are not ingredient-specific |
| v002 | canonical ingredient/package labels | optional ResNet | ingredient-aware boxes | only 23 trained classes; misses out-of-range items |
| v3 broad | broad food/object proposal labels | package-aware classifier | better food recall and extensibility | still food-scoped |
| v3 object proposal | rudimentary visible-object labels | package-aware classifier | highest recall path | needs policy filtering and review to control noise |

## Detector Class Strategies

The detector dataset builder supports:

```text
canonical
broad
object_proposal
```

`canonical` trains detector labels as inventory-ish labels:

```text
tomato
milk_carton
rice_bag
spice_bottle
```

`broad` trains detector labels as proposal classes:

```text
fresh_produce
food_can
food_jar
food_box
food_bag
food_bottle
food_carton
food_packet
unknown_packaged_food
prepared_food
container
```

`object_proposal` trains detector labels as rudimentary object classes:

```text
produce_item
bottle
jar
can
box
bag
carton
packet
container
bowl
cup
plate
egg_carton
unknown_packaged_food
unknown_kitchen_item
```

The broad detector is intentionally less specific. It should find more candidate boxes, then the classifier can identify the crop as `tomato can`, `tomato jar`, `basmati rice bag`, or another fine label.

The object-proposal detector is even less specific. It is the preferred path when the goal is to detect visible objects first, including non-ingredients, then let the JSON ontology decide `track`, `review`, or `ignore`.

## Build v3 Dataset

After the source manifests exist:

```powershell
.\.venv\Scripts\python.exe apps\vision-lab\build_detector_training_dataset.py `
  --build-id chef-detector-v003 `
  --source-manifest apps\vision-lab\data\sources\teen-food-ingredient-v1\source_manifest.json `
  --source-manifest apps\vision-lab\data\sources\foodseg103-produce-boxes-v1\source_manifest.json `
  --source-manifest apps\vision-lab\data\sources\rpc-packaged-products-v1\source_manifest.json `
  --detector-class-strategy broad `
  --output-root apps\vision-lab\data\training-builds\detector `
  --min-samples-per-label 3 `
  --overwrite
```

Or run the full overnight path:

```powershell
.\apps\vision-lab\overnight_detector_data_pipeline.ps1 `
  -BuildId chef-detector-v003 `
  -DetectorClassStrategy broad `
  -TrainOnModal
```

For the rudimentary object proposal path:

```powershell
.\apps\vision-lab\overnight_detector_data_pipeline.ps1 `
  -BuildId chef-detector-v004-object-proposal `
  -DetectorClassStrategy object_proposal `
  -TrainOnModal
```

## Train v3 Detector

Once `apps/vision-lab/data/datasets/bounding-box/food-ingredient-yolo` contains the v3 build:

```powershell
$env:PYTHONIOENCODING="utf-8"
.\.venv\Scripts\python.exe -m modal run apps\vision-lab\modal_ingredient_detector_training.py `
  --action all `
  --local-data-dir apps\vision-lab\data\datasets\bounding-box\food-ingredient-yolo `
  --run-name yolo11n_ingredient_detector_chef-detector-v003 `
  --model-name yolo11n.pt `
  --epochs 75 `
  --imgsz 640 `
  --batch 16 `
  --patience 20 `
  --local-output-dir apps\vision-lab\checkpoints\detectors\ingredient
```

## What To Evaluate

Do not judge v3 only by mAP.

For the product, measure:

- box recall: did it place a box around the object?
- crop classification top-5: did the right ingredient/package appear?
- inventory resolver quality: did it stack the object correctly?
- review burden: how many suggestions did the user have to fix?

## Why This Is Better Than One Giant Detector

A giant detector with labels like `tomato_can`, `tomato_jar`, `tomato_box`, and `tomato_packet` needs enough bounding-box examples for every combination. Sparse combinations will fail.

Broad detection plus fine classification lets the detector learn shape/objectness while the classifier learns identity from crops. That matches the product flow better: users review inventory candidates, not raw model classes.
