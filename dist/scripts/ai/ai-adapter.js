'use strict';
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, 'default', { enumerable: true, value: v });
      }
    : function (o, v) {
        o['default'] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== 'default') __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
Object.defineProperty(exports, '__esModule', { value: true });
const hardhat_1 = require('hardhat');
const fs = __importStar(require('fs'));
const path = __importStar(require('path'));
const { keccak_256 } = require('js-sha3');
function deriveSelectorsFromAbi(abi) {
  const sigs = abi
    .filter((f) => f?.type === 'function')
    .map((f) => `${f.name}(${(f.inputs || []).map((i) => i.type).join(',')})`);
  return Array.from(
    new Set(
      sigs.map((s) => {
        // 4 bytes of keccak(signature)
        const h = Buffer.from(keccak_256.arrayBuffer(s));
        return '0x' + h.slice(0, 4).toString('hex');
      }),
    ),
  );
}
async function main() {
  const aiDir = path.join(process.cwd(), 'contracts', 'ai');
  if (!fs.existsSync(aiDir)) {
    console.log('No contracts/ai directory found.');
    return;
  }
  const files = fs.readdirSync(aiDir).filter((f) => f.endsWith('.sol'));
  const out = [];
  for (const file of files) {
    const name = path.basename(file, '.sol');
    try {
      const art = await hardhat_1.artifacts.readArtifact(name);
      const selectors = deriveSelectorsFromAbi(Array.from(art.abi));
      out.push({ name, artifact: name, selectors });
    } catch {
      // not compiled (ok)
    }
  }
  const outPath = path.join('reports', 'ai_facets.compiled.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({ facets: out }, null, 2));
  console.log('Wrote', outPath);
}
if (require.main === module)
  main()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
