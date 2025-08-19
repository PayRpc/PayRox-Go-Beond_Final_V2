// SPDX-License-Identifier: MIT
/**
 * PayRox Cross-Network Address Registry Generator (improved)
 * - Deterministic CREATE2 address computation (factory via EIP-2470 then target via factory)
 * - CLI options and environment overrides
 * - Outputs JSON manifest and optional CSV/Markdown summary
 * - Better validation, nicer logging, and fallback controls
 *
 * Usage:
 *   npx hardhat run scripts/generate-cross-network-registry.ts -- --out manifests/cross-network-registry.json --csv report.csv
 *
 * See --help for available CLI flags.
 */

import { artifacts } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';

type NetStatus = 'production' | 'testnet' | 'local';

interface NetworkRow {
  network: string;
  chainId: number;
  explorerUrl: string;
  status: NetStatus;
  create2Deployer: string;
}

interface RegistryRow extends NetworkRow {
  predictedFactoryAddress: string;
  predictedTargetAddress: string;
}

const DEFAULT_EIP2470 = '0x4e59b44847b379578588920ca78fbf26c0b4956c';

// fuller network list (editable) ------------------------------------------------
const NETWORKS: NetworkRow[] = [
  // Tier 1
  {
    network: 'Ethereum Mainnet',
    chainId: 1,
    explorerUrl: 'https://etherscan.io',
    status: 'production',
    create2Deployer: DEFAULT_EIP2470,
  },
  {
    network: 'Polygon',
    chainId: 137,
    explorerUrl: 'https://polygonscan.com',
    status: 'production',
    create2Deployer: DEFAULT_EIP2470,
  },
  {
    network: 'Arbitrum One',
    chainId: 42161,
    explorerUrl: 'https://arbiscan.io',
    status: 'production',
    create2Deployer: DEFAULT_EIP2470,
  },
  {
    network: 'Optimism',
    chainId: 10,
    explorerUrl: 'https://optimistic.etherscan.io',
    status: 'production',
    create2Deployer: DEFAULT_EIP2470,
  },
  {
    network: 'Base',
    chainId: 8453,
    explorerUrl: 'https://basescan.org',
    status: 'production',
    create2Deployer: DEFAULT_EIP2470,
  },

  // Tier 2
  {
    network: 'BNB Smart Chain',
    chainId: 56,
    explorerUrl: 'https://bscscan.com',
    status: 'production',
    create2Deployer: DEFAULT_EIP2470,
  },
  {
    network: 'Avalanche C-Chain',
    chainId: 43114,
    explorerUrl: 'https://snowtrace.io',
    status: 'production',
    create2Deployer: DEFAULT_EIP2470,
  },
  {
    network: 'Fantom Opera',
    chainId: 250,
    explorerUrl: 'https://ftmscan.com',
    status: 'production',
    create2Deployer: DEFAULT_EIP2470,
  },
  {
    network: 'Gnosis Chain',
    chainId: 100,
    explorerUrl: 'https://gnosisscan.io',
    status: 'production',
    create2Deployer: DEFAULT_EIP2470,
  },
  {
    network: 'Celo',
    chainId: 42220,
    explorerUrl: 'https://celoscan.io',
    status: 'production',
    create2Deployer: DEFAULT_EIP2470,
  },

  // Tier 3
  {
    network: 'Moonbeam',
    chainId: 1284,
    explorerUrl: 'https://moonbeam.moonscan.io',
    status: 'production',
    create2Deployer: DEFAULT_EIP2470,
  },
  {
    network: 'Cronos',
    chainId: 25,
    explorerUrl: 'https://cronoscan.com',
    status: 'production',
    create2Deployer: DEFAULT_EIP2470,
  },
  {
    network: 'Aurora',
    chainId: 1313161554,
    explorerUrl: 'https://aurorascan.dev',
    status: 'production',
    create2Deployer: DEFAULT_EIP2470,
  },
  {
    network: 'Metis Andromeda',
    chainId: 1088,
    explorerUrl: 'https://explorer.metis.io',
    status: 'production',
    create2Deployer: DEFAULT_EIP2470,
  },
  {
    network: 'Boba Network',
    chainId: 288,
    explorerUrl: 'https://bobascan.com',
    status: 'production',
    create2Deployer: DEFAULT_EIP2470,
  },
  {
    network: 'Moonriver',
    chainId: 1285,
    explorerUrl: 'https://moonriver.moonscan.io',
    status: 'production',
    create2Deployer: DEFAULT_EIP2470,
  },
  {
    network: 'Fuse',
    chainId: 122,
    explorerUrl: 'https://explorer.fuse.io',
    status: 'production',
    create2Deployer: DEFAULT_EIP2470,
  },
  {
    network: 'Harmony One',
    chainId: 1666600000,
    explorerUrl: 'https://explorer.harmony.one',
    status: 'production',
    create2Deployer: DEFAULT_EIP2470,
  },

  // Testnets (Mumbai is legacy; prefer Amoy)
  {
    network: 'Ethereum Sepolia',
    chainId: 11155111,
    explorerUrl: 'https://sepolia.etherscan.io',
    status: 'testnet',
    create2Deployer: DEFAULT_EIP2470,
  },
  {
    network: 'Polygon Amoy',
    chainId: 80002,
    explorerUrl: 'https://www.oklink.com/amoy',
    status: 'testnet',
    create2Deployer: DEFAULT_EIP2470,
  },
  {
    network: 'Arbitrum Sepolia',
    chainId: 421614,
    explorerUrl: 'https://sepolia.arbiscan.io',
    status: 'testnet',
    create2Deployer: DEFAULT_EIP2470,
  },
  {
    network: 'Base Sepolia',
    chainId: 84532,
    explorerUrl: 'https://sepolia.basescan.org',
    status: 'testnet',
    create2Deployer: DEFAULT_EIP2470,
  },
  {
    network: 'Optimism Sepolia',
    chainId: 11155420,
    explorerUrl: 'https://sepolia-optimism.etherscan.io',
    status: 'testnet',
    create2Deployer: DEFAULT_EIP2470,
  },

  // Local
  {
    network: 'Hardhat Local',
    chainId: 31337,
    explorerUrl: 'http://localhost:8545',
    status: 'local',
    create2Deployer: DEFAULT_EIP2470,
  },
];

// small utilities
function ensure0x(s: string) {
  return s.startsWith('0x') ? s : '0x' + s;
}
function hex32(x: string): string {
  if (!x) throw new Error('empty salt');
  if (!x.startsWith('0x')) throw new Error('salt/bytes must be 0x-prefixed');
  if (x.length === 66) return x.toLowerCase();
  return ('0x' + x.slice(2).padStart(64, '0')).toLowerCase();
}

function writeJson(file: string, data: any, indent = 2) {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, indent));
}

async function loadArtifactInfo(
  name: string,
): Promise<{ bytecode?: string; compiler?: any } | null> {
  try {
    const art: any = await artifacts.readArtifact(name);
    const bytecode =
      art.bytecode && art.bytecode.startsWith('0x') && art.bytecode.length > 4
        ? art.bytecode
        : undefined;
    const compiler = art.compiler || undefined;
    return { bytecode, compiler };
  } catch (e) {
    return null;
  }
}

// CLI parsing via minimist for convenience
const argv: any = require('minimist')(process.argv.slice(2), {
  boolean: ['help', 'allow-fallback', 'json-only'],
  string: [
    'out',
    'csv',
    'md',
    'factory-art',
    'target-art',
    'deployer',
    'factory-salt',
    'content',
    'version',
    'cross-nonce',
  ],
  alias: { h: 'help', o: 'out' },
  default: { out: './manifests/cross-network-registry.json' },
});

function usage() {
  console.log('Usage: npx hardhat run scripts/generate-cross-network-registry.ts -- [options]\n');
  console.log('Options:');
  console.log(
    '  --out <file>           JSON manifest output (default ./manifests/cross-network-registry.json)',
  );
  console.log('  --csv <file>           Export a CSV summary');
  console.log('  --md <file>            Export a Markdown table');
  console.log('  --factory-art <name>   Artifact name for factory (DeterministicChunkFactory)');
  console.log('  --target-art <name>    Artifact name for target (PayRoxUniversalContract)');
  console.log('  --deployer <addr>      Override EIP-2470 deployer address');
  console.log('  --factory-salt <hex>   Use explicit 32-byte salt for factory');
  console.log('  --content <label>      Content label for universal salt');
  console.log('  --version <v>          Version string for salt derivation');
  console.log('  --cross-nonce <n>      Cross-chain nonce (number)');
  console.log(
    '  --allow-fallback       Allow falling back to SaltViewFacet when target artifact missing',
  );
  console.log('  --json-only            Only emit manifest JSON (suppress console table)');
  console.log('  --help                 Show this help');
}

if (argv.help) {
  usage();
  process.exit(0);
}

// ---- Main -------------------------------------------------------------------
async function main() {
  console.log('\n🌍 PayRox Cross-Network Address Registry Generator (improved)\n');

  // runtime ethers utilities
  const EthersLib: any = require('ethers');
  const utils = EthersLib.utils || EthersLib;
  // best-effort to find functions across v5/v6
  const getCreate2Address = utils.getCreate2Address || EthersLib.getCreate2Address;
  const keccak256 = utils.keccak256 || EthersLib.keccak256 || EthersLib.keccak256;
  const solidityPack =
    utils.solidityPack ||
    (utils as any).solidityPacked ||
    EthersLib.solidityPack ||
    ((types: any, values: any) => utils.defaultAbiCoder.encode(types, values));
  const getAddress = utils.getAddress || EthersLib.getAddress;

  const deployer = argv.deployer
    ? getAddress(argv.deployer)
    : getAddress(process.env.PRX_DEPLOYER_ADDR || DEFAULT_EIP2470);

  const version = argv.version || process.env.PRX_VERSION || '1.0.0';
  const content = argv.content || process.env.PRX_CONTENT_LABEL || 'PayRoxUniversalContract';
  const crossNonce = Number(argv['cross-nonce'] || process.env.PRX_CROSS_NONCE || '1000');

  const factoryArtName =
    argv['factory-art'] || process.env.PRX_FACTORY_ART || 'DeterministicChunkFactory';
  const targetArtName =
    argv['target-art'] || process.env.PRX_TARGET_ART || 'PayRoxUniversalContract';

  // load artifact bytecode or use env-provided fallback bytecode
  const factoryInfo = process.env.PRX_FACTORY_BYTECODE
    ? { bytecode: ensure0x(process.env.PRX_FACTORY_BYTECODE), compiler: undefined }
    : await loadArtifactInfo(factoryArtName);
  const targetInfo = process.env.PRX_TARGET_BYTECODE
    ? { bytecode: ensure0x(process.env.PRX_TARGET_BYTECODE), compiler: undefined }
    : await loadArtifactInfo(targetArtName);

  let factoryInitCode = factoryInfo?.bytecode;
  let targetInitCode = targetInfo?.bytecode;
  let manifestFallbackUsed = false;

  // fallback handling
  if (!targetInitCode) {
    const fallback = 'SaltViewFacet';
    const fbInfo = await loadArtifactInfo(fallback);
    if (fbInfo?.bytecode) {
      const allow =
        argv['allow-fallback'] || (process.env.ALLOW_FALLBACK || 'false').toLowerCase() === 'true';
      console.warn(
        `⚠️ Target artifact '${targetArtName}' missing; found fallback '${fallback}'. allowFallback=${allow}`,
      );
      if (!allow) {
        throw new Error(
          `Target artifact '${targetArtName}' missing; set PRX_TARGET_BYTECODE or pass --allow-fallback`,
        );
      }
      targetInitCode = fbInfo.bytecode;
      manifestFallbackUsed = true;
    }
  }

  function bytesLen(hex?: string) {
    if (!hex) return 0;
    return Math.floor((hex.length - 2) / 2);
  }

  function validateInitCode(name: string, initCode?: string) {
    if (!initCode) throw new Error(`${name} init code missing.`);
    if (!initCode.startsWith('0x')) throw new Error(`${name} init code must be 0x-prefixed`);
    const len = bytesLen(initCode);
    const EIP3860_MAX = 24576;
    if (len > EIP3860_MAX)
      throw new Error(`${name} init code size ${len} exceeds EIP-3860 ${EIP3860_MAX}`);
  }

  validateInitCode('factory', factoryInitCode);
  validateInitCode('target', targetInitCode);

  // compute salts and init code hashes using ethers utils
  const defaultFactorySalt = keccak256(
    solidityPack(['string', 'string'], ['PayRoxFactory', version]),
  );
  const factorySalt = argv['factory-salt']
    ? hex32(argv['factory-salt'])
    : hex32(defaultFactorySalt);

  const factoryInitCodeHash = keccak256(factoryInitCode as string);
  const universalSalt = keccak256(
    solidityPack(
      ['string', 'string', 'uint256', 'string'],
      ['PayRoxCrossChain', content, crossNonce, version],
    ),
  );
  const targetInitCodeHash = keccak256(targetInitCode as string);

  // Compute addresses per network with validation
  const rows: RegistryRow[] = NETWORKS.map((n) => {
    const deployAddr = getAddress(n.create2Deployer || DEFAULT_EIP2470);
    const phase1FactoryAddr = getCreate2Address(deployAddr, factorySalt, factoryInitCodeHash);
    const phase2TargetAddr = getCreate2Address(
      getAddress(phase1FactoryAddr),
      universalSalt,
      targetInitCodeHash,
    );
    return {
      ...n,
      predictedFactoryAddress: getAddress(phase1FactoryAddr),
      predictedTargetAddress: getAddress(phase2TargetAddr),
    };
  });

  // Summaries
  const prod = rows.filter((r) => r.status === 'production');
  const test = rows.filter((r) => r.status === 'testnet');
  const local = rows.filter((r) => r.status === 'local');

  // Console output (unless json-only)
  if (!argv['json-only']) {
    console.log('📋 Configuration');
    console.log('────────────────────────────────────────');
    console.log(`Deployer (EIP-2470):  ${deployer}`);
    console.log(`Factory artifact:     ${factoryArtName}`);
    console.log(`Target artifact:      ${targetArtName}`);
    console.log(`Factory salt:         ${factorySalt}`);
    console.log(`Factory initCodeHash: ${factoryInitCodeHash}`);
    console.log(`Universal salt:       ${universalSalt}`);
    console.log(`Target initCodeHash:  ${targetInitCodeHash}`);
    console.log(`Version:              ${version}`);
    console.log(`Content:              ${content}`);
    console.log(`Cross-chain Nonce:    ${crossNonce}\n`);

    function printBlock(title: string, list: RegistryRow[]) {
      console.log(`\n${title}`);
      console.log('────────────────────────────────────────');
      list.forEach((r) => {
        console.log(
          `📍 ${r.network.padEnd(22)} (chain ${r.chainId.toString().padEnd(7)})  Factory: ${r.predictedFactoryAddress}  Target: ${r.predictedTargetAddress}`,
        );
        console.log(`    🔗 ${r.explorerUrl}/address/${r.predictedTargetAddress}`);
      });
    }

    printBlock('🏭 PRODUCTION', prod);
    printBlock('🧪 TESTNETS', test);
    printBlock('🏠 LOCAL', local);
  }

  // Consistency checks
  const uniqTargets = [...new Set(rows.map((r) => r.predictedTargetAddress.toLowerCase()))];
  const uniqFactories = [...new Set(rows.map((r) => r.predictedFactoryAddress.toLowerCase()))];

  if (!argv['json-only']) {
    console.log('\n🔍 CONSISTENCY');
    console.log('────────────────────────────────────────');
    console.log(`Unique target addresses:  ${uniqTargets.length}`);
    console.log(`Unique factory addresses: ${uniqFactories.length}`);
    console.log(`Target cross-chain consistency: ${uniqTargets.length === 1 ? '✅ YES' : '❌ NO'}`);
    console.log(
      `Factory cross-chain consistency: ${uniqFactories.length === 1 ? '✅ YES' : '❌ NO'}`,
    );
    if (uniqTargets.length === 1) console.log(`🎯 Universal Target: ${getAddress(uniqTargets[0])}`);
    if (uniqFactories.length === 1)
      console.log(`🏗  Universal Factory: ${getAddress(uniqFactories[0])}`);
  }

  // Manifest
  const manifest = {
    timestamp: new Date().toISOString(),
    version,
    content,
    crossChainNonce: crossNonce,
    salts: { factorySalt, universalSalt },
    initCodeHashes: { factoryInitCodeHash, targetInitCodeHash },
    deployers: { eip2470: deployer },
    networks: rows,
    statistics: {
      totalNetworks: rows.length,
      production: prod.length,
      testnets: test.length,
      local: local.length,
      consistentTarget: uniqTargets.length === 1,
      consistentFactory: uniqFactories.length === 1,
    },
    manifestFallbackUsed,
  };

  const outFile = path.resolve(argv.out || './manifests/cross-network-registry.json');
  writeJson(outFile, manifest, 2);

  // Optional CSV/MD export
  function toCSV(rows: RegistryRow[]) {
    const hdr = ['network', 'chainId', 'status', 'factory', 'target', 'explorer'];
    const lines = [hdr.join(',')];
    for (const r of rows)
      lines.push(
        [
          `"${r.network}"`,
          r.chainId,
          r.status,
          r.predictedFactoryAddress,
          r.predictedTargetAddress,
          r.explorerUrl,
        ].join(','),
      );
    return lines.join('\n');
  }

  function toMD(rows: RegistryRow[]) {
    const hdr = ['Network', 'ChainId', 'Status', 'Factory', 'Target', 'Explorer'];
    const rowsOut = ['| ' + hdr.join(' | ') + ' |', '| ' + hdr.map(() => '---').join(' | ') + ' |'];
    for (const r of rows)
      rowsOut.push(
        `| ${r.network} | ${r.chainId} | ${r.status} | ${r.predictedFactoryAddress} | ${r.predictedTargetAddress} | ${r.explorerUrl} |`,
      );
    return rowsOut.join('\n');
  }

  if (argv.csv) {
    fs.writeFileSync(path.resolve(argv.csv), toCSV(rows));
    console.log(`\n💾 CSV → ${argv.csv}`);
  }
  if (argv.md) {
    fs.writeFileSync(path.resolve(argv.md), toMD(rows));
    console.log(`\n💾 MD → ${argv.md}`);
  }

  console.log(`\n💾 JSON manifest → ${outFile}  (${JSON.stringify(manifest).length} bytes)`);
  console.log('\n🏆 COMPLETE');
}

main().catch((e) => {
  console.error('💥 Registry generation failed:', e && e.message ? e.message : e);
  process.exit(1);
});
const outA = path.resolve('./cross-network-address-registry.json');
