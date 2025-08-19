#!/usr/bin/env pwsh
<#
.SYNOPSIS
  PayRox One-Click Refactor client (PowerShell).

.DESCRIPTION
  Posts a JSON payload to the refactor service (e.g. http://127.0.0.1:8000/oneclick/refactor),
  validates inputs, retries on transient failures, and writes results to artifacts.

.PARAMETER Root
  Contracts root to scan/refactor.

.PARAMETER Model
  LLM model id for the refactor service.

.PARAMETER Pinned
  Path to pinned knowledge file (markdown) used as context.

.PARAMETER K
  Top-k candidates/alternatives.

.PARAMETER OutDir
  Output directory for generated code.

.PARAMETER ManifestOut
  Path for generated manifest JSON.

.PARAMETER Url
  Refactor endpoint URL.

.PARAMETER TimeoutSec
  HTTP timeout for each attempt.

.PARAMETER Retries
  Number of retry attempts on non-fatal failures.

.ENV
  PRX_REF_TOKEN  -> if set, added as "Authorization: Bearer <token>" header.

#>

[CmdletBinding(PositionalBinding = $false)]
param(
  [Parameter()][ValidateNotNullOrEmpty()]
  [string]$Root = (Join-Path (Get-Location) 'contracts'),

  [Parameter()][ValidateNotNullOrEmpty()]
  [string]$Model = 'codellama:7b-instruct',

  [Parameter()][ValidateNotNullOrEmpty()]
  [string]$Pinned = (Join-Path (Get-Location) '.payrox/pinned-go-beyond.md'),

  [Parameter()][ValidateRange(1,64)]
  [int]$K = 8,

  [Parameter()][ValidateNotNullOrEmpty()]
  [string]$OutDir = 'contracts/ai',

  [Parameter()][ValidateNotNullOrEmpty()]
  [string]$ManifestOut = 'arch/manifests/ai-manifest.json',

  [Parameter()][ValidateNotNullOrEmpty()]
  [string]$Mode = 'full',  # full|lint|preview

  [Parameter()][ValidateNotNullOrEmpty()]
  [Uri]$Url = [Uri]'http://127.0.0.1:8000/oneclick/refactor',

  [Parameter()][ValidateRange(5, 1200)]
  [int]$TimeoutSec = 300,

  [Parameter()][ValidateRange(0, 5)]
  [int]$Retries = 2
)

$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
$ProgressPreference = 'SilentlyContinue'

function Fail([string]$msg, [int]$code = 1) {
  Write-Error $msg
  exit $code
}

# ── Pre-flight checks ───────────────────────────────────────────────────────────
if (-not (Test-Path -Path $Root -PathType Container)) { Fail "Root not found: $Root" }
if (-not (Test-Path -Path $Pinned -PathType Leaf))    { Fail "Pinned file not found: $Pinned" }

# Ensure output dirs exist
$null = New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$manifestDir = Split-Path -Path $ManifestOut -Parent
if (-not [string]::IsNullOrWhiteSpace($manifestDir)) {
  $null = New-Item -ItemType Directory -Force -Path $manifestDir | Out-Null
}
$artifactsDir = 'artifacts/refactor'
$null = New-Item -ItemType Directory -Force -Path $artifactsDir | Out-Null

# Build request body
$bodyObj = @{
  root            = $Root
  mode            = $Mode
  k               = $K
  model           = $Model
  pinnedPath      = $Pinned
  outDir          = $OutDir
  manifestOut     = $ManifestOut
  compile         = $true
  fixImports      = $true
  normalizeFacets = $true
}
$bodyJson = $bodyObj | ConvertTo-Json -Depth 100

# Headers (optional Authorization)
$headers = @{'Content-Type' = 'application/json; charset=utf-8' }
if ($env:PRX_REF_TOKEN) { $headers['Authorization'] = "Bearer $($env:PRX_REF_TOKEN)" }

# ── Request with retries ────────────────────────────────────────────────────────
$attempt = 0
$resp = $null
$lastErr = $null

while ($attempt -le $Retries) {
  try {
    Write-Host ("[refactor] POST {0} (attempt {1}/{2})" -f $Url, ($attempt+1), ($Retries+1))
    $resp = Invoke-RestMethod -Method POST -Uri $Url -Body $bodyJson -Headers $headers -TimeoutSec $TimeoutSec
    break
  } catch {
    $lastErr = $_
    if ($attempt -lt $Retries) {
      $backoff = [int][Math]::Pow(2, $attempt) * 2
      Write-Warning ("Attempt {0} failed: {1}. Retrying in {2}s..." -f ($attempt+1), $_.Exception.Message, $backoff)
      Start-Sleep -Seconds $backoff
    }
  }
  $attempt++
}

if (-not $resp) {
  # Try to surface server error body if available
  if ($lastErr -and $lastErr.Exception.Response) {
    try {
      $reader = New-Object System.IO.StreamReader($lastErr.Exception.Response.GetResponseStream())
      $errBody = $reader.ReadToEnd()
      $errPath = Join-Path $artifactsDir 'error-response.json'
      $errBody | Out-File -FilePath $errPath -Encoding utf8
      Write-Warning "Server error body saved: $errPath"
    } catch {}
  }
  Fail "Refactor request failed after $($Retries+1) attempts."
}

# ── Persist and summarize ───────────────────────────────────────────────────────
$resultPath = Join-Path $artifactsDir 'refactor-result.json'
try {
  ($resp | ConvertTo-Json -Depth 100) | Out-File -FilePath $resultPath -Encoding utf8
  Write-Host "✅ Refactor completed. Result saved: $resultPath"
} catch {
  Write-Warning "Could not serialize response to JSON: $($_.Exception.Message)"
}

# Basic summary (best-effort — adapt to your API schema)
try {
  $ok = $resp.ok
  $changed = $resp.changedFiles.Count
  $generated = $resp.generatedFiles.Count
  $manifest = $resp.manifestPath
  Write-Host ("Summary: ok={0} changed={1} generated={2} manifest={3}" -f $ok, $changed, $generated, $manifest)
} catch {
  Write-Host "Summary unavailable (non-standard response schema)."
}

# Exit non-zero if API signals failure
if ($resp.ok -is [bool] -and -not $resp.ok) {
  Fail "Refactor API returned ok=false"
}

exit 0
