# PowerShell pre-push check
param()

$excluded = @('.git','node_modules','dist','venv','__pycache__')
$banned = 'terra' + 'stake'
Write-Host "Scanning repository for banned token '$banned' (case-insensitive)..."

$matchesList = Get-ChildItem -Recurse -File -Force | Where-Object { $excluded -notcontains $_.Directory.Name } | Select-String -Pattern $banned -SimpleMatch -CaseSensitive:$false -ErrorAction SilentlyContinue

if ($matchesList) {
    Write-Host "\nERROR: found '$banned' in repository:" -ForegroundColor Red
    $matchesList | ForEach-Object { Write-Host "  $($_.Path):$($_.LineNumber) -> $($_.Line.Trim())" }
    exit 1
} else {
    Write-Host "No occurrences found."
    exit 0
}
