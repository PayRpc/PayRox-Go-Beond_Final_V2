Pre-push safety checks

This folder contains small helper scripts you can run locally before pushing changes to ensure the workspace doesn't contain banned tokens or secrets.

Files:
- prepush-check.sh  -- Bash script. Run with: bash scripts/tools/prepush-check.sh
- prepush-check.ps1 -- PowerShell script. Run with: pwsh.exe -File scripts/tools/prepush-check.ps1

Install as a git pre-push hook (manual):
1. Copy the script to .git/hooks/pre-push (or create a hook that runs it).
2. Make sure the hook is executable (chmod +x .git/hooks/pre-push).

Example .git/hooks/pre-push (bash):
#!/usr/bin/env bash
set -e
scripts/tools/prepush-check.sh

If the check fails, the hook will exit non-zero and abort the push. Adjust excludes in the script if you need to whitelist additional directories.
