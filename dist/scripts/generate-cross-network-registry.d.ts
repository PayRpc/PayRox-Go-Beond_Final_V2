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
export {};
