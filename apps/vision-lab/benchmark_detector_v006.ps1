param(
  [string]$BuildId = "chef-detector-v006-foodinsseg-80plus",
  [string[]]$CandidateModels = @(),
  [int]$LimitImages = 0,
  [double]$ConfidenceThreshold = 0.25
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$Python = Join-Path $RepoRoot ".venv\Scripts\python.exe"
$DatasetBuild = "apps\vision-lab\data\training-builds\detector\$BuildId"
$OutputRoot = "apps\vision-lab\reports\vision\$BuildId-benchmark"
$env:PYTHONIOENCODING = "utf-8"

Set-Location $RepoRoot

if (-not (Test-Path $DatasetBuild)) {
  throw "Missing dataset build: $DatasetBuild. Run apps\vision-lab\build_detector_v006_foodinsseg.ps1 first."
}

if ($CandidateModels.Count -eq 0) {
  $CandidateModels = @(
    "apps\vision-lab\checkpoints\detectors\ingredient\yolo11n_ingredient_detector_$BuildId\weights\best.pt",
    "apps\vision-lab\checkpoints\detectors\ingredient\yolo11n_ingredient_detector_chef-detector-v005b-openimages-filtered\weights\best.pt",
    "apps\vision-lab\checkpoints\detectors\ingredient\yolo11n_ingredient_detector_chef-detector-v004-object-proposal\weights\best.pt",
    "apps\vision-lab\checkpoints\detectors\ingredient\yolo11n_ingredient_detector_chef-detector-v002\weights\best.pt"
  )
}

foreach ($Model in $CandidateModels) {
  if (-not (Test-Path $Model)) {
    Write-Warning "Skipping missing model: $Model"
    continue
  }

  $RunName = Split-Path (Split-Path (Split-Path $Model -Parent) -Parent) -Leaf
  $OutputDir = Join-Path $OutputRoot $RunName

  Write-Host "Benchmarking $RunName..."
  $Args = @(
    "apps\vision-lab\benchmark_vision_detector_matrix.py",
    "--dataset-build", $DatasetBuild,
    "--candidate-model", $Model,
    "--baseline-model", "yolo11n.pt",
    "--output-dir", $OutputDir,
    "--split", "test",
    "--confidence-threshold", "$ConfidenceThreshold"
  )
  if ($LimitImages -gt 0) {
    $Args += @("--limit-images", "$LimitImages")
  }
  & $Python @Args
}

Write-Host "Done."
Write-Host "Reports: $OutputRoot"
Write-Host "For detector-only comparison, read each report's C_* candidate metrics and ignore *_resnet rows."
