// SPDX-License-Identifier: MIT
/**
 * PayRox Cross-Network Address Registry Generator
 * - Computes a deterministic factory address (phase 1) using EIP-2470 singleton deployer
 * - Computes deterministic target contract address (phase 2) using the factory as CREATE2 deployer
 * - Outputs a manifest under ./manifests/cross-network-registry.json
 *
 * Usage:
 *   npx hardhat run scripts/generate-cross-network-registry.ts
 *
 * Optional env overrides:
 *   PRX_FACTORY_SALT=0x...                 // 32-byte salt for the factory deployment (default derived)
 *   PRX_FACTORY_BYTECODE=0x...             // if artifact missing; raw init code for the factory
 *   PRX_TARGET_BYTECODE=0x...              // if artifact missing; raw init code for target
 *   PRX_DEPLOYER_ADDR=0x...                // override EIP-2470 deployer (defaults to 0x4e59... on most chains)
 *   PRX_CONTENT_LABEL="PayRoxUniversalContract" // content label for the universal salt
 *   PRX_VERSION="1.0.0"
 *   PRX_CROSS_NONCE=1000
 */

import { artifacts } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';
import { getCreate2Address, keccak256, solidityPacked, getAddress } from 'ethers';

type NetStatus = 'production' | 'testnet' | 'local';

interface NetworkRow {
  network: string;
  chainId: number;
  explorerUrl: string;
  status: NetStatus;
  // Deployer used for phase-1 factory deployment (EIP-2470 by default):
  create2Deployer: string;
}

interface RegistryRow extends NetworkRow {
  predictedFactoryAddress: string;
  predictedTargetAddress: string;
}

const EIP2470 = '0x4e59b44847b379578588920ca78fbf26c0b4956c'; // widely-available singleton CREATE2 deployer

// ---- Network list (edit as needed) ------------------------------------------
const NETWORKS: NetworkRow[] = [
  // Tier 1
  {
    network: 'Ethereum Mainnet',
    chainId: 1,
    explorerUrl: 'https://etherscan.io',
    status: 'production',
    create2Deployer: EIP2470,
  },
  {
    network: 'Polygon',
    chainId: 137,
    explorerUrl: 'https://polygonscan.com',
    status: 'production',
    create2Deployer: EIP2470,
  },
  {
    network: 'Arbitrum One',
    chainId: 42161,
    explorerUrl: 'https://arbiscan.io',
    status: 'production',
    create2Deployer: EIP2470,
  },
  {
    network: 'Optimism',
    chainId: 10,
    explorerUrl: 'https://optimistic.etherscan.io',
    status: 'production',
    create2Deployer: EIP2470,
  },
  {
    network: 'Base',
    chainId: 8453,
    explorerUrl: 'https://basescan.org',
    status: 'production',
    create2Deployer: EIP2470,
  },

  // Tier 2
  {
    network: 'BNB Smart Chain',
    chainId: 56,
    explorerUrl: 'https://bscscan.com',
    status: 'production',
    create2Deployer: EIP2470,
  },
  {
    network: 'Avalanche C-Chain',
    chainId: 43114,
    explorerUrl: 'https://snowtrace.io',
    status: 'production',
    create2Deployer: EIP2470,
  },
  {
    network: 'Fantom Opera',
    chainId: 250,
    explorerUrl: 'https://ftmscan.com',
    status: 'production',
    create2Deployer: EIP2470,
  },
  {
    network: 'Gnosis Chain',
    chainId: 100,
    explorerUrl: 'https://gnosisscan.io',
    status: 'production',
    create2Deployer: EIP2470,
  },
  {
    network: 'Celo',
    chainId: 42220,
    explorerUrl: 'https://celoscan.io',
    status: 'production',
    create2Deployer: EIP2470,
  },

  // Tier 3
  {
    network: 'Moonbeam',
    chainId: 1284,
    explorerUrl: 'https://moonbeam.moonscan.io',
    status: 'production',
    create2Deployer: EIP2470,
  },
  {
    network: 'Cronos',
    chainId: 25,
    explorerUrl: 'https://cronoscan.com',
    status: 'production',
    create2Deployer: EIP2470,
  },
  {
    network: 'Aurora',
    chainId: 1313161554,
    explorerUrl: 'https://aurorascan.dev',
    status: 'production',
    create2Deployer: EIP2470,
  },
  {
    network: 'Metis Andromeda',
    chainId: 1088,
    explorerUrl: 'https://explorer.metis.io',
    status: 'production',
    create2Deployer: EIP2470,
  },
  {
    network: 'Boba Network',
    chainId: 288,
    explorerUrl: 'https://bobascan.com',
    status: 'production',
    create2Deployer: EIP2470,
  },
  {
    network: 'Moonriver',
    chainId: 1285,
    explorerUrl: 'https://moonriver.moonscan.io',
    status: 'production',
    create2Deployer: EIP2470,
  },
  {
    network: 'Fuse',
    chainId: 122,
    explorerUrl: 'https://explorer.fuse.io',
    status: 'production',
    create2Deployer: EIP2470,
  },
  {
    network: 'Harmony One',
    chainId: 1666600000,
    explorerUrl: 'https://explorer.harmony.one',
    status: 'production',
    create2Deployer: EIP2470,
  },

  // Testnets (Mumbai is legacy; prefer Amoy)
  {
    network: 'Ethereum Sepolia',
    chainId: 11155111,
    explorerUrl: 'https://sepolia.etherscan.io',
    status: 'testnet',
    create2Deployer: EIP2470,
  },
  {
    network: 'Polygon Amoy',
    chainId: 80002,
    explorerUrl: 'https://www.oklink.com/amoy',
    status: 'testnet',
    create2Deployer: EIP2470,
  },
  {
    network: 'Arbitrum Sepolia',
    chainId: 421614,
    explorerUrl: 'https://sepolia.arbiscan.io',
    status: 'testnet',
    create2Deployer: EIP2470,
  },
  {
    network: 'Base Sepolia',
    chainId: 84532,
    explorerUrl: 'https://sepolia.basescan.org',
    status: 'testnet',
    create2Deployer: EIP2470,
  },
  {
    network: 'Optimism Sepolia',
    chainId: 11155420,
    explorerUrl: 'https://sepolia-optimism.etherscan.io',
    status: 'testnet',
    create2Deployer: EIP2470,
  },

  // Local
  {
    network: 'Hardhat Local',
    chainId: 31337,
    explorerUrl: 'http://localhost:8545',
    status: 'local',
    create2Deployer: EIP2470,
  },
];

// ---- Helpers ----------------------------------------------------------------
function hex32(x: string): string {
  // ensure a 0x-prefixed 32-byte hex
  if (!x.startsWith('0x')) throw new Error('salt/bytes must be 0x-prefixed');
  const n = x.length;
  if (n === 66) return x.toLowerCase();
  // left-pad to 32 bytes
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
    const compiler = art.compiler || ((art as any).abi && undefined);
    return { bytecode, compiler };
  } catch {
    return null;
  }
}

// ---- Main -------------------------------------------------------------------
async function main() {
  console.log('🌍 PayRox Cross-Network Address Registry Generator\n');

  // Config (env overrideable)
  // Use ethers imports directly instead of runtime require

  const deployer = process.env.PRX_DEPLOYER_ADDR
    ? getAddress(process.env.PRX_DEPLOYER_ADDR)
    : getAddress(EIP2470);

  const version = process.env.PRX_VERSION || '1.0.0';
  const content = process.env.PRX_CONTENT_LABEL || 'PayRoxUniversalContract';
  const crossNonce = Number(process.env.PRX_CROSS_NONCE || '1000');

  // Try to load factory/target bytecode from artifacts; allow env fallback
  const factoryArtName = 'DeterministicChunkFactory'; // adjust to your factory contract name
  // default target artifact name; fall back to SaltViewFacet if missing in this repo
  const targetArtName = 'PayRoxUniversalContract'; // adjust to your target contract name

  // load artifact info (bytecode + compiler metadata) when available
  const factoryInfo = process.env.PRX_FACTORY_BYTECODE
    ? { bytecode: process.env.PRX_FACTORY_BYTECODE, compiler: undefined }
    : await loadArtifactInfo(factoryArtName);

  const targetInfo = process.env.PRX_TARGET_BYTECODE
    ? { bytecode: process.env.PRX_TARGET_BYTECODE, compiler: undefined }
    : await loadArtifactInfo(targetArtName);

  let factoryInitCode = factoryInfo?.bytecode;
  let targetInitCode = targetInfo?.bytecode;
  const _factoryCompiler = factoryInfo?.compiler;
  let _targetCompiler = targetInfo?.compiler;
  let _manifestFallbackUsed = false;

  // If the intended universal contract artifact isn't present, fall back to SaltViewFacet (read-only helpers)
  if (!targetInitCode) {
    const fallback = 'SaltViewFacet';
    const fbInfo = await loadArtifactInfo(fallback);
    if (fbInfo?.bytecode) {
      const allow = (process.env.ALLOW_FALLBACK || 'false').toLowerCase() === 'true';
      console.warn(
        `⚠️  Target artifact '${targetArtName}' missing; found fallback artifact '${fallback}'. allowFallback=${allow}`,
      );
      if (!allow) {
        throw new Error(
          `Target artifact '${targetArtName}' missing and ALLOW_FALLBACK is not set. Set PRX_TARGET_BYTECODE or ALLOW_FALLBACK=true to permit fallback.`,
        );
      }
      targetInitCode = fbInfo.bytecode;
      _targetCompiler = fbInfo.compiler;
      _manifestFallbackUsed = true;
    }
  }

  function bytesLength(hex: string | null | undefined) {
    if (!hex || typeof hex !== 'string' || !hex.startsWith('0x')) return 0;
    return Math.floor((hex.length - 2) / 2);
  }

  function validateInitCode(name: string, initCode: string | null | undefined) {
    if (!initCode)
      throw new Error(
        `${name} init code missing. Set PRX_${name.toUpperCase()}_BYTECODE or compile the contract.`,
      );
    if (!initCode.startsWith('0x')) throw new Error(`${name} init code must be 0x-prefixed`);
    const len = bytesLength(initCode);
    const EIP3860_MAX = 24576; // bytes
    if (len > EIP3860_MAX) {
      throw new Error(`${name} init code size ${len} bytes exceeds EIP-3860 limit ${EIP3860_MAX}`);
    }
  }

  // Validate presence and safety of init code
  validateInitCode('factory', factoryInitCode);
  validateInitCode('target', targetInitCode);

  // Phase-1: deterministic factory
  const defaultFactorySalt = keccak256(
    solidityPacked(['string', 'string'], ['PayRoxFactory', version]),
  );
  const factorySalt = hex32(process.env.PRX_FACTORY_SALT || defaultFactorySalt);
  const factoryInitCodeHash = keccak256(factoryInitCode as string);

  // Phase-2: universal target (deployed by the factory)
  const universalSalt = keccak256(
    solidityPacked(
      ['string', 'string', 'uint256', 'string'],
      ['PayRoxCrossChain', content, crossNonce, version],
    ),
  );
  const targetInitCodeHash = keccak256(targetInitCode as string);

  console.log('📋 Configuration');
  console.log('────────────────────────────────────────');
  console.log(`Deployer (EIP-2470):  ${deployer}`);
  console.log(`Factory name:         ${factoryArtName}`);
  console.log(`Target name:          ${targetArtName}`);
  console.log(`Factory salt:         ${factorySalt}`);
  console.log(`Factory initCodeHash: ${factoryInitCodeHash}`);
  console.log(`Universal salt:       ${universalSalt}`);
  console.log(`Target initCodeHash:  ${targetInitCodeHash}`);
  console.log(`Version:              ${version}`);
  console.log(`Content:              ${content}`);
  console.log(`Cross-chain Nonce:    ${crossNonce}\n`);

  // Compute addresses per network
  const rows: RegistryRow[] = NETWORKS.map((n) => {
    const phase1FactoryAddr = getCreate2Address(
      getAddress(n.create2Deployer),
      factorySalt,
      factoryInitCodeHash,
    );

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

  // Print summary tiers
  const prod = rows.filter((r) => r.status === 'production');
  const test = rows.filter((r) => r.status === 'testnet');
  const local = rows.filter((r) => r.status === 'local');

  console.log('🏭 PRODUCTION');
  console.log('────────────────────────────────────────');
  prod.forEach((r) => {
    console.log(
      `📍 ${r.network.padEnd(22)} (chainId ${r.chainId.toString().padEnd(7)})  Factory: ${r.predictedFactoryAddress}  Target: ${r.predictedTargetAddress}`,
    );
    console.log(`    🔗 ${r.explorerUrl}/address/${r.predictedTargetAddress}`);
  });

  console.log('\n🧪 TESTNETS');
  console.log('────────────────────────────────────────');
  test.forEach((r) => {
    console.log(
      `📍 ${r.network.padEnd(22)} (chainId ${r.chainId.toString().padEnd(7)})  Factory: ${r.predictedFactoryAddress}  Target: ${r.predictedTargetAddress}`,
    );
  });

  console.log('\n🏠 LOCAL');
  console.log('────────────────────────────────────────');
  local.forEach((r) => {
    console.log(
      `📍 ${r.network.padEnd(22)} (chainId ${r.chainId.toString().padEnd(7)})  Factory: ${r.predictedFactoryAddress}  Target: ${r.predictedTargetAddress}`,
    );
  });

  // Consistency checks (targets should all match if deployer+salts+bytecode are constant)
  const uniqTargets = [...new Set(rows.map((r) => r.predictedTargetAddress.toLowerCase()))];
  const uniqFactories = [...new Set(rows.map((r) => r.predictedFactoryAddress.toLowerCase()))];

  console.log('\n🔍 CONSISTENCY');
  console.log('────────────────────────────────────────');
  console.log(`Unique target addresses:  ${uniqTargets.length}`);
  console.log(`Unique factory addresses: ${uniqFactories.length}`);
  console.log(`Target cross-chain consistency: ${uniqTargets.length === 1 ? '✅ YES' : '❌ NO'}`);
  console.log(
    `Factory cross-chain consistency: ${uniqFactories.length === 1 ? '✅ YES' : '❌ NO'}`,
  );
  if (uniqTargets.length === 1) {
    console.log(`🎯 Universal Target: ${getAddress(uniqTargets[0])}`);
  }
  if (uniqFactories.length === 1) {
    console.log(`🏗  Universal Factory: ${getAddress(uniqFactories[0])}`);
  }

  // Manifest
  const manifest = {
    timestamp: new Date().toISOString(),
    version,
    content,
    crossChainNonce: crossNonce,
    salts: {
      factorySalt,
      universalSalt,
    },
    initCodeHashes: {
      factoryInitCodeHash,
      targetInitCodeHash,
    },
    deployers: {
      eip2470: deployer,
    },
    networks: rows,
    statistics: {
      totalNetworks: rows.length,
      production: prod.length,
      testnets: test.length,
      local: local.length,
      consistentTarget: uniqTargets.length === 1,
      consistentFactory: uniqFactories.length === 1,
    },
  };

  // Write
  const outA = path.resolve('./cross-network-address-registry.json');
  const outB = path.resolve('./manifests/cross-network-registry.json');
  writeJson(outA, manifest, 2);
  writeJson(outB, manifest, 2);

  const size = JSON.stringify(manifest).length;
  console.log('\n💾 EXPORT');
  console.log('────────────────────────────────────────');
  console.log(`Manifest → ${outA}`);
  console.log(`Manifest → ${outB}`);
  console.log(`Size: ${size} bytes`);

  console.log('\n🏆 COMPLETE');
}

main().catch((e) => {
  console.error('💥 Registry generation failed:', e);
  process.exit(1);
});
