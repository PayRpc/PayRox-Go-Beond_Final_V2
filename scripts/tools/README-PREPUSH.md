# Pre-push safety checks

<!-- cSpell:ignore prepush prepush-check prepush-check.sh prepush-check.ps1 pwsh pwsh.exe powershell -->

Run the pre-push checks before pushing changes.

Bash

```bash
bash scripts/tools/prepush-check.sh
```

PowerShell

```powershell
pwsh.exe -File scripts/tools/prepush-check.ps1
```

Install as a git hook (Unix-like)

Copy `scripts/tools/prepush-check.sh` to `.git/hooks/pre-push` and make it executable:

```bash
cp scripts/tools/prepush-check.sh .git/hooks/pre-push
chmod +x .git/hooks/pre-push
```

Note: the script filenames on disk remain `prepush-check.sh` and `prepush-check.ps1`; this document uses the term "pre-push" for the git hook and checks.
