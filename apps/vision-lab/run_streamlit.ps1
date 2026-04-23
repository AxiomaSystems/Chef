$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$venvPython = Join-Path $repoRoot ".venv\Scripts\python.exe"

if (-not (Test-Path $venvPython)) {
  Write-Host "Missing .venv. Create it first with:" -ForegroundColor Yellow
  Write-Host "python -m venv .venv"
  exit 1
}

& $venvPython -m streamlit run (Join-Path $PSScriptRoot "app.py")
