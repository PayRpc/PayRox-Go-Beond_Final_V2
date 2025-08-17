param(
  [string]$Root = "$(Get-Location)\contracts",
  [string]$Model = "codellama:7b-instruct",
  [string]$Pinned = "$(Get-Location)\.payrox\pinned-go-beyond.md",
  [int]$K = 8,
  [string]$OutDir = "contracts/ai",
  [string]$ManifestOut = "arch/manifests/ai-manifest.json",
  [string]$Url = "http://127.0.0.1:8000/oneclick/refactor"
)

$body = @{
  root = $Root
  mode = "full"
  k = $K
  model = $Model
  pinnedPath = $Pinned
  outDir = $OutDir
  manifestOut = $ManifestOut
  compile = $true
  fixImports = $true
  normalizeFacets = $true
} | ConvertTo-Json -Depth 100

try {
  $resp = Invoke-RestMethod -Method POST -Uri $Url -Body $body -ContentType 'application/json' -ErrorAction Stop
  $resp | ConvertTo-Json -Depth 10
} catch {
  Write-Error "Request failed: $($_.Exception.Message)"
  if ($_.Exception.Response) {
    try { $_.Exception.Response.GetResponseStream() | % { [System.IO.StreamReader]::new($_).ReadToEnd() } | ConvertFrom-Json | ConvertTo-Json -Depth 10 } catch { }
  }
  exit 1
}
