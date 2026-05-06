param(
  [switch]$Live
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$venvDir = Join-Path $repoRoot ".venv"
$venvPython = Join-Path $venvDir "Scripts\python.exe"
$requirements = Join-Path $PSScriptRoot "requirements.txt"
$liveRequirements = Join-Path $PSScriptRoot "requirements-live.txt"

function Test-PythonCandidate {
  param(
    [string]$Command,
    [string[]]$Arguments
  )

  try {
    $versionText = & $Command @Arguments -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}')"
    if ($LASTEXITCODE -ne 0) {
      return $false
    }

    $parts = $versionText.Trim().Split(".")
    $major = [int]$parts[0]
    $minor = [int]$parts[1]

    return ($major -eq 3 -and $minor -ge 11 -and $minor -le 13)
  } catch {
    return $false
  }
}

function Resolve-PythonCommand {
  $candidates = @()

  $py = Get-Command py -ErrorAction SilentlyContinue
  if ($py) {
    foreach ($version in @("3.13", "3.12", "3.11")) {
      $candidates += [pscustomobject]@{
        Command = $py.Source
        Args = @("-$version")
      }
    }
  }

  $python = Get-Command python -ErrorAction SilentlyContinue
  if ($python) {
    $candidates += [pscustomobject]@{
      Command = $python.Source
      Args = @()
    }
  }

  foreach ($candidate in $candidates) {
    if (Test-PythonCandidate -Command $candidate.Command -Arguments $candidate.Args) {
      return @($candidate.Command) + $candidate.Args
    }
  }

  return $null
}

$pythonCommand = Resolve-PythonCommand

if (-not $pythonCommand) {
  Write-Host "Python 3.11, 3.12, or 3.13 is required for apps/vision-lab, but a compatible Python was not found on PATH." -ForegroundColor Red
  Write-Host "Install Python 3.11, 3.12, or 3.13, then rerun:"
  Write-Host "  pnpm vision:setup"
  Write-Host ""
  Write-Host "Windows option:"
  Write-Host "  winget install Python.Python.3.11"
  exit 1
}

if (-not (Test-Path $venvPython)) {
  Write-Host "Creating Python virtual environment at .venv"
  $pythonArgs = @()
  if ($pythonCommand.Length -gt 1) {
    $pythonArgs = $pythonCommand[1..($pythonCommand.Length - 1)]
  }
  & $pythonCommand[0] @pythonArgs -m venv $venvDir
}

Write-Host "Upgrading pip"
& $venvPython -m pip install --upgrade pip

Write-Host "Installing vision-lab requirements"
& $venvPython -m pip install -r $requirements

if ($Live) {
  Write-Host "Installing optional live camera requirements"
  & $venvPython -m pip install -r $liveRequirements
}

Write-Host "Vision lab Python setup complete."
