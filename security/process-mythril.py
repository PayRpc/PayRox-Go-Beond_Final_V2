#!/usr/bin/env python3
"""
Mythril Results Processor for PayRox Go Beyond
Processes symbolic execution results and formats for CI/CD pipeline
"""

import json
import sys
import os
import glob
from pathlib import Path
from typing import Dict, List, Any


def load_mythril_reports(reports_dir: str) -> List[Dict[str, Any]]:
    """Load all Mythril JSON reports from directory"""
    reports = []
    pattern = os.path.join(reports_dir, "mythril-*.json")
    for report_path in glob.glob(pattern):
        try:
            with open(report_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, dict) and 'issues' in data and isinstance(data['issues'], list):
                    reports.extend(data['issues'])
        except Exception as e:
            print(f"Warning: Could not load {report_path}: {e}")
    return reports


def categorize_mythril_findings(issues: List[Dict[str, Any]]) -> Dict[str, List[Any]]:
    """Categorize Mythril findings by severity"""
    categories = {'High': [], 'Medium': [], 'Low': []}
    for issue in issues:
        sev = str(issue.get('severity', 'Low')).capitalize()
        categories.get(sev, categories['Low']).append(issue)
    return categories


def generate_mythril_summary(categories: Dict[str, List[Any]], output_dir: str) -> Dict[str, int]:
    """Generate JSON + Markdown summaries (and append to GitHub summary if present)"""
    summary_path = os.path.join(output_dir, 'mythril-summary.json')
    markdown_path = os.path.join(output_dir, 'mythril-summary.md')

    # JSON summary for machines
    all_issues = []
    for severity, issues in categories.items():
        for issue in issues:
            all_issues.append({
                'severity': severity,
                'title': issue.get('title', 'Unknown Issue'),
                'description': issue.get('description', ''),
                'contract': issue.get('filename', issue.get('file', 'Unknown')),
                'function': issue.get('function', issue.get('contract', 'Unknown')),
                'swc_id': issue.get('swc-id', issue.get('swcID', '')),
            })
    with open(summary_path, 'w', encoding='utf-8') as f:
        json.dump(all_issues, f, indent=2)

    # Markdown for humans
    total_issues = len(all_issues)
    with open(markdown_path, 'w', encoding='utf-8') as f:
        f.write("# 🔮 Mythril Symbolic Analysis Summary\n\n")
        if total_issues == 0:
            f.write("✅ **No vulnerabilities detected!**\n\n")
            f.write("Mythril symbolic execution found no security issues in the analyzed contracts.\n")
        else:
            f.write(f"📊 **Total Issues Found**: {total_issues}\n\n")
            for severity in ['High', 'Medium', 'Low']:
                items = [i for i in all_issues if i['severity'] == severity]
                if items:
                    icon = {'High': '🚨', 'Medium': '⚠️', 'Low': '🔶'}[severity]
                    f.write(f"{icon} **{severity} Severity**: {len(items)} issues\n\n")
                    for i in items[:5]:
                        contract = (str(i.get('contract')) or 'Unknown').split('/')[-1]
                        title = i.get('title', 'Unknown Issue')
                        swc = i.get('swc_id', '')
                        suffix = f" (SWC-{swc})" if swc else ""
                        f.write(f"- **{title}** in `{contract}`{suffix}\n")
                    if len(items) > 5:
                        f.write(f"- *(and {len(items) - 5} more)*\n")
                    f.write("\n")
            f.write("## 🔍 Notes\n\n")
            f.write("- Mythril uses symbolic execution and may report false positives.\n")
            f.write("- Prioritize **High** issues first; verify manually.\n")
            f.write("\n📝 Detailed JSON in `security/mythril-reports/`.\n")

    # Append to GitHub step summary if available
    gh_summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if gh_summary:
        with open(markdown_path, 'r', encoding='utf-8') as md, open(gh_summary, 'a', encoding='utf-8') as out:
            out.write(md.read())

    return {
        'total': total_issues,
        'high': len(categories.get('High', [])),
        'medium': len(categories.get('Medium', [])),
        'low': len(categories.get('Low', [])),
    }


def main():
    if len(sys.argv) != 2:
        print("Usage: python3 process-mythril.py <reports-directory>")
        sys.exit(1)

    reports_dir = sys.argv[1]
    if not os.path.exists(reports_dir):
        print(f"Error: Reports directory {reports_dir} not found")
        sys.exit(1)

    issues = load_mythril_reports(reports_dir)
    categories = categorize_mythril_findings(issues)
    counts = generate_mythril_summary(categories, reports_dir)

    print("Mythril analysis complete:")
    print(f"  High:   {counts['high']}")
    print(f"  Medium: {counts['medium']}")
    print(f"  Low:    {counts['low']}")
    print(f"  Total:  {counts['total']}")

    # Optional failing behavior (opt-in)
    fail_on_high = os.environ.get("PRX_MYTHRIL_FAIL_ON_HIGH", "").lower() in ("1", "true", "yes")
    if counts['high'] > 0:
        print(f"::warning:: {counts['high']} high-severity Mythril findings require manual review")
        if fail_on_high:
            sys.exit(2)

if __name__ == "__main__":
    main()
