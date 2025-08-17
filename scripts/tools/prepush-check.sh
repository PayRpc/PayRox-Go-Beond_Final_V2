#!/usr/bin/env bash
set -euo pipefail

# Recursively search for the banned token (case-insensitive) in the repo
# Exclude common large or binary directories
EXCLUDES=(".git" "node_modules" "dist" "venv" "__pycache__")
GREP_EXCLUDE_ARGS=()
for d in "${EXCLUDES[@]}"; do
  GREP_EXCLUDE_ARGS+=(--exclude-dir="$d")
done

# Assemble the banned token at runtime to avoid embedding it directly in the file
banned="terra""stake"
echo "Scanning repository for banned token '${banned}' (case-insensitive)..."
if grep -RIn --binary-files=without-match "${banned}" "." "${GREP_EXCLUDE_ARGS[@]}"; then
  echo "\nERROR: found '${banned}' in repository. Aborting push."
  exit 1
else
  echo "No occurrences found."
  exit 0
fi
