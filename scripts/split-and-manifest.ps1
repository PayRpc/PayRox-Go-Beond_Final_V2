[CmdletBinding()]
param(
  [string]$Source,                         # e.g. contracts\dispacher\ManifestDispacher.sol
  [string]$OutDir = "build\split",         # where to write parts + manifest JSON
  [switch]$FailOnEmptyParts,               # exit non-zero if any part has 0 selectors
  [switch]$CiMode                          # extra checks for CI
)

function Resolve-SourceFile {
  param([string]$Path)
  if ($Path -and (Test-Path $Path)) { return (Resolve-Path $Path).Path }
  $candidates = Get-ChildItem -Recurse -File -Include `
    'Manifest*Dispatcher*.sol','*ManifestDispacher*.sol','*ManifestDispatcher*.sol' `
    -ErrorAction SilentlyContinue
  if ($candidates.Count -eq 1) { return $candidates[0].FullName }
  $list = ($candidates | ForEach-Object { "  - " + $_.FullName }) -join "`n"
  throw "Provide -Source <path-to-.sol>. Candidates:`n$list"
}

try {
  $src = Resolve-SourceFile -Path $Source
  New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

  $pyCmd = Get-Command python -ErrorAction SilentlyContinue
  if (-not $pyCmd) { $pyCmd = Get-Command py -ErrorAction SilentlyContinue }
  if (-not $pyCmd) { throw "Python not found on PATH (need 'python' or 'py')." }
  $pythonExe = $pyCmd.Source

  $tmpPy = Join-Path $env:TEMP "split_and_manifest_$([Guid]::NewGuid().ToString('N')).py"
  @'
import sys, json, os, pathlib
sys.path.insert(0, '.')
from app.utils.facet_splitter import split_facet_file

src    = sys.argv[1]
outdir = sys.argv[2]
parts  = split_facet_file(src)

pathlib.Path(outdir).mkdir(parents=True, exist_ok=True)
for i, part in enumerate(parts):
    with open(os.path.join(outdir, f"part_{i}.sol"), "w", encoding="utf-8") as f:
        f.write(part.get("code",""))
    with open(os.path.join(outdir, f"part_{i}.json"), "w", encoding="utf-8") as f:
        json.dump(part, f, indent=2)

combined = {
    "file": src,
    "parts": len(parts),
    "selectors": sum(len(p.get("selectors", [])) for p in parts),
    "by_part": [{"file": f"part_{i}.sol", "functions": len(p.get("selectors", []))} for i,p in enumerate(parts)]
}
with open(os.path.join(outdir, "combined.json"), "w", encoding="utf-8") as f:
    json.dump(combined, f, indent=2)

print(json.dumps(combined))
'@ | Set-Content -Path $tmpPy -Encoding UTF8

  $json = & $pythonExe $tmpPy $src $OutDir
  Remove-Item $tmpPy -Force -ErrorAction SilentlyContinue

  $summary = $json | ConvertFrom-Json
  Write-Host (("Split OK → Parts: {0}, Total selectors: {1}" -f $summary.parts, $summary.selectors)) -ForegroundColor Green
  # Post-process to drop empty parts and rewrite combined.json
  Write-Host "Post-processing split outputs..." -ForegroundColor Cyan
  node scripts/postprocess-splits.js --dir $OutDir
  if ($LASTEXITCODE -ne 0) { throw "postprocess failed" }

  # Re-read combined.json for updated counts
  $combined = Get-Content (Join-Path $OutDir 'combined.json') -Raw | ConvertFrom-Json
  Write-Host (("Postprocessed → Kept parts: {0}, Total selectors: {1}" -f $combined.parts.Count, $combined.selectors.Count)) -ForegroundColor Green

  # Strict check (only fail if any empty parts remain after postprocess)
  if ($FailOnEmptyParts) {
    $leftovers = Get-ChildItem -Path $OutDir -Filter "part_*.json" | ForEach-Object {
      $j = Get-Content $_.FullName -Raw | ConvertFrom-Json
      if ($j.selectors.Count -eq 0) { $_ }
    }
    if ($leftovers) {
      Write-Error "Empty parts remain after postprocess: $($leftovers | ForEach-Object { $_.Name } -join ', ')"
      exit 1
    }
  }
  if ($CiMode -and -not (Test-Path (Join-Path $OutDir 'combined.json'))) {
    Write-Error "combined.json missing in $OutDir"
    exit 3
  }
  exit 0
}
catch {
  Write-Error $_.Exception.Message
  exit 1
}

<#
Example usage:
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\split-and-manifest.ps1 \
    -Source contracts\dispacher\ManifestDispacher.sol \
    -OutDir build\split

Optional flags:
  -FailOnEmptyParts    # exit non-zero if any split has zero functions
  -CiMode              # extra CI checks
#>
