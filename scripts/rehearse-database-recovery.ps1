[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$RecoveryDatabaseName,

  [Parameter(Mandatory = $true)]
  [string]$SourceDatabaseUrlVariableName,

  [Parameter(Mandatory = $true)]
  [string]$RecoveryAdminDatabaseUrlVariableName,

  [string]$ApiReadinessOriginVariableName,
  [string]$WebReadinessOriginVariableName,
  [string]$ImageName = "preppie-database-backup:rehearsal",
  [string]$EvidencePath = ".superpowers/sdd/task-3-local-evidence.json",
  [switch]$Cleanup
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-RequiredEnvironmentValue {
  param([string]$Name, [string]$Label)

  if ($Name -notmatch '^[A-Z][A-Z0-9_]*$') {
    throw "$Label environment variable name is invalid."
  }
  $value = [Environment]::GetEnvironmentVariable($Name, "Process")
  if ([string]::IsNullOrWhiteSpace($value)) {
    throw "$Label environment variable is not set."
  }
  return $value
}

function Invoke-RehearsalHelper {
  param([string[]]$Arguments, [switch]$InContainer)

  if ($InContainer) {
    $output = & docker run --rm --add-host=host.docker.internal:host-gateway `
      --env SOURCE_DATABASE_URL `
      --env RECOVERY_ADMIN_DATABASE_URL `
      --env BACKUP_RUN_ID `
      --entrypoint node `
      $ImageName `
      scripts/recovery-rehearsal-db.mjs @Arguments 2>$null
  }
  else {
    $output = & node scripts/recovery-rehearsal-db.mjs @Arguments 2>$null
  }
  if ($LASTEXITCODE -ne 0) {
    throw "Recovery rehearsal metadata command failed."
  }
  return ($output | ConvertFrom-Json)
}

function Test-IsolatedReadinessOrigin {
  param([string]$VariableName, [string]$Path)

  if ([string]::IsNullOrWhiteSpace($VariableName)) {
    return 0
  }
  $validated = Invoke-RehearsalHelper -Arguments @("origin-env", $VariableName)
  try {
    $response = Invoke-WebRequest -Uri "$($validated.origin)$Path" -Method Get -MaximumRedirection 0 -TimeoutSec 30
    if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) {
      throw "Readiness probe returned a non-success status."
    }
  }
  catch {
    throw "Isolated readiness probe failed."
  }
}

function Write-RehearsalEvidence {
  param(
    [string]$CurrentStatus,
    $Resolution,
    [string]$VerifiedDatabaseName,
    $Verification,
    [DateTimeOffset]$Started,
    [DateTimeOffset]$Finished,
    $Durations
  )

  $evidence = [ordered]@{
    status = $CurrentStatus
    startedAt = $Started.ToString("o")
    finishedAt = $Finished.ToString("o")
    stageDurationsMs = $Durations
  }
  if ($null -ne $Resolution) {
    $evidence.runId = $Resolution.runId
    $evidence.databaseName = $VerifiedDatabaseName
  }
  if ($null -ne $Verification) {
    $evidence.sourceLatestMigration = $Verification.sourceLatestMigration
    $evidence.restoredLatestMigration = $Verification.restoredLatestMigration
    $evidence.migrationCount = $Verification.migrationCount
    $evidence.databaseSizeBytes = $Verification.databaseSizeBytes
    $evidence.tableCounts = $Verification.tableCounts
  }

  $evidenceJson = $evidence | ConvertTo-Json -Depth 5
  if ($null -ne $Resolution) {
    [Environment]::SetEnvironmentVariable("REHEARSAL_EVIDENCE_JSON", $evidenceJson, "Process")
    $evidence = Invoke-RehearsalHelper -Arguments @("evidence-env")
    $evidenceJson = $evidence | ConvertTo-Json -Depth 5
  }
  $evidenceDirectory = Split-Path -Parent $EvidencePath
  if (-not [string]::IsNullOrWhiteSpace($evidenceDirectory)) {
    New-Item -ItemType Directory -Force -Path $evidenceDirectory | Out-Null
  }
  [IO.File]::WriteAllText(
    [IO.Path]::GetFullPath($EvidencePath),
    $evidenceJson,
    [Text.UTF8Encoding]::new($false)
  )
  return $evidenceJson
}

$startedAt = [DateTimeOffset]::UtcNow
$totalTimer = [Diagnostics.Stopwatch]::StartNew()
$stageDurations = [ordered]@{}
$status = "failed"
$resolved = $null
$actualDatabaseName = $null
$inspection = $null
$previousSource = [Environment]::GetEnvironmentVariable("SOURCE_DATABASE_URL", "Process")
$previousRecovery = [Environment]::GetEnvironmentVariable("RECOVERY_ADMIN_DATABASE_URL", "Process")
$previousRunId = [Environment]::GetEnvironmentVariable("BACKUP_RUN_ID", "Process")
$previousEvidence = [Environment]::GetEnvironmentVariable("REHEARSAL_EVIDENCE_JSON", "Process")

try {
  $resolved = Invoke-RehearsalHelper -Arguments @("resolve", $RecoveryDatabaseName)
  $sourceUrl = Get-RequiredEnvironmentValue -Name $SourceDatabaseUrlVariableName -Label "Source database URL"
  $recoveryUrl = Get-RequiredEnvironmentValue -Name $RecoveryAdminDatabaseUrlVariableName -Label "Recovery admin database URL"
  [Environment]::SetEnvironmentVariable("SOURCE_DATABASE_URL", $sourceUrl, "Process")
  [Environment]::SetEnvironmentVariable("RECOVERY_ADMIN_DATABASE_URL", $recoveryUrl, "Process")
  [Environment]::SetEnvironmentVariable("BACKUP_RUN_ID", $resolved.runId, "Process")

  $backupTimer = [Diagnostics.Stopwatch]::StartNew()
  $workerOutput = @(
    & docker run --rm --add-host=host.docker.internal:host-gateway `
      --env SOURCE_DATABASE_URL `
      --env RECOVERY_ADMIN_DATABASE_URL `
      --env BACKUP_RUN_ID `
      $ImageName 2>&1
  )
  $workerExitCode = $LASTEXITCODE
  $backupTimer.Stop()
  $stageDurations.backupRestore = [int64]$backupTimer.ElapsedMilliseconds
  if ($workerExitCode -ne 0) {
    throw "Backup worker did not verify a rehearsal database."
  }

  $verifiedEvents = @()
  foreach ($line in $workerOutput) {
    try {
      $event = "$line" | ConvertFrom-Json
      if ($event.event -eq "backup_verified" -and $event.status -eq "verified") {
        $verifiedEvents += $event
      }
    }
    catch {
      throw "Backup worker emitted non-metadata output."
    }
  }
  if ($verifiedEvents.Count -ne 1) {
    throw "Backup worker did not emit one verified metadata event."
  }
  $actualDatabaseName = $verifiedEvents[0].databaseName
  if ($actualDatabaseName -notin @($resolved.databaseName, $resolved.retryDatabaseName)) {
    throw "Backup worker verified an unexpected recovery database."
  }

  $inspection = Invoke-RehearsalHelper -Arguments @("inspect", $RecoveryDatabaseName, $actualDatabaseName) -InContainer

  if (-not [string]::IsNullOrWhiteSpace($ApiReadinessOriginVariableName)) {
    $apiTimer = [Diagnostics.Stopwatch]::StartNew()
    Test-IsolatedReadinessOrigin -VariableName $ApiReadinessOriginVariableName -Path "/ready"
    $apiTimer.Stop()
    $stageDurations.apiReadiness = [int64]$apiTimer.ElapsedMilliseconds
  }
  if (-not [string]::IsNullOrWhiteSpace($WebReadinessOriginVariableName)) {
    $webTimer = [Diagnostics.Stopwatch]::StartNew()
    Test-IsolatedReadinessOrigin -VariableName $WebReadinessOriginVariableName -Path "/"
    $webTimer.Stop()
    $stageDurations.webReadiness = [int64]$webTimer.ElapsedMilliseconds
  }

  $status = "passed"
}
finally {
  $totalTimer.Stop()
  $stageDurations.total = [int64]$totalTimer.ElapsedMilliseconds
  try {
    $finishedAt = [DateTimeOffset]::UtcNow
    $evidenceJson = Write-RehearsalEvidence -CurrentStatus $status -Resolution $resolved -VerifiedDatabaseName $actualDatabaseName -Verification $inspection -Started $startedAt -Finished $finishedAt -Durations $stageDurations

    if ($status -eq "passed" -and $Cleanup -and $null -ne $resolved) {
      $cleanupTimer = [Diagnostics.Stopwatch]::StartNew()
      foreach ($candidate in @($resolved.databaseName, $resolved.retryDatabaseName)) {
        [void](Invoke-RehearsalHelper -Arguments @("cleanup", $RecoveryDatabaseName, $candidate) -InContainer)
      }
      $cleanupTimer.Stop()
      $stageDurations.cleanup = [int64]$cleanupTimer.ElapsedMilliseconds
      $stageDurations.total = [int64]$stageDurations.total + [int64]$stageDurations.cleanup
      $finishedAt = [DateTimeOffset]::UtcNow
      $evidenceJson = Write-RehearsalEvidence -CurrentStatus $status -Resolution $resolved -VerifiedDatabaseName $actualDatabaseName -Verification $inspection -Started $startedAt -Finished $finishedAt -Durations $stageDurations
    }
  }
  finally {
    [Environment]::SetEnvironmentVariable("SOURCE_DATABASE_URL", $previousSource, "Process")
    [Environment]::SetEnvironmentVariable("RECOVERY_ADMIN_DATABASE_URL", $previousRecovery, "Process")
    [Environment]::SetEnvironmentVariable("BACKUP_RUN_ID", $previousRunId, "Process")
    [Environment]::SetEnvironmentVariable("REHEARSAL_EVIDENCE_JSON", $previousEvidence, "Process")
  }
  Write-Output $evidenceJson
}
