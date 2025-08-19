Mythril security scans for PayRox

This folder contains a small Mythril runner and a results processor used by CI to scan facet Solidity sources and produce human-friendly summaries.

What is included
- `run-mythril.sh` — per-file Mythril runner that writes JSON reports into `security/mythril-reports/` and invokes the processor.
- `process-mythril.py` — collects Mythril JSON outputs, produces `mythril-summary.json` and `mythril-summary.md`, and optionally fails the process on high-severity findings when enabled.

Quick local run (Linux/macOS / WSL)

1) Install dependencies

```bash
# Node deps for imports
npm ci

# Python tools
python -m pip install --upgrade pip
pip install solc-select mythril

# Use solc 0.8.30 to match the repo
solc-select install 0.8.30
solc-select use 0.8.30
```

2) Run the scanner

```bash
# Scan all facets (default)
bash security/run-mythril.sh

# Or scan a custom set of files (newline-separated values in MYTH_TARGETS)
MYTH_TARGETS=$(git ls-files 'contracts/facets/**.sol') bash security/run-mythril.sh
```

Outputs
- `security/mythril-reports/` — one JSON file per analyzed contract (CI uploads this directory as an artifact).
- `security/mythril-reports/mythril-summary.json` — machine-readable list of issues.
- `security/mythril-reports/mythril-summary.md` — human-readable Markdown summary suitable for PR comments.

CI behavior
- Mythril is integrated into the project's Refactor Gate workflow (`.github/workflows/payrox-refactor-gate.yml`) under the `security-scan` job.
- The job runs Mythril on changed Solidity files (PRs) or on all facets for non-PR runs. It uploads `security/mythril-reports/` as artifacts and posts `mythril-summary.md` as a sticky PR comment.
- By default the job does not fail the build on findings; to fail on High-severity findings set the repository environment variable `PRX_MYTHRIL_FAIL_ON_HIGH=true`.

Notes and troubleshooting
- Mythril can be sensitive to solc version and imports. The runner uses `--include-path node_modules` for npm-installed imports; ensure `npm ci` has been run.
- Per-file Mythril failures are non-fatal: the runner creates a stub JSON so the processor still runs.
- This job intentionally scans only `contracts/facets/**` to match the manifest generator policy (skip interfaces/libraries/proxies).

If you want this job merged into an existing security/refactor workflow or to change the set of scanned targets, tell me which workflow to modify and I will prepare a small patch.
