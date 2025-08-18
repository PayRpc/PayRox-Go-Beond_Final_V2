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

  $pyCmd = Get-Command python3 -ErrorAction SilentlyContinue
  if (-not $pyCmd) { $pyCmd = Get-Command python -ErrorAction SilentlyContinue }
  if (-not $pyCmd) { $pyCmd = Get-Command py -ErrorAction SilentlyContinue }
  if (-not $pyCmd) { 
    # Try looking in common paths on Windows
    $pythonPaths = @("C:\Python*\python.exe", "C:\Program Files\Python*\python.exe", "$env:LOCALAPPDATA\Programs\Python\Python*\python.exe")
    foreach ($pattern in $pythonPaths) {
      $found = Get-ChildItem $pattern -ErrorAction SilentlyContinue | Select-Object -First 1
      if ($found) {
        $pyCmd = $found
        break
      }
    }
  }
  if (-not $pyCmd) { throw "Python not found on PATH or common locations (need 'python3', 'python' or 'py')." }
  $pythonExe = $pyCmd.Source ?? $pyCmd.Path
  
  Write-Host "DEBUG: Using Python executable: $pythonExe" -ForegroundColor Cyan

  # Create temp file in a cross-platform way
  $tempDir = if ($env:TEMP) { $env:TEMP } elseif ($env:TMPDIR) { $env:TMPDIR } else { "/tmp" }
  $tmpPy = Join-Path $tempDir "split_and_manifest_$([Guid]::NewGuid().ToString('N')).py"
  @'
import sys, json, os, pathlib
# Add both current directory and parent for module imports
sys.path.insert(0, '.')
sys.path.insert(0, os.path.abspath('.'))
sys.path.insert(0, os.path.join(os.path.abspath('.'), 'app'))

try:
    from app.utils.facet_splitter import split_facet_file
    print(f"DEBUG: Successfully imported from app.utils.facet_splitter", file=sys.stderr)
except ImportError as e1:
    print(f"DEBUG: Failed to import from app.utils.facet_splitter: {e1}", file=sys.stderr)
    try:
        from utils.facet_splitter import split_facet_file
        print(f"DEBUG: Successfully imported from utils.facet_splitter", file=sys.stderr)
    except ImportError as e2:
        print(f"DEBUG: Failed to import from utils.facet_splitter: {e2}", file=sys.stderr)
        # Fallback: define a minimal splitter inline
        import re
        from pathlib import Path
        
        def split_facet_file(source_path):
            print(f"DEBUG: Using fallback splitter for {source_path}", file=sys.stderr)
            p = Path(source_path)
            if not p.exists():
                raise FileNotFoundError(source_path)
            
            text = p.read_text(encoding='utf-8', errors='ignore')
            # Simple regex-based splitter
            func_re = re.compile(r"function\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)\s*(public|external)")
            sigs = []
            for m in func_re.finditer(text):
                name = m.group(1)
                args = m.group(2).strip()
                sigs.append(f"{name}({args})")
            
            # Return a single facet with all functions
            return [{
                "name": "ManifestDispatcher",
                "code": text,
                "selectors": sigs,
                "size": len(text.encode('utf-8'))
            }]

try:
    src    = sys.argv[1]
    outdir = sys.argv[2]
    print(f"DEBUG: Processing {src} -> {outdir}", file=sys.stderr)
    parts  = split_facet_file(src)
    print(f"DEBUG: Got {len(parts)} parts", file=sys.stderr)

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
except Exception as e:
    print(f"ERROR: {e}", file=sys.stderr)
    import traceback
    traceback.print_exc(file=sys.stderr)
    sys.exit(1)
'@ | Set-Content -Path $tmpPy -Encoding UTF8

  $json = & $pythonExe $tmpPy $src $OutDir 2>&1
  $exitCode = $LASTEXITCODE
  
  # Always clean up temp file
  Remove-Item $tmpPy -Force -ErrorAction SilentlyContinue
  
  # Check for Python execution errors
  if ($exitCode -ne 0) {
    Write-Error "Python splitter failed with exit code $exitCode. Output: $json"
    exit 1
  }
  
  # Parse the JSON output (last line should be the JSON)
  $jsonLines = $json -split "`n" | Where-Object { $_.Trim() -ne "" }
  $jsonOutput = $jsonLines[-1]  # Last non-empty line should be JSON

  $summary = $jsonOutput | ConvertFrom-Json
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
