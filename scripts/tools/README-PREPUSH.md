Pre-push safety checks

Quick: run the pre-push checks before pushing changes.

Bash:

```bash
bash scripts/tools/prepush-check.sh
```

PowerShell:

```powershell
pwsh.exe -File scripts/tools/prepush-check.ps1
```

To install as a git hook (Unix-like): copy `scripts/tools/prepush-check.sh` to `.git/hooks/pre-push` and run `chmod +x .git/hooks/pre-push`.
