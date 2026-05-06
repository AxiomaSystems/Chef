$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$venvPython = Join-Path $repoRoot ".venv\Scripts\python.exe"

if (-not (Test-Path $venvPython)) {
  Write-Host "Missing .venv. Running vision setup first." -ForegroundColor Yellow
  & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "setup.ps1")
}

& $venvPython -m streamlit run (Join-Path $PSScriptRoot "app.py")
