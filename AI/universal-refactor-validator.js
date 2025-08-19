#!/usr/bin/env node
/* eslint-disable no-console */
'use strict';

/**
 * 🔍 Universal Refactor Validator
 * Validates refactored output against PayRox standards.
 *
 * Expected "output" shape (example):
 * {
 *   original: { selectors: ["0x...","0x..."] },
 *   facets: [{ name, runtimeSize, selectors: ["0x..."], implementsLoupe: false, usesNamespacedStorage: true, hasStateVars: false, accessControlMappedToDiamond: true }],
 *   init: { hasIdempotenceGuard: true },
 *   cut: { selectors: ["0x..."] },
 *   manifest: { selectors: ["0x..."] },
 *   facts: { loupe_selectors: {...} }
 * }
 */

function setEq(a, b) {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

function validateEIP170Compliance(facets) {
  return Array.isArray(facets) && facets.every(f => (f?.runtimeSize ?? 0) <= 24576);
}
function validateNoLoupeInFacets(facets) {
  return Array.isArray(facets) && facets.every(f => !f?.implementsLoupe);
}
function validateSelectorParity(original, facets) {
  const orig = new Set((original?.selectors) || []);
  const fac = new Set([].concat(...(facets || []).map(f => f.selectors || [])));
  return setEq(orig, fac);
}
function validateStorageIsolation(facets) {
  return Array.isArray(facets) && facets.every(f => f?.usesNamespacedStorage && !f?.hasStateVars);
}
function validateAccessControlMapping(facets) {
  return Array.isArray(facets) && facets.every(f => !!f?.accessControlMappedToDiamond);
}
function validateInitIdempotence(init) {
  return init ? !!init.hasIdempotenceGuard : true;
}
function validateCutManifestMatch(cut, manifest) {
  const cutSet = new Set((cut?.selectors) || []);
  const manSet = new Set((manifest?.selectors) || []);
  return setEq(cutSet, manSet);
}
function validateLoupeCoverage(manifest, facts) {
  const man = new Set((manifest?.selectors) || []);
  const loupe = (facts && facts.loupe_selectors) || {};
  const vals = Object.values(loupe);
  return vals.length ? vals.every(sel => man.has(sel)) : true; // pass if no facts
}
function validateERC165(manifest) {
  const man = new Set((manifest?.selectors) || []);
  return man.has('0x01ffc9a7'); // supportsInterface(bytes4)
}

function validateRefactorOutput(output) {
  console.log('🔍 Validating refactor output...');
  const checks = {
    eip170: validateEIP170Compliance(output.facets),
    noLoupe: validateNoLoupeInFacets(output.facets),
    selectorParity: validateSelectorParity(output.original, output.facets),
    storageIsolation: validateStorageIsolation(output.facets),
    accessControl: validateAccessControlMapping(output.facets),
    initIdempotent: validateInitIdempotence(output.init),
    cutManifestMatch: validateCutManifestMatch(output.cut, output.manifest),
    loupeCoverage: validateLoupeCoverage(output.manifest, output.facts),
    erc165: validateERC165(output.manifest),
  };
  const passed = Object.values(checks).every(Boolean);
  const score = Object.values(checks).filter(Boolean).length;

  console.log(`📊 Validation Score: ${score}/${Object.keys(checks).length}`);
  if (passed) console.log('✅ All refactor validations passed!');
  else console.log('⚠️ Some validations failed:', Object.entries(checks).filter(([k,v]) => !v).map(([k]) => k));

  return { passed, score, checks, timestamp: new Date().toISOString() };
}

// CLI usage: node AI/universal-refactor-validator.js <path_to_output.json>
if (require.main === module) {
  const f = process.argv[2];
  if (!f) {
    console.error('Usage: node AI/universal-refactor-validator.js <path_to_output.json>');
    process.exit(2);
  }
  const payload = JSON.parse(require('fs').readFileSync(f, 'utf8'));
  const res = validateRefactorOutput(payload);
  console.log(JSON.stringify(res, null, 2));
  process.exit(res.passed ? 0 : 1);
}

module.exports = { validateRefactorOutput };
