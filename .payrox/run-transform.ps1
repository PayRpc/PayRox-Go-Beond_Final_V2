param(
    [Parameter(Mandatory=$false)]
    [string]$FilePath = ".payrox\samples\MyContract.sol",

    [Parameter(Mandatory=$false)]
    [string]$Contract = "MyContract",

    [Parameter(Mandatory=$false)]
    [string]$SaveTo = "",

    [Parameter(Mandatory=$false)]
    [string]$NodeBin = $(if ($env:NODE_BIN) { $env:NODE_BIN } else { 'node' }),

    [Parameter(Mandatory=$false)]
    [string]$RepoRoot = $(Get-Location)
)

Set-StrictMode -Version Latest

Write-Host "Running transformer wrapper"
Write-Host "FilePath: $FilePath"
Write-Host "Contract: $Contract"
Write-Host "NodeBin: $NodeBin"
Write-Host "RepoRoot: $RepoRoot"

# Resolve full paths
$scriptPath = Join-Path $RepoRoot "scripts\transformers\transform-one.js"
if (-not (Test-Path $scriptPath)) {
    Write-Error "Transformer script not found: $scriptPath"
    exit 1
}

$absFile = Resolve-Path -Path $FilePath -ErrorAction SilentlyContinue
if (-not $absFile) {
    Write-Error "Source file not found: $FilePath"
    exit 1
}
$absFile = $absFile.Path

# Build command
$cmd = @($NodeBin, $scriptPath, '--file', $absFile)
if ($Contract) { $cmd += @('--contract', $Contract) }
if ($SaveTo) { $cmd += @('--save-to', $SaveTo) }

Write-Host "Executing: $($cmd -join ' ')"

$processInfo = New-Object System.Diagnostics.ProcessStartInfo
$processInfo.FileName = $cmd[0]
$processInfo.Arguments = ($cmd[1..($cmd.Length - 1)] -join ' ')
$processInfo.WorkingDirectory = $RepoRoot
$processInfo.RedirectStandardOutput = $true
$processInfo.RedirectStandardError = $true
$processInfo.UseShellExecute = $false
$processInfo.CreateNoWindow = $true

$proc = New-Object System.Diagnostics.Process
$proc.StartInfo = $processInfo
$proc.Start() | Out-Null

$stdOut = $proc.StandardOutput.ReadToEnd()
$stdErr = $proc.StandardError.ReadToEnd()
$proc.WaitForExit()
$rc = $proc.ExitCode

Write-Host "ExitCode: $rc"
if ($stdOut) { Write-Host "--- STDOUT ---"; Write-Host $stdOut }
if ($stdErr) { Write-Host "--- STDERR ---"; Write-Host $stdErr }

# Try to discover produced files under .payrox/generated/transformers
$generatedRoot = Join-Path $RepoRoot ".payrox\generated\transformers"
if (Test-Path $generatedRoot) {
    Write-Host "Looking for generated artifacts under: $generatedRoot"
    Get-ChildItem -Path $generatedRoot -Recurse -File | Sort-Object LastWriteTime -Descending | Select-Object FullName, Length, LastWriteTime -First 20 | Format-Table -AutoSize
} else {
    Write-Host "No generated artifacts directory found: $generatedRoot"
}

exit $rc
