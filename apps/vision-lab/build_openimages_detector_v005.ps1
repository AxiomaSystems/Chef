param(
  [Parameter(Mandatory = $true)]
  [string]$OpenImagesAnnotationsCsv,
  [Parameter(Mandatory = $true)]
  [string]$OpenImagesClassDescriptionsCsv,
  [Parameter(Mandatory = $true)]
  [string]$OpenImagesImagesDir,
  [string]$OpenImagesSplit = "train",
  [string]$BuildId = "chef-detector-v005-openimages",
  [ValidateSet("canonical", "broad", "object_proposal")]
  [string]$DetectorClassStrategy = "object_proposal",
  [int]$OpenImagesLimitImages = 8000,
  [int]$OpenImagesLimitBoxesPerClass = 2500,
  [double]$MaxBoxAreaRatio = 0,
  [double]$MinBoxAreaRatio = 0,
  [switch]$IncludeRpc,
  [switch]$TrainOnModal
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$Python = Join-Path $RepoRoot ".venv\Scripts\python.exe"
$VisionLab = Join-Path $RepoRoot "apps\vision-lab"
$env:PYTHONIOENCODING = "utf-8"

Set-Location $RepoRoot

Write-Host "1/5 Importing Open Images V7 bounding-box subset..."
& $Python "apps\vision-lab\import_open_images_detection_source.py" `
  --source-id "open-images-v7-kitchen-object-proposal-$OpenImagesSplit" `
  --split $OpenImagesSplit `
  --annotations-csv $OpenImagesAnnotationsCsv `
  --class-descriptions-csv $OpenImagesClassDescriptionsCsv `
  --images-dir $OpenImagesImagesDir `
  --limit-images $OpenImagesLimitImages `
  --limit-boxes-per-class $OpenImagesLimitBoxesPerClass `
  --copy-images `
  --overwrite

Write-Host "2/5 Building detector dataset without FoodSeg103..."
$SourceArgs = @(
  "--source-manifest", "apps\vision-lab\data\sources\open-images-v7-kitchen-object-proposal-$OpenImagesSplit\source_manifest.json",
  "--source-manifest", "apps\vision-lab\data\sources\teen-food-ingredient-v1\source_manifest.json"
)
if ($IncludeRpc) {
  $SourceArgs += @("--source-manifest", "apps\vision-lab\data\sources\rpc-packaged-products-v1\source_manifest.json")
}

& $Python "apps\vision-lab\build_detector_training_dataset.py" `
  --build-id $BuildId `
  @SourceArgs `
  --output-root "apps\vision-lab\data\training-builds\detector" `
  --detector-class-strategy $DetectorClassStrategy `
  --min-samples-per-label 3 `
  --max-box-area-ratio $MaxBoxAreaRatio `
  --min-box-area-ratio $MinBoxAreaRatio `
  --overwrite

Write-Host "3/5 Reporting dataset quality..."
& $Python "apps\vision-lab\report_detector_dataset_quality.py" `
  --build-dir "apps\vision-lab\data\training-builds\detector\$BuildId"

Write-Host "4/5 Copying build to canonical local detector dataset path..."
$CanonicalDataset = Join-Path $VisionLab "data\datasets\bounding-box\food-ingredient-yolo"
if (Test-Path $CanonicalDataset) {
  Remove-Item -LiteralPath $CanonicalDataset -Recurse -Force
}
New-Item -ItemType Directory -Force (Split-Path $CanonicalDataset) | Out-Null
Copy-Item -Path "apps\vision-lab\data\training-builds\detector\$BuildId" -Destination $CanonicalDataset -Recurse

if ($TrainOnModal) {
  Write-Host "5/5 Uploading, training on Modal, and downloading checkpoint..."
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
  Write-Host "5/5 Skipped Modal training. Review dataset_quality_report.md before training."
}

Write-Host "Done."
Write-Host "Dataset: apps\vision-lab\data\training-builds\detector\$BuildId"
Write-Host "Quality report: apps\vision-lab\data\training-builds\detector\$BuildId\dataset_quality_report.md"
