import { artifacts } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';
const { keccak_256 } = require('js-sha3');

function deriveSelectorsFromAbi(abi: any[]): string[] {
  const sigs = abi
    .filter((f: any) => f?.type === 'function')
    .map((f: any) => `${f.name}(${(f.inputs || []).map((i: any) => i.type).join(',')})`);
  return Array.from(
    new Set(
      sigs.map((s: string) => {
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
  const out: any[] = [];

  for (const file of files) {
    const name = path.basename(file, '.sol');
    try {
      const art = await artifacts.readArtifact(name);
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
export {};
