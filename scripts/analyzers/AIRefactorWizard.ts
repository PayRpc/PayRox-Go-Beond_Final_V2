// SPDX-License-Identifier: MIT
// Clean implementation (deduplicated & lint-friendly)
import fs from 'fs';
import path from 'path';
import { keccak256, toUtf8Bytes } from 'ethers';
import { FunctionInfo, ParsedContract } from '../types/index';

const MAX_FUNCTIONS_PER_FACET = 20;

export interface StrictFacet {
  name: string;
  selectors: string[];
  signatures: string[];
  notes?: string[];
  codehash?: string;
  predictedAddress?: string;
}
export interface StrictPlan {
  facets: StrictFacet[];
  init_sequence: string[];
  loupe_coverage: string[];
  missing_info: string[];
}

const DEFAULT_LOUPE: Record<string, string> = {
  'facets()': '0x7a0ed627',
  'facetFunctionSelectors(address)': '0xadfca15e',
  'facetAddresses()': '0x52ef6b2c',
  'facetAddress(bytes4)': '0xcdffacc6',
  'supportsInterface(bytes4)': '0x01ffc9a7',
};

function loadLoupeSelectors(root = process.cwd()): Record<string, string> {
  try {
    const p = path.resolve(root, '.payrox', 'loupe.json');
    if (fs.existsSync(p)) {
      const j = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (j?.loupe_selectors) return j.loupe_selectors as Record<string, string>;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_LOUPE;
}

const fnSignature = (f: FunctionInfo) =>
  `${f.name}(${(f.parameters || []).map((p) => p.type).join(',')})`;
const selectorOf = (sig: string) => '0x' + keccak256(toUtf8Bytes(sig)).slice(2, 10);
const notesForFacet = (name: string) => [
  `create2_salt=${keccak256(toUtf8Bytes(`payrox.salt.${name}`))}`,
  'storage_isolation=required',
  'no_facet_constructor',
  'no_facet_state',
];

function splitByMax(name: string, fns: FunctionInfo[]): { name: string; fns: FunctionInfo[] }[] {
  if (fns.length <= MAX_FUNCTIONS_PER_FACET) return [{ name, fns }];
  const out: { name: string; fns: FunctionInfo[] }[] = [];
  for (let i = 0, part = 0; i < fns.length; i += MAX_FUNCTIONS_PER_FACET, part++) {
    out.push({
      name: `${name}${String.fromCharCode(65 + part)}`,
      fns: fns.slice(i, i + MAX_FUNCTIONS_PER_FACET),
    });
  }
  return out;
}

function bucket(_c: ParsedContract, f: FunctionInfo) {
  const n = (f.name || '').toLowerCase();
  const sm = (f.stateMutability || '').toLowerCase();
  if (
    n.includes('owner') ||
    n.includes('admin') ||
    n.includes('pause') ||
    n.includes('upgrade') ||
    n.includes('govern') ||
    n.includes('vote') ||
    n.includes('proposal') ||
    n.includes('timelock') ||
    n.includes('epoch') ||
    n.includes('manifest') ||
    n.includes('commit') ||
    n.includes('apply') ||
    n.includes('activate')
  )
    return 'AdminFacet';
  if (
    sm === 'view' ||
    sm === 'pure' ||
    /^get/.test(n) ||
    /^preview/.test(n) ||
    /^facet/.test(n) ||
    n === 'supportsinterface'
  )
    return 'ViewFacet';
  if (n.includes('router') || n.includes('dispatcher') || n.includes('extcodehash'))
    return 'CoreFacet';
  if (n.includes('twap') || n.includes('price') || n.includes('oracle') || n.includes('math'))
    return 'UtilityFacet';
  return 'CoreFacet';
}

export class AIRefactorWizard {
  makeStrictPlan(parsed: ParsedContract, root = process.cwd()): StrictPlan {
    const loupeSet = new Set(Object.values(loadLoupeSelectors(root)));
    const buckets: Record<string, FunctionInfo[]> = {};
    for (const f of parsed.functions || []) {
      if (!f.name) continue;
      (buckets[bucket(parsed, f)] ||= []).push(f);
    }
    const facets = Object.entries(buckets)
      .flatMap(([n, fns]) => splitByMax(n, fns))
      .map(({ name, fns }) => {
        const signatures = fns.map(fnSignature);
        const selectors = signatures.map(selectorOf);
        return {
          name,
          signatures,
          selectors,
          notes: notesForFacet(name),
          codehash: keccak256(toUtf8Bytes(`payrox.codehash.${name}`)),
        };
      });
    const allSel = new Set(facets.flatMap((f) => f.selectors));
    const loupe_coverage = [...loupeSet].filter((s) => allSel.has(s)).sort();
    const init_sequence = facets
      .map((f) => f.name)
      .sort((a, b) => {
        const rank = (x: string) =>
          x.startsWith('AdminFacet')
            ? 0
            : x.startsWith('GovernanceFacet')
              ? 1
              : x.startsWith('CoreFacet')
                ? 2
                : x.startsWith('ViewFacet')
                  ? 3
                  : 4;
        return rank(a) - rank(b);
      });
    const missing_info: string[] = [];
    for (const f of parsed.functions || []) {
      if (!f.name || !Array.isArray(f.parameters))
        missing_info.push(`incomplete_function:${f?.name || 'unknown'}`);
      if (!f.stateMutability) missing_info.push(`missing_mutability:${fnSignature(f)}`);
    }
    return { facets, init_sequence, loupe_coverage, missing_info };
  }
}

export default AIRefactorWizard;
