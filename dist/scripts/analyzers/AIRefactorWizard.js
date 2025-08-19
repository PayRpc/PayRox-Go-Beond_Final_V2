"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIRefactorWizard = void 0;
// SPDX-License-Identifier: MIT
// Clean implementation (deduplicated & lint-friendly)
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const ethers_1 = require("ethers");
const MAX_FUNCTIONS_PER_FACET = 20;
const DEFAULT_LOUPE = {
    'facets()': '0x7a0ed627',
    'facetFunctionSelectors(address)': '0xadfca15e',
    'facetAddresses()': '0x52ef6b2c',
    'facetAddress(bytes4)': '0xcdffacc6',
    'supportsInterface(bytes4)': '0x01ffc9a7'
};
function loadLoupeSelectors(root = process.cwd()) {
    try {
        const p = path_1.default.resolve(root, '.payrox', 'loupe.json');
        if (fs_1.default.existsSync(p)) {
            const j = JSON.parse(fs_1.default.readFileSync(p, 'utf8'));
            if (j?.loupe_selectors)
                return j.loupe_selectors;
        }
    }
    catch {
        /* ignore */
    }
    return DEFAULT_LOUPE;
}
const fnSignature = (f) => `${f.name}(${(f.parameters || []).map((p) => p.type).join(',')})`;
const selectorOf = (sig) => '0x' + (0, ethers_1.keccak256)((0, ethers_1.toUtf8Bytes)(sig)).slice(2, 10);
const notesForFacet = (name) => [
    `create2_salt=${(0, ethers_1.keccak256)((0, ethers_1.toUtf8Bytes)(`payrox.salt.${name}`))}`,
    'storage_isolation=required',
    'no_facet_constructor',
    'no_facet_state',
];
function splitByMax(name, fns) {
    if (fns.length <= MAX_FUNCTIONS_PER_FACET)
        return [{ name, fns }];
    const out = [];
    for (let i = 0, part = 0; i < fns.length; i += MAX_FUNCTIONS_PER_FACET, part++) {
        out.push({
            name: `${name}${String.fromCharCode(65 + part)}`,
            fns: fns.slice(i, i + MAX_FUNCTIONS_PER_FACET),
        });
    }
    return out;
}
function bucket(_c, f) {
    const n = (f.name || '').toLowerCase();
    const sm = (f.stateMutability || '').toLowerCase();
    if (n.includes('owner') || n.includes('admin') || n.includes('pause') || n.includes('upgrade') ||
        n.includes('govern') || n.includes('vote') || n.includes('proposal') || n.includes('timelock') ||
        n.includes('epoch') || n.includes('manifest') || n.includes('commit') || n.includes('apply') || n.includes('activate'))
        return 'AdminFacet';
    if (sm === 'view' || sm === 'pure' || /^get/.test(n) || /^preview/.test(n) || /^facet/.test(n) || n === 'supportsinterface')
        return 'ViewFacet';
    if (n.includes('router') || n.includes('dispatcher') || n.includes('extcodehash'))
        return 'CoreFacet';
    if (n.includes('twap') || n.includes('price') || n.includes('oracle') || n.includes('math'))
        return 'UtilityFacet';
    return 'CoreFacet';
}
class AIRefactorWizard {
    makeStrictPlan(parsed, root = process.cwd()) {
        const loupeSet = new Set(Object.values(loadLoupeSelectors(root)));
        const buckets = {};
        for (const f of (parsed.functions || [])) {
            if (!f.name)
                continue;
            (buckets[bucket(parsed, f)] ||= []).push(f);
        }
        const facets = Object.entries(buckets)
            .flatMap(([n, fns]) => splitByMax(n, fns))
            .map(({ name, fns }) => {
            const signatures = fns.map(fnSignature);
            const selectors = signatures.map(selectorOf);
            return { name, signatures, selectors, notes: notesForFacet(name), codehash: (0, ethers_1.keccak256)((0, ethers_1.toUtf8Bytes)(`payrox.codehash.${name}`)) };
        });
        const allSel = new Set(facets.flatMap((f) => f.selectors));
        const loupe_coverage = [...loupeSet].filter((s) => allSel.has(s)).sort();
        const init_sequence = facets.map((f) => f.name).sort((a, b) => {
            const rank = (x) => (x.startsWith('AdminFacet') ? 0 : x.startsWith('GovernanceFacet') ? 1 : x.startsWith('CoreFacet') ? 2 : x.startsWith('ViewFacet') ? 3 : 4);
            return rank(a) - rank(b);
        });
        const missing_info = [];
        for (const f of (parsed.functions || [])) {
            if (!f.name || !Array.isArray(f.parameters))
                missing_info.push(`incomplete_function:${f?.name || 'unknown'}`);
            if (!f.stateMutability)
                missing_info.push(`missing_mutability:${fnSignature(f)}`);
        }
        return { facets, init_sequence, loupe_coverage, missing_info };
    }
}
exports.AIRefactorWizard = AIRefactorWizard;
exports.default = AIRefactorWizard;
