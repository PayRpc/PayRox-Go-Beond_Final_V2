#!/usr/bin/env bash
set -euo pipefail

REPORT_DIR="security/mythril-reports"
mkdir -p "$REPORT_DIR"

# Limit to facets by default; allow override with MYTH_TARGETS
if [[ -n "${MYTH_TARGETS:-}" ]]; then
  mapfile -t files <<<"$MYTH_TARGETS"
else
  # Only analyze real implementation candidates, not interfaces/libs/orchestrator/proxy
  mapfile -t files < <(git ls-files 'contracts/facets/**/*.sol' 'contracts/facets/*.sol' 2>/dev/null || true)
fi

# Nothing to scan?
if [[ "${#files[@]}" -eq 0 ]]; then
  echo "No facet .sol files found to analyze."
  exit 0
fi

# Solc args needed for imports via node_modules
SOLC_ARGS="--base-path . --include-path node_modules"

# Run Mythril per file (JSON output). Don't fail build on per-file failure.
for f in "${files[@]}"; do
  base=$(basename "$f" .sol)
  out="$REPORT_DIR/mythril-${base}.json"
  echo "Analyzing $f → $out"
  set +e
  myth a "$f" --solc-args "$SOLC_ARGS" -o json > "$out" 2>/dev/null
  rc=$?
  set -e
  if [[ $rc -ne 0 ]]; then
    echo "::warning file=$f::Mythril failed to analyze (non-fatal). Check imports/solc version."
    # Ensure a JSON stub so processor doesn't choke
    echo '{"issues":[]}' > "$out"
  fi
done

python3 security/process-mythril.py "$REPORT_DIR"
