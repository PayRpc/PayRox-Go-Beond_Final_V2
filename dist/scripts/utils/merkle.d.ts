/**
 * Leaf encoder matching OrderedMerkle.leafOfSelectorRoute:
 * leaf = keccak256(abi.encodePacked(bytes1(0x00), selector, facet, codehash))
 */
export declare function encodeLeaf(selector: string, facet: string, codehash: string): string;
/** Derive function selectors from ABI if not explicitly provided */
export declare function deriveSelectorsFromAbi(abi: any[]): string[];
export interface LeafMeta {
  selector: string;
  facet: string;
  codehash: string;
  facetName: string;
}
export type LibraryAddressMap = Record<string, string>;
/** Link runtime/creation bytecode using deployed link references and provided library addresses */
export declare function linkBytecode(
  bytecode: string,
  linkReferences: any,
  libraryAddresses?: LibraryAddressMap,
): string;
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
export declare function generateManifestLeaves(
  manifest: any,
  artifacts: any,
  factoryAddress: string,
  opts?: {
    libraryAddresses?: LibraryAddressMap;
  },
): Promise<{
  root: string;
  tree: string[][];
  proofs: Record<string, string[]>;
  positions: Record<string, string>;
  leaves: string[];
  leafMeta: LeafMeta[];
}>;
