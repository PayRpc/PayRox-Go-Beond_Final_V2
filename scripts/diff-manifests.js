#!/usr/bin/env node
/**
 * scripts/diff-manifests.js
 * Compare a strict (reference) PayRox manifest with a canary manifest.
 *
 * Usage:
 *   node scripts/diff-manifests.js \
 *     --strict strict-artifacts/payrox-manifest.json \
 *     --canary payrox-manifest.json \
 *     [--selector-map strict-artifacts/selector_map.json] \
 *     [--fail-on collision,banned,added,removed,moved]
 *
 * Exit code:
 *   0 on success or when strict file is missing (skip)
 *   2 if diff contains a class listed in --fail-on
 */
const fs = require('fs');
const path = require('path');

const argv = require('minimist')(process.argv.slice(2), {
  string: ['strict', 'canary', 'selector-map', 'fail-on'],
  default: { 'fail-on': '' },
});

function readJson(p) {
  const ap = path.resolve(p);
  if (!fs.existsSync(ap)) return null;
  return JSON.parse(fs.readFileSync(ap, 'utf8'));
}

function fatal(msg, code = 2) {
  console.error('[manifest-diff] ' + msg);
  process.exit(code);
}

const strictPath = argv.strict;
const canaryPath = argv.canary;
if (!canaryPath) fatal('missing --canary path');

const strict = strictPath ? readJson(strictPath) : null;
const canary = readJson(canaryPath);

if (!canary) fatal('cannot read canary manifest: ' + canaryPath, 2);
if (!strict) {
  console.log('[manifest-diff] no strict manifest found; skipping diff');
  process.exit(0);
}

function facetSelectors(m) {
  const map = {};
  for (const [name, obj] of Object.entries(m.facets || {})) {
    const arr = (obj && obj.selectors) || [];
    map[name] = new Set(arr.map((s) => s.toLowerCase()));
  }
  return map;
}

const BANNED_SIGS = [
  'diamondCut((address,uint8,bytes4[])[],address,bytes)',
  'facets()',
  'facetFunctionSelectors(address)',
  'facetAddresses()',
  'facetAddress(bytes4)',
  'supportsInterface(bytes4)',
];
function keccakSelector(sig) {
  const { keccak256, toUtf8Bytes } = require('ethers');
  return keccak256(toUtf8Bytes(sig)).slice(0, 10);
}
const BANNED_SELECTORS = new Set(BANNED_SIGS.map(keccakSelector));

const s = facetSelectors(strict);
const c = facetSelectors(canary);

const allFacets = new Set([...Object.keys(s), ...Object.keys(c)]);
const diff = {
  addedFacets: [],
  removedFacets: [],
  selectorAdds: {}, // facet -> [selectors]
  selectorRemoves: {}, // facet -> [selectors]
  moved: [], // {selector, from, to}
  newCollisions: [], // {selector, owners}
  bannedInCanary: [], // selectors
};

for (const f of allFacets) {
  if (!s[f] && c[f]) diff.addedFacets.push(f);
  if (s[f] && !c[f]) diff.removedFacets.push(f);

  if (s[f] && c[f]) {
    const added = [...c[f]].filter((x) => !s[f].has(x));
    const removed = [...s[f]].filter((x) => !c[f].has(x));
    if (added.length) diff.selectorAdds[f] = added.sort();
    if (removed.length) diff.selectorRemoves[f] = removed.sort();
  }
}

// Build selector -> owners for strict and canary
function selectorOwners(map) {
  const own = {};
  for (const [facet, sels] of Object.entries(map)) {
    for (const sel of sels) {
      own[sel] = own[sel] || new Set();
      own[sel].add(facet);
    }
  }
  return own;
}
const ownersStrict = selectorOwners(s);
const ownersCanary = selectorOwners(c);

// Moved selectors (owner set changed)
for (const sel of new Set([...Object.keys(ownersStrict), ...Object.keys(ownersCanary)])) {
  const a = new Set([...(ownersStrict[sel] || [])]);
  const b = new Set([...(ownersCanary[sel] || [])]);
  const aStr = [...a].sort().join(',');
  const bStr = [...b].sort().join(',');
  if (aStr !== bStr) {
    // New collision?
    if (b.size > 1) diff.newCollisions.push({ selector: sel, owners: [...b].sort() });
    // Moved?
    const from = [...a].sort();
    const to = [...b].sort();
    if (from.length && to.length && !(from.length > 1 && to.length > 1)) {
      diff.moved.push({ selector: sel, from, to });
    }
  }
}

// Banned selectors present in canary facets
for (const sel of BANNED_SELECTORS) {
  if (ownersCanary[sel] && ownersCanary[sel].size > 0) {
    diff.bannedInCanary.push(sel);
  }
}

// Emit summary (console + step summary)
const lines = [];
lines.push('# Manifest Diff (strict vs canary)\n');
lines.push(`- Strict: \`${strictPath}\``);
lines.push(`- Canary: \`${canaryPath}\``);
lines.push('');
if (diff.addedFacets.length) lines.push(`**Added facets**: ${diff.addedFacets.join(', ')}`);
if (diff.removedFacets.length) lines.push(`**Removed facets**: ${diff.removedFacets.join(', ')}`);
if (Object.keys(diff.selectorAdds).length) {
  lines.push('\n## Selector additions');
  for (const [f, sels] of Object.entries(diff.selectorAdds))
    lines.push(`- ${f}: ${sels.join(', ')}`);
}
if (Object.keys(diff.selectorRemoves).length) {
  lines.push('\n## Selector removals');
  for (const [f, sels] of Object.entries(diff.selectorRemoves))
    lines.push(`- ${f}: ${sels.join(', ')}`);
}
if (diff.moved.length) {
  lines.push('\n## Selector moves');
  for (const m of diff.moved)
    lines.push(`- ${m.selector}: ${m.from.join(', ')} → ${m.to.join(', ')}`);
}
if (diff.newCollisions.length) {
  lines.push('\n## ❌ New collisions');
  for (const col of diff.newCollisions)
    lines.push(`- ${col.selector}: owned by ${col.owners.join(', ')}`);
} else {
  lines.push('\n✅ No new collisions');
}
if (diff.bannedInCanary.length) {
  lines.push('\n## ❌ Banned selectors present in canary facets');
  for (const b of diff.bannedInCanary) lines.push(`- ${b}`);
} else {
  lines.push('\n✅ No banned selectors in canary facets');
}
lines.push('');

const out = lines.join('\n');
console.log(out);

try {
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, out);
  }
} catch {}

const failOn = new Set(
  String(argv['fail-on'])
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
);
const shouldFail =
  (failOn.has('collision') && diff.newCollisions.length > 0) ||
  (failOn.has('banned') && diff.bannedInCanary.length > 0) ||
  (failOn.has('added') &&
    (diff.addedFacets.length > 0 || Object.keys(diff.selectorAdds).length > 0)) ||
  (failOn.has('removed') &&
    (diff.removedFacets.length > 0 || Object.keys(diff.selectorRemoves).length > 0)) ||
  (failOn.has('moved') && diff.moved.length > 0);

process.exit(shouldFail ? 2 : 0);
