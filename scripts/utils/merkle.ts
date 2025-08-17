// Ethers v6: no utils namespace export; import needed functions directly
import { keccak256, concat, solidityPacked, toUtf8Bytes, getCreate2Address } from 'ethers';

/**
 * Pair hash matching OrderedMerkle._hashNode: keccak256(0x01 || left || right)
 */
function pairHash(a: string, b: string): string {
  return keccak256(concat(['0x01', a, b]));
}

/**
 * Leaf encoder matching OrderedMerkle.leafOfSelectorRoute:
 * leaf = keccak256(abi.encodePacked(bytes1(0x00), selector, facet, codehash))
 */
export function encodeLeaf(selector: string, facet: string, codehash: string): string {
  // use packed encoding to match abi.encodePacked
  const packed = solidityPacked(
    ['bytes1', 'bytes4', 'address', 'bytes32'],
    ['0x00', selector, facet, codehash],
  );
  return keccak256(packed);
}

/** Build a Merkle proof for a leaf index given all levels */
function proofForIndex(levels: string[][], leafIndex: number): string[] {
  const proof: string[] = [];
  let idx = leafIndex;
  for (let level = 0; level < levels.length - 1; level++) {
    const nodes = levels[level];
    const isRight = idx % 2 === 1;
    const sibling = isRight ? idx - 1 : idx + 1;
    if (sibling < nodes.length) proof.push(nodes[sibling]);
    idx = Math.floor(idx / 2);
  }
  return proof;
}

/** Derive function selectors from ABI if not explicitly provided */
export function deriveSelectorsFromAbi(abi: any[]): string[] {
  const sigs = abi
    .filter((f) => f?.type === 'function')
    .map((f) => `${f.name}(${(f.inputs || []).map((i: any) => i.type).join(',')})`);
  const sels = sigs.map((sig) => keccak256(toUtf8Bytes(sig)).slice(0, 10));
  return Array.from(new Set(sels));
}

export interface LeafMeta {
  selector: string;
  facet: string;
  codehash: string;
  facetName: string;
}

export type LibraryAddressMap = Record<string, string>; // { LibraryName: 0xAddress }

/** Link runtime/creation bytecode using deployed link references and provided library addresses */
export function linkBytecode(
  bytecode: string,
  linkReferences: any,
  libraryAddresses?: LibraryAddressMap,
): string {
  if (!bytecode || bytecode === '0x') return bytecode;
  // If no link refs, return as-is
  if (!linkReferences || Object.keys(linkReferences).length === 0) return bytecode;
  if (!libraryAddresses) {
    // Best-effort: if placeholders exist and we don't have addresses, throw for correctness
    throw new Error('Bytecode requires library linking but no library addresses were provided');
  }

  // Work on a mutable string
  let out = bytecode;
  for (const file of Object.keys(linkReferences)) {
    const libs = linkReferences[file] || {};
    for (const libName of Object.keys(libs)) {
      const addr = libraryAddresses[libName];
      if (!addr) {
        throw new Error(`Missing address for library ${libName} required to link bytecode`);
      }
      const addrHex = addr.replace(/^0x/, '').toLowerCase();
      if (addrHex.length !== 40) {
        throw new Error(`Invalid address for ${libName}: ${addr}`);
      }
      for (const ref of libs[libName]) {
        const start: number = ref.start; // bytes offset
        const length: number = ref.length; // bytes length, expected 20
        const hexStart = 2 + start * 2; // account for 0x
        const hexLen = length * 2;
        // Replace the slice with the address hex (ensure same length)
        out = out.slice(0, hexStart) + addrHex + out.slice(hexStart + hexLen);
      }
    }
  }
  return out;
}

/**
 * Generate Merkle leaves for the dispatcher:
 * leaf = keccak256(abi.encode(selector, predictedFacetAddress, runtimeCodeHash))
 *
 * @param manifest  object with `facets[]` (each has { name, contract, selectors? }),
 *                  and optional salts at manifest.deployment?.salts?.[facetName]
 * @param artifacts hardhat artifacts (hre.artifacts)
 * @param factoryAddress deployed/predicted factory address used for CREATE2
 * @returns { root, tree, proofs, leaves, leafMeta }
 */
export async function generateManifestLeaves(
  manifest: any,
  artifacts: any,
  factoryAddress: string,
  opts?: { libraryAddresses?: LibraryAddressMap },
): Promise<{
  root: string;
  tree: string[][];
  proofs: Record<string, string[]>;
  positions: Record<string, string>;
  leaves: string[];
  leafMeta: LeafMeta[];
}> {
  if (!factoryAddress) {
    // We allow factoryAddress to be absent only if all facets provide explicit addresses
    const allHaveAddresses =
      Array.isArray(manifest?.facets) &&
      manifest.facets.length > 0 &&
      manifest.facets.every((f: any) => !!f.address);
    if (!allHaveAddresses) {
      throw new Error(
        'generateManifestLeaves: factoryAddress is required when facets lack explicit addresses',
      );
    }
  }

  const leaves: string[] = [];
  const leafMeta: LeafMeta[] = [];

  for (const facet of manifest.facets) {
    const art = await artifacts.readArtifact(facet.contract);
    // Link runtime/creation if necessary
    const runtime = linkBytecode(
      art.deployedBytecode as string,
      art.deployedLinkReferences,
      opts?.libraryAddresses,
    );
    const creation = linkBytecode(
      art.bytecode as string,
      art.linkReferences,
      opts?.libraryAddresses,
    );

    if (!runtime || runtime === '0x') {
      throw new Error(
        `Facet ${facet.name} has no runtime bytecode (is it abstract or an interface?).`,
      );
    }

    const runtimeHash = keccak256(runtime); // == EXTCODEHASH on-chain
    const initCodeHash = keccak256(creation);

    // Prefer explicit deployed address when provided on facet entry or manifest.deployment.addresses
    const explicitAddress =
      facet.address ||
      manifest?.deployment?.addresses?.[facet.name] ||
      manifest?.deployment?.addresses?.[facet.name?.toLowerCase?.() ?? ''];

    let facetAddress: string;
    if (explicitAddress) {
      facetAddress = explicitAddress;
    } else {
      // Salt resolution (prefer explicit, else deterministic from name)
      const explicitSalt =
        manifest?.deployment?.salts?.[facet.name] ??
        manifest?.deployment?.[facet.name]?.salt ??
        manifest?.deployment?.[facet.name?.toLowerCase?.() ?? '']?.salt;

      const salt = explicitSalt ?? keccak256(toUtf8Bytes(`PayRox-${facet.name}`));

      facetAddress = getCreate2Address(factoryAddress, salt, initCodeHash);
    }

    // Use configured selectors if given, else derive from ABI
    const selectors: string[] =
      facet.selectors && facet.selectors.length > 0
        ? facet.selectors
        : deriveSelectorsFromAbi(art.abi);

    for (const sel of selectors) {
      const leaf = encodeLeaf(sel, facetAddress, runtimeHash);
      leaves.push(leaf);
      leafMeta.push({
        selector: sel,
        facet: facetAddress,
        codehash: runtimeHash,
        facetName: facet.name,
      });
    }
  }

  if (leaves.length === 0) {
    return { root: keccak256('0x'), tree: [], proofs: {}, positions: {}, leaves, leafMeta };
  }

  // Build Merkle using the same scheme as OrderedMerkle.sol:
  // - leafHash = keccak256(abi.encodePacked(bytes1(0x00), selector, facet, codehash))  (encodeLeaf)
  // - leafNode = keccak256(abi.encodePacked(bytes1(0x00), leafHash))                 (_hashLeaf)
  // - nodeHash = keccak256(abi.encodePacked(bytes1(0x01), left, right))             (_hashNode)
  const tree: string[][] = [];

  // First level: hashed leaf nodes (_hashLeaf)
  const leafNodes = leaves.map((l) => keccak256(concat(['0x00', l])));
  tree.push(leafNodes);

  let level = leafNodes;
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      if (i + 1 < level.length) next.push(pairHash(level[i], level[i + 1]));
      else next.push(level[i]); // duplicate last node (no extra prefix)
    }
    tree.push(next);
    level = next;
  }

  const root = level[0];

  // Proofs keyed by "selector:facet:codehash"
  const proofs: Record<string, string[]> = {};
  const positions: Record<string, string> = {};
  for (let i = 0; i < leaves.length; i++) {
    const key = `${leafMeta[i].selector}:${leafMeta[i].facet}:${leafMeta[i].codehash}`;
    // proof should contain sibling *node* values (ie. hashed leaf nodes and upper nodes) as used by OrderedMerkle.processProof
    const proof = proofForIndex(tree, i);
    proofs[key] = proof;

    // Build positions bitfield (LSB-first): bit i = 1 if sibling is on the right
    let bits = 0n;
    let idx = i;
    for (let level = 0; level < tree.length - 1; level++) {
      const isRight = idx % 2 === 1; // node is right child
      const siblingIsRight = !isRight; // sibling is right if node is left
      if (siblingIsRight) {
        bits |= 1n << BigInt(level);
      }
      idx = Math.floor(idx / 2);
    }
    // positionsHex as 0x-prefixed hex
    positions[key] = '0x' + bits.toString(16).padStart(Math.ceil((tree.length - 1) / 4), '0');
  }

  return { root, tree, proofs, positions, leaves, leafMeta };
}
