#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const argv = require('minimist')(process.argv.slice(2), {
  string: ['dir'],
  alias: { d: 'dir' },
  default: { dir: 'artifacts/splits' },
});

const outDir = path.resolve(argv.dir);
if (!fs.existsSync(outDir)) {
  console.error(`Output dir not found: ${outDir}`);
  process.exit(2);
}

const combinedPath = path.join(outDir, 'combined.json');
if (!fs.existsSync(combinedPath)) {
  console.error(`combined.json not found in ${outDir}`);
  process.exit(1);
}

let combined = {};
try {
  combined = JSON.parse(fs.readFileSync(combinedPath, 'utf8')) || {};
} catch (e) {
  // leave combined as empty object
}

const parts = fs
  .readdirSync(outDir)
  // include generated split files like part_2_split_0.json
  .filter((f) => /^part.*\.json$/i.test(f))
  .map((f) => path.join(outDir, f));

let kept = [];
let allSelectors = new Set();
const MAX_FACET_CODE = 24576; // EIP-170 hard limit
const PAYROX_SAFE_FACET_SIZE = 18000; // conservative soft packing target to avoid warnings (lowered)

// Normalize Solidity text to improve AST parsing on generated/malformed files.
// - rejoin identifiers split across lines
// - remove zero-width/control characters
// - collapse repeated blank lines
// - normalize CRLF to LF
function normalizeSolText(text) {
  if (!text || typeof text !== 'string') return text;
  // normalize newlines
  let s = text.replace(/\r\n?/g, '\n');
  // remove zero-width and other control characters except common whitespace
  s = s.replace(/[\u200B-\u200F\uFEFF\u00A0]/g, '');
  // rejoin accidental mid-identifier newlines: a\n b -> ab
  s = s.replace(/([A-Za-z0-9_$])\n\s*([A-Za-z0-9_$])/g, '$1$2');
  // ensure closing braces and semicolons aren't merged into identifiers
  s = s.replace(/([;{}])\n\s*([A-Za-z0-9_$])/g, '$1\n$2');
  // collapse 3+ blank lines into two
  s = s.replace(/\n{3,}/g, '\n\n');
  // trim trailing spaces on each line
  s = s
    .split('\n')
    .map((l) => l.replace(/[ \t]+$/g, ''))
    .join('\n');
  return s;
}

for (const jsonFile of parts) {
  const base = path.basename(jsonFile, '.json');
  const solFile = path.join(outDir, base + '.sol');
  const info = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  const selectors = Array.isArray(info.selectors) ? info.selectors : [];

  if (selectors.length === 0) {
    // delete empty part files
    try {
      fs.unlinkSync(jsonFile);
    } catch {
      // Ignore deletion errors
    }
    try {
      fs.unlinkSync(solFile);
    } catch {
      // Ignore deletion errors
    }
    console.log(`🧹 removed empty ${base}.{sol,json}`);
    continue;
  }

  selectors.forEach((s) => allSelectors.add(String(s).toLowerCase()));
  kept.push({
    name: info.name || base,
    file: base + '.sol',
    json: base + '.json',
    selectors,
  });
}

// Helper: attempt to split an oversized sol file into smaller parts by extracting function bodies
function splitOversizedPart(solPath, jsonInfo, recDepth = 0) {
  const solText = fs.readFileSync(solPath, 'utf8');
  const stat = fs.statSync(solPath);
  if (stat.size <= MAX_FACET_CODE) return null; // nothing to do

  console.log(`🔧 splitting oversized ${path.basename(solPath)} (${stat.size} bytes)`);

  // Find contract header/footer
  const contractRe = /(contract|library|interface)\s+([A-Za-z0-9_]+)[^{]*\{/g;
  const m = contractRe.exec(solText);
  if (!m) {
    // Fallback: try AST-based splitter (node script) if available
    const nodeSplitter = path.resolve('scripts', 'tools', 'ast', 'split-facets.js');
    if (fs.existsSync(nodeSplitter)) {
      try {
        // Write a temporary cleaned copy where accidental mid-identifier newlines are rejoined
        const cleaned = normalizeSolText(solText);
        const tmpPath = solPath + '.cleaned.tmp.sol';
        fs.writeFileSync(tmpPath, cleaned, 'utf8');
        const child = require('child_process').spawnSync('node', [nodeSplitter, tmpPath], {
          encoding: 'utf8',
          timeout: 20000,
        });
        if (child.status === 0 && child.stdout) {
          const data = JSON.parse(child.stdout);
          // Map AST fragments into same shape as generated parts
          let generated = data.map((frag, idx) => {
            const newNameBase = `${path.basename(solPath, '.sol')}_ast_${idx}`;
            const newSolPath = path.join(outDir, newNameBase + '.sol');
            const newJsonPath = path.join(outDir, newNameBase + '.json');
            fs.writeFileSync(newSolPath, frag.code, 'utf8');
            const meta = {
              name: frag.name || newNameBase,
              selectors: frag.selectors || [],
              size: frag.size || Buffer.byteLength(frag.code, 'utf8'),
            };
            fs.writeFileSync(newJsonPath, JSON.stringify(meta, null, 2), 'utf8');
            return {
              file: path.basename(newSolPath),
              json: path.basename(newJsonPath),
              selectors: meta.selectors,
            };
          });
          // If generated parts are still large, try recursive splitting (limit depth)
          if (recDepth < 3) {
            const finalGen = [];
            for (const g of generated) {
              try {
                const gsol = path.join(outDir, g.file);
                const gst = fs.statSync(gsol);
                if (gst.size > PAYROX_SAFE_FACET_SIZE) {
                  // attempt to split further
                  const info = { name: g.file, selectors: g.selectors || [] };
                  const sub = splitOversizedPart(gsol, info, recDepth + 1);
                  if (sub && sub.length > 0) {
                    // remove the large piece
                    try {
                      fs.unlinkSync(gsol);
                    } catch (err) {
                      // ignore removal error
                    }
                    try {
                      fs.unlinkSync(path.join(outDir, g.json));
                    } catch (err) {
                      // ignore
                    }
                    sub.forEach((s) => finalGen.push(s));
                    continue;
                  }
                }
              } catch (e) {
                // ignore
              }
              finalGen.push(g);
            }
            generated = finalGen;
          }
          try {
            fs.unlinkSync(tmpPath);
          } catch (err) {
            // ignore
          }
          return generated;
        }
      } catch (e) {
        console.warn(`WARN: AST splitter failed for ${solPath}: ${e && e.message}`);
      }
    }
    console.warn(`WARN: couldn't find contract header in ${solPath}; skipping split`);
    return null;
  }

  const headerStart = m.index;
  const openIdx = solText.indexOf('{', headerStart);

  // find matching closing brace for contract
  let depth = 0;
  let contractClose = -1;
  for (let i = openIdx; i < solText.length; i++) {
    if (solText[i] === '{') depth++;
    else if (solText[i] === '}') {
      depth--;
      if (depth === 0) {
        contractClose = i;
        break;
      }
    }
  }

  if (contractClose === -1) {
    // Try AST-based splitter as a fallback when brace matching fails
    const nodeSplitter = path.resolve('scripts', 'tools', 'ast', 'split-facets.js');
    if (fs.existsSync(nodeSplitter)) {
      try {
        const cleaned = normalizeSolText(solText);
        const tmpPath = solPath + '.cleaned.tmp.sol';
        fs.writeFileSync(tmpPath, cleaned, 'utf8');
        const child = require('child_process').spawnSync('node', [nodeSplitter, tmpPath], {
          encoding: 'utf8',
          timeout: 20000,
        });
        if (child.status === 0 && child.stdout) {
          const data = JSON.parse(child.stdout);
          const generated = data.map((frag, idx) => {
            const newNameBase = `${path.basename(solPath, '.sol')}_ast_${idx}`;
            const newSolPath = path.join(outDir, newNameBase + '.sol');
            const newJsonPath = path.join(outDir, newNameBase + '.json');
            fs.writeFileSync(newSolPath, frag.code, 'utf8');
            const meta = {
              name: frag.name || newNameBase,
              selectors: frag.selectors || [],
              size: frag.size || Buffer.byteLength(frag.code, 'utf8'),
            };
            fs.writeFileSync(newJsonPath, JSON.stringify(meta, null, 2), 'utf8');
            return {
              file: path.basename(newSolPath),
              json: path.basename(newJsonPath),
              selectors: meta.selectors,
            };
          });
          try {
            fs.unlinkSync(tmpPath);
          } catch (err) {
            // ignore
          }
          return generated;
        }
      } catch (e) {
        console.warn(`WARN: AST splitter failed for ${solPath}: ${e && e.message}`);
      }
    }
    console.warn(
      `WARN: couldn't find contract end in ${solPath}; attempting best-effort tail-scan`,
    );
    // Best-effort: treat rest of file as body (no footer) and continue
    // Variables will be redeclared below with proper values
  }

  const header = solText.slice(0, openIdx + 1);
  const footer = solText.slice(contractClose >= 0 ? contractClose : solText.length);
  const body = solText.slice(openIdx + 1, contractClose >= 0 ? contractClose : solText.length);

  // Find functions and interface declarations
  const funcRe = /function\s+([A-Za-z0-9_]+)\s*\([^)]*\)\s*([^;{]*)({|;)/g;
  let funcs = [];
  let fm;
  while ((fm = funcRe.exec(body)) !== null) {
    const fStart = fm.index;
    const pre = fm[0];
    const name = fm[1];
    const hasBody = fm[3] === '{';
    if (hasBody) {
      // find matching brace in body starting from fStart + offset
      let idx = fStart + body.indexOf('{', fStart);
      let d = 0;
      let endIdx = -1;
      for (let j = idx; j < body.length; j++) {
        if (body[j] === '{') d++;
        else if (body[j] === '}') {
          d--;
          if (d === 0) {
            endIdx = j;
            break;
          }
        }
      }
      if (endIdx === -1) continue;
      const snippet = body.slice(fStart, endIdx + 1);
      funcs.push({ name, code: snippet });
    } else {
      // interface-style declaration ends with semicolon
      const semi = body.indexOf(';', fStart + pre.length - 1);
      if (semi === -1) continue;
      const snippet = body.slice(fStart, semi + 1);
      funcs.push({ name, code: snippet });
    }
  }

  if (funcs.length === 0) {
    console.warn(`WARN: no function blocks found in ${solPath}; skipping split`);
    return null;
  }

  // Pack functions into chunks so each generated part stays under PAYROX_SAFE_FACET_SIZE
  let generated = [];
  const headerBytes = Buffer.byteLength(header, 'utf8');
  const footerBytes = Buffer.byteLength(footer, 'utf8');
  const PACK_TARGET = PAYROX_SAFE_FACET_SIZE;
  let chunks = [];
  let cur = [];
  let curBytes = headerBytes + footerBytes;
  for (const fn of funcs) {
    const fBytes = Buffer.byteLength(fn.code, 'utf8');
    if (curBytes + fBytes > PACK_TARGET) {
      if (cur.length === 0) {
        // single function too large; put it alone (cannot split)
        chunks.push([fn]);
        cur = [];
        curBytes = headerBytes + footerBytes;
      } else {
        chunks.push(cur);
        cur = [fn];
        curBytes = headerBytes + footerBytes + fBytes;
      }
    } else {
      cur.push(fn);
      curBytes += fBytes;
    }
  }
  if (cur.length > 0) chunks.push(cur);

  for (let i = 0; i < chunks.length; i++) {
    const slice = chunks[i];
    const newBody = slice.map((f) => f.code).join('\n\n');
    const newNameBase = `${path.basename(solPath, '.sol')}_split_${i}`;
    const newSolPath = path.join(outDir, newNameBase + '.sol');
    const newJsonPath = path.join(outDir, newNameBase + '.json');
    const newSol = header + '\n' + newBody + '\n' + footer;
    fs.writeFileSync(newSolPath, newSol, 'utf8');
    const selectors = (jsonInfo.selectors || []).slice(
      i * Math.ceil(jsonInfo.selectors.length / chunks.length),
      (i + 1) * Math.ceil(jsonInfo.selectors.length / chunks.length),
    );
    const meta = {
      name: jsonInfo.name || newNameBase,
      selectors: selectors,
      size: Buffer.byteLength(newSol, 'utf8'),
    };
    fs.writeFileSync(newJsonPath, JSON.stringify(meta, null, 2), 'utf8');
    generated.push({
      file: path.basename(newSolPath),
      json: path.basename(newJsonPath),
      selectors: selectors,
    });
    console.log(
      `✂ created ${path.basename(newSolPath)} (${meta.size} bytes, ${selectors.length} selectors)`,
    );
  }
  // If any generated part is still large, try recursive split (limited depth)
  if (recDepth < 3) {
    const finalGen = [];
    for (const g of generated) {
      try {
        const gsol = path.join(outDir, g.file);
        const gst = fs.statSync(gsol);
        if (gst.size > PAYROX_SAFE_FACET_SIZE) {
          const info = { name: g.file, selectors: g.selectors || [] };
          const sub = splitOversizedPart(gsol, info, recDepth + 1);
          if (sub && sub.length > 0) {
            try {
              fs.unlinkSync(gsol);
            } catch (_) {
              // Ignore file deletion errors
            }
            try {
              fs.unlinkSync(path.join(outDir, g.json));
            } catch (_) {
              // Ignore file deletion errors
            }
            sub.forEach((s) => finalGen.push(s));
            continue;
          }
        }
      } catch (e) {
        // ignore
      }
      finalGen.push(g);
    }
    generated = finalGen;
  }
  return generated;
}
// Aggressively ensure a given sol/json are fully split under the PACK_TARGET by calling
// splitOversizedPart repeatedly (safeguarded with a max depth/iterations).
function ensureFullySplit(solPath, jsonInfo, maxIter = 4) {
  const result = [];
  let queue = [{ sol: solPath, info: jsonInfo, depth: 0 }];
  while (queue.length > 0) {
    const { sol, info, depth } = queue.shift();
    try {
      const st = fs.statSync(sol);
      if (st.size <= PAYROX_SAFE_FACET_SIZE || depth >= maxIter) {
        // keep as-is
        result.push({ sol, info });
        continue;
      }
    } catch (e) {
      // missing file -> skip
      continue;
    }

    const gen = splitOversizedPart(sol, info, 0);
    if (!gen || gen.length === 0) {
      // couldn't split further; keep original
      result.push({ sol, info });
      continue;
    }

    // remove original
    try {
      fs.unlinkSync(sol);
    } catch (_) {
      // Ignore file deletion errors
    }
    try {
      fs.unlinkSync(path.join(outDir, info && info.json ? info.json : ''));
    } catch (_) {
      // Ignore file deletion errors
    }

    // push generated items back to queue to ensure they are small enough
    for (const g of gen) {
      const gsol = path.join(outDir, g.file);
      const gjsonPath = path.join(outDir, g.json || '');
      let ginfo = { name: g.file, selectors: g.selectors || [] };
      // attempt to read meta if available
      try {
        if (gjsonPath && fs.existsSync(gjsonPath)) {
          const meta = JSON.parse(fs.readFileSync(gjsonPath, 'utf8'));
          ginfo = meta;
        }
      } catch (_) {
        // Ignore JSON parsing errors
      }
      queue.push({ sol: gsol, info: ginfo, depth: depth + 1 });
    }
  }
  return result;
}
// Now, attempt to split any oversized kept parts
let finalParts = [];
for (const p of kept) {
  const solPath = path.join(outDir, p.file);
  const jsonPath = path.join(outDir, p.json);
  try {
    const stat = fs.statSync(solPath);
    // Attempt to further split any part larger than our soft packing target so validator warnings go away
    if (stat.size > PAYROX_SAFE_FACET_SIZE) {
      const info = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      // aggressively ensure generated parts are under the PACK target
      const ensured = ensureFullySplit(solPath, info, 5);
      if (ensured && ensured.length > 0) {
        // remove original files if they still exist
        try {
          fs.unlinkSync(solPath);
        } catch (e) {
          // Ignore file deletion errors
        }
        try {
          fs.unlinkSync(jsonPath);
        } catch (e) {
          // Ignore file deletion errors
        }

        // add generated parts from ensured results
        ensured.forEach((it) => {
          const fname = path.basename(it.sol);
          const jname = path.basename(fname.replace(/\.sol$/i, '.json'));
          finalParts.push({
            name: (it.info && it.info.name) || fname,
            file: fname,
            json: jname,
            selectors: (it.info && it.info.selectors) || [],
          });
          ((it.info && it.info.selectors) || []).forEach((s) =>
            allSelectors.add(String(s).toLowerCase()),
          );
        });
        continue;
      }
    }
  } catch (e) {
    // ignore and keep original
  }
  finalParts.push(p);
}

const rewritten = {
  ...(typeof combined === 'object' ? combined : {}),
  parts: finalParts.filter((p) => (p.selectors || []).length > 0),
  selectors: [...allSelectors],
  by_part: finalParts
    .filter((p) => (p.selectors || []).length > 0)
    .map((p) => ({ file: p.file, functions: (p.selectors || []).length })),
};

fs.writeFileSync(combinedPath, JSON.stringify(rewritten, null, 2));
console.log(
  `✅ postprocess complete: kept ${finalParts.length} parts, ${allSelectors.size} selectors`,
);
