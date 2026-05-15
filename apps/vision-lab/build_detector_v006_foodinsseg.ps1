param(
  [string]$BuildId = "chef-detector-v006-foodinsseg-80plus",
  [string]$FoodInsSegImagesDir = "apps\vision-lab\data\FoodInsSeg\images\train",
  [string]$FoodInsSegAnnotations = "apps\vision-lab\data\FoodInsSeg\annotations\Train.json",
  [string]$OpenImagesManifest = "apps\vision-lab\data\sources\open-images-v7-kitchen-object-proposal-train\source_manifest.json",
  [string]$TeenManifest = "apps\vision-lab\data\sources\teen-food-ingredient-v1\source_manifest.json",
  [int]$MinSamplesPerLabel = 10,
  [double]$MaxBoxAreaRatio = 0.65,
  [double]$MinBoxAreaRatio = 0,
  [switch]$TrainOnModal
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$Python = Join-Path $RepoRoot ".venv\Scripts\python.exe"
$VisionLab = Join-Path $RepoRoot "apps\vision-lab"
$LabelMap = "apps\vision-lab\config\vision-label-mappings-v006-detector.json"
$FoodInsSegSourceId = "foodinsseg-ingredient-detection-train-v1"
$FoodInsSegManifest = "apps\vision-lab\data\sources\$FoodInsSegSourceId\source_manifest.json"
$CanonicalDataset = Join-Path $VisionLab "data\datasets\bounding-box\food-ingredient-yolo"
$env:PYTHONIOENCODING = "utf-8"

Set-Location $RepoRoot

Write-Host "1/7 Creating v006 80+ detector label map..."
& $Python "apps\vision-lab\create_v006_detector_label_map.py" `
  --output $LabelMap `
  --overwrite

Write-Host "2/7 Registering FoodInsSeg COCO annotations as a Chef source manifest..."
& $Python "apps\vision-lab\register_detection_dataset.py" `
  --source-id $FoodInsSegSourceId `
  --images-dir $FoodInsSegImagesDir `
  --annotations $FoodInsSegAnnotations `
  --format coco `
  --output-root "apps\vision-lab\data\sources" `
  --overwrite

Write-Host "3/7 Building v006 detector dataset..."
$SourceArgs = @(
  "--source-manifest", $FoodInsSegManifest,
  "--source-manifest", $TeenManifest
)
if (Test-Path $OpenImagesManifest) {
  $SourceArgs += @("--source-manifest", $OpenImagesManifest)
}

& $Python "apps\vision-lab\build_detector_training_dataset.py" `
  --build-id $BuildId `
  @SourceArgs `
  --output-root "apps\vision-lab\data\training-builds\detector" `
  --label-map $LabelMap `
  --detector-class-strategy canonical `
  --min-samples-per-label $MinSamplesPerLabel `
  --max-box-area-ratio $MaxBoxAreaRatio `
  --min-box-area-ratio $MinBoxAreaRatio `
  --overwrite

Write-Host "4/7 Reporting dataset quality..."
& $Python "apps\vision-lab\report_detector_dataset_quality.py" `
  --build-dir "apps\vision-lab\data\training-builds\detector\$BuildId"

Write-Host "5/7 Creating visual QA samples..."
& $Python "apps\vision-lab\create_detector_dataset_visual_qa.py" `
  --build-dir "apps\vision-lab\data\training-builds\detector\$BuildId" `
  --output-dir "apps\vision-lab\reports\vision\dataset-qa\$BuildId" `
  --mode random `
  --sample-count 60 `
  --overwrite

Write-Host "6/7 Copying build to canonical YOLO training dataset path..."
if (Test-Path $CanonicalDataset) {
  Remove-Item -LiteralPath $CanonicalDataset -Recurse -Force
}
New-Item -ItemType Directory -Force (Split-Path $CanonicalDataset) | Out-Null
Copy-Item -Path "apps\vision-lab\data\training-builds\detector\$BuildId" -Destination $CanonicalDataset -Recurse

if ($TrainOnModal) {
  Write-Host "7/7 Uploading, training on Modal, and downloading v006 checkpoint..."
  & $Python -m modal run "apps\vision-lab\modal_ingredient_detector_training.py" `
    --action all `
    --local-data-dir "apps\vision-lab\data\datasets\bounding-box\food-ingredient-yolo" `
    --run-name "yolo11n_ingredient_detector_$BuildId" `
    --model-name "yolo11n.pt" `
    --epochs 100 `
    --imgsz 640 `
    --batch 16 `
    --patience 25 `
    --local-output-dir "apps\vision-lab\checkpoints\detectors\ingredient"
} else {
  Write-Host "7/7 Skipped Modal training. Review dataset quality and visual QA before training."
}

Write-Host "Done."
Write-Host "Dataset: apps\vision-lab\data\training-builds\detector\$BuildId"
Write-Host "Canonical YOLO dataset: apps\vision-lab\data\datasets\bounding-box\food-ingredient-yolo"
Write-Host "Quality report: apps\vision-lab\data\training-builds\detector\$BuildId\dataset_quality_report.md"
Write-Host "Visual QA: apps\vision-lab\reports\vision\dataset-qa\$BuildId"
