import { type ContractRunner } from "ethers";
import type { IDiamondLoupeEx, IDiamondLoupeExInterface } from "../../../contracts/interfaces/IDiamondLoupeEx";
export declare class IDiamondLoupeEx__factory {
    static readonly abi: readonly [{
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "bytes4";
            readonly name: "selector";
            readonly type: "bytes4";
        }, {
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "existingFacet";
            readonly type: "address";
        }, {
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "newFacet";
            readonly type: "address";
        }];
        readonly name: "SelectorConflict";
        readonly type: "event";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "facet";
            readonly type: "address";
        }];
        readonly name: "checkStorageConflicts";
        readonly outputs: readonly [{
            readonly internalType: "bytes32[]";
            readonly name: "conflicts_";
            readonly type: "bytes32[]";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes4";
            readonly name: "functionSelector";
            readonly type: "bytes4";
        }, {
            readonly internalType: "bytes32";
            readonly name: "requiredVersion";
            readonly type: "bytes32";
        }];
        readonly name: "facetAddressEx";
        readonly outputs: readonly [{
            readonly internalType: "address";
            readonly name: "facetAddress_";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes4[]";
            readonly name: "functionSelectors";
            readonly type: "bytes4[]";
        }];
        readonly name: "facetAddressesBatchEx";
        readonly outputs: readonly [{
            readonly internalType: "address[]";
            readonly name: "facetAddresses_";
            readonly type: "address[]";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bool";
            readonly name: "includeUnsafe";
            readonly type: "bool";
        }];
        readonly name: "facetAddressesEx";
        readonly outputs: readonly [{
            readonly internalType: "address[]";
            readonly name: "facetAddresses_";
            readonly type: "address[]";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "facet";
            readonly type: "address";
        }, {
            readonly internalType: "uint8";
            readonly name: "minSecurityLevel";
            readonly type: "uint8";
        }];
        readonly name: "facetFunctionSelectorsEx";
        readonly outputs: readonly [{
            readonly internalType: "bytes4[]";
            readonly name: "selectors_";
            readonly type: "bytes4[]";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "facet";
            readonly type: "address";
        }];
        readonly name: "facetHash";
        readonly outputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "";
            readonly type: "bytes32";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "facet";
            readonly type: "address";
        }];
        readonly name: "facetImplementation";
        readonly outputs: readonly [{
            readonly internalType: "address";
            readonly name: "implementation_";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "facet";
            readonly type: "address";
        }];
        readonly name: "facetMetadata";
        readonly outputs: readonly [{
            readonly components: readonly [{
                readonly internalType: "string";
                readonly name: "name";
                readonly type: "string";
            }, {
                readonly internalType: "string";
                readonly name: "category";
                readonly type: "string";
            }, {
                readonly internalType: "string[]";
                readonly name: "dependencies";
                readonly type: "string[]";
            }, {
                readonly internalType: "bool";
                readonly name: "isUpgradeable";
                readonly type: "bool";
            }];
            readonly internalType: "struct IDiamondLoupeEx.FacetMetadata";
            readonly name: "metadata_";
            readonly type: "tuple";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "facet";
            readonly type: "address";
        }];
        readonly name: "facetProvenance";
        readonly outputs: readonly [{
            readonly internalType: "address";
            readonly name: "deployer";
            readonly type: "address";
        }, {
            readonly internalType: "uint256";
            readonly name: "deployTimestamp";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bool";
            readonly name: "includeMetadata";
            readonly type: "bool";
        }];
        readonly name: "facetsEx";
        readonly outputs: readonly [{
            readonly components: readonly [{
                readonly internalType: "address";
                readonly name: "facetAddress";
                readonly type: "address";
            }, {
                readonly internalType: "bytes4[]";
                readonly name: "functionSelectors";
                readonly type: "bytes4[]";
            }, {
                readonly internalType: "bytes32";
                readonly name: "versionTag";
                readonly type: "bytes32";
            }, {
                readonly internalType: "uint8";
                readonly name: "securityLevel";
                readonly type: "uint8";
            }];
            readonly internalType: "struct IDiamondLoupeEx.FacetEx[]";
            readonly name: "facets_";
            readonly type: "tuple[]";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "facet";
            readonly type: "address";
        }];
        readonly name: "selectorHash";
        readonly outputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "";
            readonly type: "bytes32";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }];
    static createInterface(): IDiamondLoupeExInterface;
    static connect(address: string, runner?: ContractRunner | null): IDiamondLoupeEx;
}
