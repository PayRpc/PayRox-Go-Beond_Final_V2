'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
// SPDX-License-Identifier: MIT
// PayRox Selector & Manifest Toolkit (strict)
// - Uses ethers v5 utils
// - No facet state/codegen; planning-only helpers
const express_1 = __importDefault(require('express'));
const cors_1 = __importDefault(require('cors'));
const ws_1 = require('ws');
const ethers_1 = require('ethers');
const app = (0, express_1.default)();
const port = Number(process.env.PORT || 3001);
const wsPort = Number(process.env.WS_PORT || 3002);
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
// ---- WS broadcast (optional logs) ----
const wss = new ws_1.WebSocketServer({ port: wsPort });
const broadcast = (msg) => {
  const data = JSON.stringify(msg);
  for (const client of wss.clients) {
    // 1 = OPEN
    // @ts-ignore
    if (client.readyState === 1) client.send(data);
  }
};
wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'log', message: 'Connected to PayRox toolkit logs' }));
});
// ---- Helpers ----
const abi = new ethers_1.AbiCoder();
// Local zero constants (avoid depending on ethers.constants across versions)
const ADDRESS_ZERO = '0x' + '0'.repeat(40);
const HASH_ZERO = '0x' + '0'.repeat(64);
function sigToSelector(signature) {
  const h = (0, ethers_1.keccak256)((0, ethers_1.toUtf8Bytes)(signature));
  return '0x' + h.slice(2, 10);
}
function stablePairHash(a, b) {
  // Deterministic Merkle pair: sort lexicographically
  const [x, y] = a.toLowerCase() <= b.toLowerCase() ? [a, b] : [b, a];
  return (0, ethers_1.keccak256)((0, ethers_1.concat)([x, y]));
}
// ---- Routes ----
// Health
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'payrox-manifest', ts: new Date().toISOString() });
});
// Selectors from signatures OR facets
// Body: { signatures?: string[], facets?: [{name, signatures[]}] }
app.post('/api/selectors', (req, res) => {
  try {
    const { signatures, facets } = req.body || {};
    if (Array.isArray(signatures)) {
      const sels = signatures.map((s) => sigToSelector(s));
      return res.json({
        selectors: sels,
        collisions: findCollisions(sels, signatures),
        coverage: uniqueCount(sels) / Math.max(1, signatures.length),
      });
    }
    if (Array.isArray(facets)) {
      const out = facets.map((f) => ({
        name: f.name,
        signatures: f.signatures,
        selectors: f.signatures.map(sigToSelector),
        predictedAddress: f.predictedAddress,
      }));
      const allSels = out.flatMap((f) => f.selectors);
      return res.json({
        facets: out,
        collisions: findCollisions(
          allSels,
          out.flatMap((f) => f.signatures),
        ),
        coverage: uniqueCount(allSels) / Math.max(1, allSels.length),
      });
    }
    return res.status(400).json({ error: 'Provide signatures[] or facets[]' });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
});
function findCollisions(selectors, labels) {
  const seen = {};
  const coll = [];
  selectors.forEach((sel, i) => {
    if (seen[sel]) coll.push(`collision:${sel} => ${labels[i]} vs ${seen[sel]}`);
    else seen[sel] = labels[i];
  });
  return coll;
}
function uniqueCount(arr) {
  return new Set(arr.map((x) => x.toLowerCase())).size;
}
// Chunk (facet grouping) — strict, no minimum facet count enforced
// Body: { functions?: FunctionInfo[], analyzer?: { functions: [...] }, maxPerFacet?: number }
app.post('/api/chunk', (req, res) => {
  try {
    const { functions, analyzer, maxPerFacet } = req.body || {};
    const fns = Array.isArray(functions)
      ? functions
      : Array.isArray(analyzer?.functions)
        ? analyzer.functions
        : [];
    if (fns.length === 0) return res.status(400).json({ error: 'No functions provided' });
    const groups = { Admin: [], View: [], Core: [], Utility: [] };
    for (const f of fns) {
      const n = (f.name || '').toLowerCase();
      const mut = (f.stateMutability || '').toLowerCase();
      if (mut === 'view' || mut === 'pure' || n.startsWith('get') || n.startsWith('facet'))
        groups.View.push(f);
      else if (
        n.includes('owner') ||
        n.includes('admin') ||
        n.includes('pause') ||
        n.includes('govern')
      )
        groups.Admin.push(f);
      else if (
        n.includes('oracle') ||
        n.includes('twap') ||
        n.includes('price') ||
        n.includes('util')
      )
        groups.Utility.push(f);
      else groups.Core.push(f);
    }
    const MAX = Number(maxPerFacet || 20);
    const facets = [];
    for (const [bucket, arr] of Object.entries(groups)) {
      if (arr.length === 0) continue;
      for (let i = 0; i < arr.length; i += MAX) {
        const chunk = arr.slice(i, i + MAX);
        const name = i === 0 ? `${bucket}Facet` : `${bucket}Facet${i / MAX + 1}`;
        const signatures = chunk.map((fn) => fn.signature || `${fn.name}()`);
        const selectors = signatures.map(sigToSelector);
        facets.push({ name, signatures, selectors });
      }
    }
    return res.json({ facets, totalSelectors: facets.reduce((a, f) => a + f.selectors.length, 0) });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
});
// Manifest builder — deterministic Merkle
// Body: { facets:[{name, signatures[], predictedAddress?}], addresses?: { [name]: string } }
app.post('/api/manifest', (req, res) => {
  try {
    const { facets, addresses } = req.body || {};
    if (!Array.isArray(facets) || facets.length === 0)
      return res.status(400).json({ error: 'facets[] required' });
    const routes = [];
    for (const f of facets) {
      const selectors = f.signatures.map(sigToSelector);
      const addr = (addresses && addresses[f.name]) || f.predictedAddress || ADDRESS_ZERO;
      selectors.forEach((sel, i) => {
        routes.push({ selector: sel, facet: addr, fn: f.signatures[i] });
      });
    }
    const leaves = routes.map((r) =>
      (0, ethers_1.keccak256)(abi.encode(['bytes4', 'address'], [r.selector, r.facet])),
    );
    const merkleRoot = buildMerkleRoot(leaves);
    const out = {
      routes,
      merkleRoot,
      leaves,
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
    return res.json(out);
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
});
// Proofs for given routes
// Body: { routes: ManifestEntry[] }
app.post('/api/proofs', (req, res) => {
  try {
    const { routes } = req.body || {};
    if (!Array.isArray(routes) || routes.length === 0)
      return res.status(400).json({ error: 'routes[] required' });
    const leaves = routes.map((r) =>
      (0, ethers_1.keccak256)(abi.encode(['bytes4', 'address'], [r.selector, r.facet])),
    );
    const proofs = leaves.map((_, i) => generateProof(leaves, i));
    const root = buildMerkleRoot(leaves);
    return res.json({ proofs, root, leaves });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
});
// ---- Merkle helpers (sorted-pair) ----
function buildMerkleRoot(leaves) {
  if (leaves.length === 0) return HASH_ZERO;
  if (leaves.length === 1) return leaves[0];
  let level = leaves.slice();
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      const A = level[i];
      const B = i + 1 < level.length ? level[i + 1] : A;
      next.push(stablePairHash(A, B));
    }
    level = next;
  }
  return level[0];
}
function generateProof(leaves, index) {
  if (leaves.length <= 1) return [];
  let lvl = leaves.slice();
  let idx = index;
  const proof = [];
  while (lvl.length > 1) {
    const isRight = idx % 2 === 1;
    const pair = isRight ? idx - 1 : idx + 1;
    proof.push(lvl[pair] || lvl[idx]); // if odd end, pair with self
    // next level
    const next = [];
    for (let i = 0; i < lvl.length; i += 2) {
      const A = lvl[i];
      const B = i + 1 < lvl.length ? lvl[i + 1] : A;
      next.push(stablePairHash(A, B));
    }
    lvl = next;
    idx = Math.floor(idx / 2);
  }
  return proof;
}
// ---- Start server ----
app.listen(port, () => {
  console.log(`[payrox-manifest] http://0.0.0.0:${port}`);
  console.log(`[payrox-manifest] WS logs ws://0.0.0.0:${wsPort}`);
  broadcast({ type: 'log', message: 'Toolkit ready' });
});
