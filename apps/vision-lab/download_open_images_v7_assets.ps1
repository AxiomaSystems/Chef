param(
  [string]$OutputDir = "apps\vision-lab\data\open-images-v7",
  [switch]$TrainBoxes,
  [switch]$ValidationBoxes,
  [switch]$TestBoxes,
  [switch]$Force
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $RepoRoot

$OutputPath = (Resolve-Path -Path (New-Item -ItemType Directory -Force $OutputDir)).Path

function Get-RemoteContentLength {
  param([Parameter(Mandatory = $true)][string]$Url)

  try {
    $Response = Invoke-WebRequest -Uri $Url -Method Head -UseBasicParsing
    $Length = $Response.Headers["Content-Length"]
    if ($Length) {
      return [int64]$Length
    }
  } catch {
    Write-Warning "Could not read remote size for $Url. Will download without size validation."
  }

  return $null
}

function Invoke-ResumableDownload {
  param(
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter(Mandatory = $true)][string]$Path
  )

  $Curl = Get-Command curl.exe -ErrorAction SilentlyContinue
  if ($Curl) {
    & $Curl.Source -L --fail --retry 8 --retry-all-errors --connect-timeout 30 --continue-at - --output $Path $Url
    if ($LASTEXITCODE -ne 0) {
      throw "curl.exe failed with exit code $LASTEXITCODE while downloading $Url"
    }
    return
  }

  Invoke-WebRequest -Uri $Url -OutFile $Path -UseBasicParsing
}

$Downloads = @(
  @{
    Name = "boxable class descriptions"
    Url = "https://storage.googleapis.com/openimages/v7/oidv7-class-descriptions-boxable.csv"
    Path = Join-Path $OutputPath "oidv7-class-descriptions-boxable.csv"
  },
  @{
    Name = "official downloader.py"
    Url = "https://raw.githubusercontent.com/openimages/dataset/master/downloader.py"
    Path = Join-Path $OutputPath "downloader.py"
  }
)

if ($TrainBoxes) {
  $Downloads += @{
    Name = "train bounding boxes"
    Url = "https://storage.googleapis.com/openimages/v6/oidv6-train-annotations-bbox.csv"
    Path = Join-Path $OutputPath "oidv6-train-annotations-bbox.csv"
  }
}

if ($ValidationBoxes) {
  $Downloads += @{
    Name = "validation bounding boxes"
    Url = "https://storage.googleapis.com/openimages/v5/validation-annotations-bbox.csv"
    Path = Join-Path $OutputPath "validation-annotations-bbox.csv"
  }
}

if ($TestBoxes) {
  $Downloads += @{
    Name = "test bounding boxes"
    Url = "https://storage.googleapis.com/openimages/v5/test-annotations-bbox.csv"
    Path = Join-Path $OutputPath "test-annotations-bbox.csv"
  }
}

foreach ($Download in $Downloads) {
  $ExpectedLength = Get-RemoteContentLength -Url $Download.Url

  if ((Test-Path $Download.Path) -and -not $Force) {
    $CurrentLength = (Get-Item -LiteralPath $Download.Path).Length
    if ($null -eq $ExpectedLength -or $CurrentLength -eq $ExpectedLength) {
      Write-Host "Already have $($Download.Name): $($Download.Path)"
      continue
    }

    Write-Warning "$($Download.Name) is incomplete: $CurrentLength of $ExpectedLength bytes. Resuming download..."
  } elseif ((Test-Path $Download.Path) -and $Force) {
    Remove-Item -LiteralPath $Download.Path -Force
  }

  Write-Host "Downloading $($Download.Name)..."
  Invoke-ResumableDownload -Url $Download.Url -Path $Download.Path

  if ($null -ne $ExpectedLength) {
    $FinalLength = (Get-Item -LiteralPath $Download.Path).Length
    if ($FinalLength -ne $ExpectedLength) {
      throw "$($Download.Name) download is incomplete after retry: $FinalLength of $ExpectedLength bytes at $($Download.Path)"
    }
  }
}

Write-Host "Done."
Write-Host "Open Images assets: $OutputPath"
Write-Host ""
Write-Host "Typical next commands:"
Write-Host ".\.venv\Scripts\python.exe apps\vision-lab\import_open_images_detection_source.py ``"
Write-Host "  --source-id open-images-v7-kitchen-object-proposal-train ``"
Write-Host "  --split train ``"
Write-Host "  --annotations-csv `"$OutputPath\oidv6-train-annotations-bbox.csv`" ``"
Write-Host "  --class-descriptions-csv `"$OutputPath\oidv7-class-descriptions-boxable.csv`" ``"
Write-Host "  --limit-images 8000 ``"
Write-Host "  --limit-boxes-per-class 2500 ``"
Write-Host "  --overwrite"
