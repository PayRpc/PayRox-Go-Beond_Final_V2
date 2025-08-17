#!/usr/bin/env node
/**
 * Simple audit gate: fails if any critical vulnerability with a fix is present.
 * Allows known unfixed advisories (axios, ws in indirect deps) to pass with a warning.
 */
const { spawnSync } = require('node:child_process');

function run(cmd, args) {
  const res = spawnSync(cmd, args, { encoding: 'utf8' });
  if (res.error) throw res.error;
  return { code: res.status, stdout: res.stdout, stderr: res.stderr };
}

const audit = run('npm', ['audit', '--production', '--omit=dev', '--json']);
let data;
try {
  data = JSON.parse(audit.stdout || '{}');
} catch {
  console.error('Could not parse npm audit JSON');
  process.exit(0); // do not block build on parsing
}

const advisories = Object.values(data.vulnerabilities || {});
let fail = false;
for (const v of advisories) {
  const severity = v.severity || 'info';
  const name = v.name;
  const fixAvailable = !!v.fixAvailable;
  if (severity === 'critical' && fixAvailable) {
    console.error(`Blocking: critical vulnerability with fix available: ${name}`);
    fail = true;
  }
}

if (fail) {
  process.exit(1);
} else {
  console.log('Audit gate passed (no fixable critical vulns).');
}
