param(
  [switch]$SkipVision,
  [switch]$LiveVision
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$envFile = Join-Path $repoRoot ".env"
$envExample = Join-Path $repoRoot ".env.example"

Set-Location $repoRoot

if (-not (Test-Path $envFile)) {
  Write-Host "Creating .env from .env.example"
  Copy-Item $envExample $envFile
} else {
  Write-Host ".env already exists; leaving it unchanged"
}

Write-Host "Installing Node dependencies"
pnpm install --frozen-lockfile

$docker = Get-Command docker -ErrorAction SilentlyContinue
if (-not $docker) {
  Write-Host "Docker Desktop is required for the local PostgreSQL database, but docker was not found on PATH." -ForegroundColor Red
  Write-Host "Install Docker Desktop, start it, then rerun:"
  Write-Host "  pnpm setup"
  exit 1
}

Write-Host "Starting local PostgreSQL"
docker compose -f infra/docker/docker-compose.yml up -d

Write-Host "Generating Prisma client"
pnpm --filter api prisma:generate

Write-Host "Applying database migrations"
pnpm --dir apps/api exec prisma migrate deploy

Write-Host "Seeding database"
pnpm --filter api db:seed

if (-not $SkipVision) {
  Write-Host "Setting up vision lab"
  $visionSetupArgs = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ".\apps\vision-lab\setup.ps1")
  if ($LiveVision) {
    $visionSetupArgs += "-Live"
  }
  powershell @visionSetupArgs
} else {
  Write-Host "Skipping vision setup"
}

Write-Host "Development setup complete. Run pnpm dev to start web, API, and vision."
