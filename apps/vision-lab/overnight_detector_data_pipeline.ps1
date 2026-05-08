param(
  [int]$TeenSamplesPerLabel = 50,
  [int]$TeenMaxLabels = 100,
  [int]$FoodSegLimit = 3500,
  [int]$RpcLimit = 8000,
  [string]$BuildId = "chef-detector-v002",
  [ValidateSet("canonical", "broad", "object_proposal")]
  [string]$DetectorClassStrategy = "canonical",
  [switch]$TrainOnModal
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$Python = Join-Path $RepoRoot ".venv\Scripts\python.exe"
$VisionLab = Join-Path $RepoRoot "apps\vision-lab"
$env:PYTHONIOENCODING = "utf-8"
$env:HF_HOME = Join-Path $VisionLab "data\hf_cache"
$env:HF_HUB_DISABLE_SYMLINKS_WARNING = "1"

Set-Location $RepoRoot

Write-Host "1/8 Importing Teen-Different/Food-Ingredient boxes..."
& $Python "apps\vision-lab\import_hf_food_ingredient.py" `
  --full `
  --samples-per-label $TeenSamplesPerLabel `
  --max-labels $TeenMaxLabels `
  --seed 42 `
  --output-dir "apps\vision-lab\data\hf_food_ingredient_training_import_$($TeenSamplesPerLabel * $TeenMaxLabels)" `
  --overwrite

Write-Host "2/8 Converting Teen-Different import to source manifest..."
& $Python "apps\vision-lab\convert_imported_detection_metadata_to_source.py" `
  --source-id "teen-food-ingredient-v1" `
  --dataset-dir "apps\vision-lab\data\hf_food_ingredient_training_import_$($TeenSamplesPerLabel * $TeenMaxLabels)" `
  --copy-images `
  --overwrite

Write-Host "3/8 Importing FoodSeg103 produce/chopped ingredient masks as boxes..."
& $Python "apps\vision-lab\import_foodseg103_detection_source.py" `
  --source-id "foodseg103-produce-boxes-v1" `
  --split "train" `
  --preset "produce" `
  --limit $FoodSegLimit `
  --overwrite

Write-Host "4/8 Importing RPC packaged-product boxes from Hugging Face..."
& $Python "apps\vision-lab\import_hf_object_detection_source.py" `
  --dataset-id "benjamintli/retail-product-checkout" `
  --source-id "rpc-packaged-products-v1" `
  --split "train" `
  --limit $RpcLimit `
  --bbox-format "xywh" `
  --overwrite

Write-Host "5/8 Building combined canonicalized detector dataset..."
& $Python "apps\vision-lab\build_detector_training_dataset.py" `
  --build-id $BuildId `
  --source-manifest "apps\vision-lab\data\sources\teen-food-ingredient-v1\source_manifest.json" `
  --source-manifest "apps\vision-lab\data\sources\foodseg103-produce-boxes-v1\source_manifest.json" `
  --source-manifest "apps\vision-lab\data\sources\rpc-packaged-products-v1\source_manifest.json" `
  --output-root "apps\vision-lab\data\training-builds\detector" `
  --detector-class-strategy $DetectorClassStrategy `
  --min-samples-per-label 3 `
  --overwrite

Write-Host "6/8 Creating canonical label review packet..."
& $Python "apps\vision-lab\create_label_mapping_review.py" `
  --label-map-report "apps\vision-lab\data\training-builds\detector\$BuildId\label_map_report.json" `
  --output "apps\vision-lab\data\training-builds\detector\$BuildId\canonical_label_review.json"

Write-Host "7/8 Copying build to canonical local detector dataset path..."
$CanonicalDataset = Join-Path $VisionLab "data\datasets\bounding-box\food-ingredient-yolo"
if (Test-Path $CanonicalDataset) {
  Remove-Item -LiteralPath $CanonicalDataset -Recurse -Force
}
New-Item -ItemType Directory -Force (Split-Path $CanonicalDataset) | Out-Null
Copy-Item -Path "apps\vision-lab\data\training-builds\detector\$BuildId" -Destination $CanonicalDataset -Recurse

if ($TrainOnModal) {
  Write-Host "8/8 Uploading, training on Modal, and downloading checkpoint..."
  & $Python -m modal run "apps\vision-lab\modal_ingredient_detector_training.py" `
    --action all `
    --local-data-dir "apps\vision-lab\data\datasets\bounding-box\food-ingredient-yolo" `
    --run-name "yolo11n_ingredient_detector_$BuildId" `
    --model-name "yolo11n.pt" `
    --epochs 75 `
    --imgsz 640 `
    --batch 16 `
    --patience 20 `
    --local-output-dir "apps\vision-lab\checkpoints\detectors\ingredient"
} else {
  Write-Host "8/8 Skipped Modal training. Re-run with -TrainOnModal to spend GPU credits."
}

Write-Host "Done."
Write-Host "Dataset: apps\vision-lab\data\datasets\bounding-box\food-ingredient-yolo"
Write-Host "Review: apps\vision-lab\data\training-builds\detector\$BuildId\canonical_label_review.json"
