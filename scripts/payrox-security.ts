#!/usr/bin/env ts-node

/**
 * PayRox Security Analysis Suite (TypeScript)
 * - Runs Slither + Mythril (if installed)
 * - Parses findings into JSON + Markdown
 * - Non-fatal by default; can fail on HIGH via --fail-on-high
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

type Sev = "HIGH" | "MEDIUM" | "LOW" | "INFO";

interface SecurityIssue {
  tool: "slither" | "mythril";
  severity: Sev;
  detector: string;
  description: string;
  file: string;
  line?: number;
  meta?: Record<string, any>;
}

interface Args {
  outDir: string;
  skipCompile: boolean;
  failOnHigh: boolean;
  slitherTarget: string[];
  mythrilTargets: { file: string; solv: string; name: string }[];
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const pick = (flag: string, def?: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : def;
  };
  const has = (flag: string) => argv.includes(flag);

  const outDir = pick("--out-dir", "security")!;
  const skipCompile = has("--no-compile");
  const failOnHigh = has("--fail-on-high");

  // Defaults are conservative; adjust to your tree
  const slitherTarget = (pick("--slither-targets", "") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (slitherTarget.length === 0) {
    slitherTarget.push("contracts/ai-refactored-facets");
    slitherTarget.push("contracts/dispatcher/ManifestDispatcher.sol");
  }

  const mythTargetsArg = pick("--mythril-targets", "");
  const mythrilTargets = (mythTargetsArg ? JSON.parse(mythTargetsArg) : null) || [
    { file: "contracts/dispatcher/ManifestDispatcher.sol", solv: "0.8.30", name: "dispatcher" },
    { file: "contracts/ai-refactored-facets/GovernanceCoreFacet.sol", solv: "0.8.20", name: "governance" },
  ];

  return { outDir, skipCompile, failOnHigh, slitherTarget, mythrilTargets };
}

class PayRoxSecurityAnalyzer {
  private hasSlither = false;
  private hasMythril = false;
  private issues: SecurityIssue[] = [];
  private readonly args: Args;

  constructor(args: Args) {
    this.args = args;
  }

  async run(): Promise<void> {
    console.log("🔒 PayRox Security Analysis (TypeScript)");
    console.log("=".repeat(60));
    this.ensureOutDir();

    await this.checkDeps();
    if (!this.args.skipCompile) await this.compile();

    await this.slitherSuite();
    await this.mythrilSuite();

    this.writeReports();

    const highCount = this.issues.filter((i) => i.severity === "HIGH").length;
    if (this.args.failOnHigh && highCount > 0) {
      console.error(`❌ HIGH findings present (${highCount}); failing because --fail-on-high`);
      process.exit(2);
    }

    console.log("\n🎉 Security analysis complete.");
    this.printSummary();
  }

  private ensureOutDir() {
    fs.mkdirSync(this.args.outDir, { recursive: true });
  }

  private async checkDeps() {
    const tryCmd = (cmd: string) => {
      try {
        execSync(cmd, { stdio: "pipe" });
        return true;
      } catch {
        return false;
      }
    };

    this.hasSlither = tryCmd("slither --version");
    console.log(this.hasSlither ? "✅ Slither available" : "⚠️ Slither not found (pip install slither-analyzer)");

    this.hasMythril = tryCmd("myth version");
    console.log(this.hasMythril ? "✅ Mythril available" : "⚠️ Mythril not found (pip install mythril)");
  }

  private async compile() {
    console.log("\n🔧 Compiling (Hardhat)...");
    try {
      execSync("npx hardhat compile", { stdio: "pipe" });
      console.log("✅ Compile ok");
    } catch (e: any) {
      console.error("❌ Compile failed:", e?.message ?? e);
      throw e;
    }
  }

  // ─── Slither ────────────────────────────────────────────────────────────────
  private async slitherSuite() {
    if (!this.hasSlither) {
      console.log("\n⏭️  Skipping Slither");
      return;
    }

    console.log("\n🕵️  Slither analysis");

    const cfg = fs.existsSync("slither.config.json") ? "--config-file slither.config.json" : "";
    for (const target of this.args.slitherTarget) {
      if (!fs.existsSync(target)) {
        console.log(`  ↪︎ skip (missing): ${target}`);
        continue;
      }
      const base = path.basename(target).replace(/\.[a-z]+$/i, "");
      const out = path.join(this.args.outDir, `slither-${base}.json`);
      try {
        execSync(`slither ${target} ${cfg} --json ${out}`, { stdio: "pipe" });
        console.log(`  ✅ ${target}`);
        this.parseSlither(out, base);
      } catch {
        console.log(`  ⚠️  ${target} (see JSON if emitted)`);
        if (fs.existsSync(out)) this.parseSlither(out, base);
      }
    }
  }

  private parseSlither(file: string, component: string) {
    try {
      const j = JSON.parse(fs.readFileSync(file, "utf8"));
      const dets = j?.results?.detectors || [];
      for (const d of dets) {
        const sev = this.mapSlitherSev(d.impact);
        const elem = d.elements?.[0] || {};
        const fileRel = elem?.source_mapping?.filename_relative || component;
        const line = (elem?.source_mapping?.lines || [])[0];
        this.issues.push({
          tool: "slither",
          severity: sev,
          detector: d.check || d.tool || "slither-check",
          description: d.description || d.exploit?.description || "Finding",
          file: fileRel,
          line,
          meta: { confidence: d.confidence, id: d.id },
        });
      }
    } catch {
      // ignore parse errors
    }
  }

  private mapSlitherSev(impact: string): Sev {
    switch ((impact || "").toLowerCase()) {
      case "high":
        return "HIGH";
      case "medium":
        return "MEDIUM";
      case "low":
        return "LOW";
      default:
        return "INFO";
    }
    // falls through never
  }

  // ─── Mythril ────────────────────────────────────────────────────────────────
  private async mythrilSuite() {
    if (!this.hasMythril) {
      console.log("\n⏭️  Skipping Mythril");
      return;
    }
    console.log("\n🔮 Mythril analysis");
    for (const t of this.args.mythrilTargets) {
      if (!fs.existsSync(t.file)) {
        console.log(`  ↪︎ skip (missing): ${t.file}`);
        continue;
      }
      const out = path.join(this.args.outDir, `mythril-${t.name}.json`);
      try {
        execSync(
          // timeout flags tame runaway traces
          `myth analyze ${t.file} --solv ${t.solv} --execution-timeout 300 --pruning-timeout 60 --max-depth 30 --out-format json > ${out} 2>&1`,
          { stdio: "pipe" }
        );
        console.log(`  ✅ ${t.name}`);
      } catch {
        console.log(`  ⚠️  ${t.name} (see JSON if emitted)`);
      }
      if (fs.existsSync(out)) this.parseMythril(out, t.name);
    }
  }

  private parseMythril(file: string, component: string) {
    try {
      const j = JSON.parse(fs.readFileSync(file, "utf8"));
      const issues = j?.issues || [];
      for (const is of issues) {
        // Mythril severities: High/Medium/Low/Unknown
        const sev: Sev =
          (String(is.severity || "INFO").toUpperCase() as Sev) in { HIGH: 1, MEDIUM: 1, LOW: 1, INFO: 1 }
            ? (String(is.severity || "INFO").toUpperCase() as Sev)
            : "INFO";
        this.issues.push({
          tool: "mythril",
          severity: sev,
          detector: is.swcID ? `SWC-${is.swcID}` : is.title || "mythril-issue",
          description: is.description || is.title || "Finding",
          file: is.filename || component,
          line: is.lineno,
          meta: { function: is.function, tx_sequence: is.tx_sequence },
        });
      }
    } catch {
      // ignore parse errors
    }
  }

  // ─── Reports ────────────────────────────────────────────────────────────────
  private writeReports() {
    const md = this.renderMarkdown();
    const json = {
      timestamp: new Date().toISOString(),
      tools: { slither: this.hasSlither, mythril: this.hasMythril },
      summary: {
        high: this.count("HIGH"),
        medium: this.count("MEDIUM"),
        low: this.count("LOW"),
        info: this.count("INFO"),
        total: this.issues.length,
      },
      issues: this.issues,
    };

    fs.writeFileSync(path.join(this.args.outDir, "SECURITY_ANALYSIS_REPORT.md"), md);
    fs.writeFileSync(path.join(this.args.outDir, "security-summary.json"), JSON.stringify(json, null, 2));

    // Step summary (GH Actions)
    try {
      const sum = process.env.GITHUB_STEP_SUMMARY;
      if (sum) fs.appendFileSync(sum, `\n\n${md}\n`);
    } catch {}
  }

  private renderMarkdown(): string {
    const lines: string[] = [];
    lines.push(`# PayRox Security Analysis Report\n`);
    lines.push(`Generated: ${new Date().toISOString()}\n`);
    lines.push(`## Summary`);
    lines.push(`- 🔴 HIGH: ${this.count("HIGH")}`);
    lines.push(`- 🟡 MEDIUM: ${this.count("MEDIUM")}`);
    lines.push(`- 🟢 LOW: ${this.count("LOW")}`);
    lines.push(`- 🔵 INFO: ${this.count("INFO")}`);
    lines.push(`- 📦 Total: ${this.issues.length}\n`);

    const bySev: Sev[] = ["HIGH", "MEDIUM", "LOW", "INFO"];
    for (const sev of bySev) {
      const list = this.issues.filter((i) => i.severity === sev);
      if (!list.length) continue;
      const emoji = { HIGH: "🔴", MEDIUM: "🟡", LOW: "🟢", INFO: "🔵" }[sev];
      lines.push(`### ${emoji} ${sev} (${list.length})\n`);
      for (const it of list.slice(0, 8)) {
        lines.push(`- **${it.tool} / ${it.detector}** — ${it.description}`);
        lines.push(`  - \`${it.file}${it.line ? `:${it.line}` : ""}\``);
      }
      if (list.length > 8) lines.push(`… and ${list.length - 8} more`);
      lines.push("");
    }

    lines.push(`\n## Files\n- \`security/SECURITY_ANALYSIS_REPORT.md\`\n- \`security/security-summary.json\``);
    return lines.join("\n");
  }

  private count(sev: Sev) {
    return this.issues.filter((i) => i.severity === sev).length;
  }

  private printSummary() {
    console.log("\n📊 Summary");
    console.log(`  HIGH:   ${this.count("HIGH")}`);
    console.log(`  MEDIUM: ${this.count("MEDIUM")}`);
    console.log(`  LOW:    ${this.count("LOW")}`);
    console.log(`  INFO:   ${this.count("INFO")}`);
    console.log(`  Total:  ${this.issues.length}`);
    console.log(`  Out:    ${this.args.outDir}/`);
  }
}

// Execute
;if (require.main === module) {
  const args = parseArgs();
  new PayRoxSecurityAnalyzer(args)
    .run()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

export {};
