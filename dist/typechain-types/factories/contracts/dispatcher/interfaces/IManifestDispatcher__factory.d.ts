import { type ContractRunner } from "ethers";
import type { IManifestDispatcher, IManifestDispatcherInterface } from "../../../../contracts/dispatcher/interfaces/IManifestDispatcher";
export declare class IManifestDispatcher__factory {
    static readonly abi: readonly [{
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: false;
            readonly internalType: "uint64";
            readonly name: "oldDelay";
            readonly type: "uint64";
        }, {
            readonly indexed: false;
            readonly internalType: "uint64";
            readonly name: "newDelay";
            readonly type: "uint64";
        }];
        readonly name: "ActivationDelaySet";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [];
        readonly name: "Frozen";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "bytes32";
            readonly name: "root";
            readonly type: "bytes32";
        }, {
            readonly indexed: true;
            readonly internalType: "uint64";
            readonly name: "epoch";
            readonly type: "uint64";
        }];
        readonly name: "RootActivated";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "bytes32";
            readonly name: "root";
            readonly type: "bytes32";
        }, {
            readonly indexed: true;
            readonly internalType: "uint64";
            readonly name: "epoch";
            readonly type: "uint64";
        }];
        readonly name: "RootCommitted";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "bytes4";
            readonly name: "selector";
            readonly type: "bytes4";
        }, {
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "facet";
            readonly type: "address";
        }, {
            readonly indexed: false;
            readonly internalType: "bytes32";
            readonly name: "codehash";
            readonly type: "bytes32";
        }];
        readonly name: "RouteAdded";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "bytes4";
            readonly name: "selector";
            readonly type: "bytes4";
        }];
        readonly name: "RouteRemoved";
        readonly type: "event";
    }, {
        readonly inputs: readonly [];
        readonly name: "activateCommittedRoot";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "activationDelay";
        readonly outputs: readonly [{
            readonly internalType: "uint64";
            readonly name: "";
            readonly type: "uint64";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "activeEpoch";
        readonly outputs: readonly [{
            readonly internalType: "uint64";
            readonly name: "";
            readonly type: "uint64";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "activeRoot";
        readonly outputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "";
            readonly type: "bytes32";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes4[]";
            readonly name: "selectors";
            readonly type: "bytes4[]";
        }, {
            readonly internalType: "address[]";
            readonly name: "facetAddrs";
            readonly type: "address[]";
        }, {
            readonly internalType: "bytes32[]";
            readonly name: "codehashes";
            readonly type: "bytes32[]";
        }, {
            readonly internalType: "bytes32[][]";
            readonly name: "proofs";
            readonly type: "bytes32[][]";
        }, {
            readonly internalType: "bool[][]";
            readonly name: "isRight";
            readonly type: "bool[][]";
        }];
        readonly name: "applyRoutes";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "newRoot";
            readonly type: "bytes32";
        }, {
            readonly internalType: "uint64";
            readonly name: "newEpoch";
            readonly type: "uint64";
        }];
        readonly name: "commitRoot";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "freeze";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "frozen";
        readonly outputs: readonly [{
            readonly internalType: "bool";
            readonly name: "";
            readonly type: "bool";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "getManifestInfo";
        readonly outputs: readonly [{
            readonly components: readonly [{
                readonly internalType: "bytes32";
                readonly name: "hash";
                readonly type: "bytes32";
            }, {
                readonly internalType: "uint64";
                readonly name: "version";
                readonly type: "uint64";
            }, {
                readonly internalType: "uint64";
                readonly name: "timestamp";
                readonly type: "uint64";
            }, {
                readonly internalType: "uint256";
                readonly name: "selectorCount";
                readonly type: "uint256";
            }];
            readonly internalType: "struct IManifestDispatcher.ManifestInfo";
            readonly name: "info";
            readonly type: "tuple";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes4";
            readonly name: "selector";
            readonly type: "bytes4";
        }];
        readonly name: "getRoute";
        readonly outputs: readonly [{
            readonly internalType: "address";
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "getRouteCount";
        readonly outputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "pause";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "pendingEpoch";
        readonly outputs: readonly [{
            readonly internalType: "uint64";
            readonly name: "";
            readonly type: "uint64";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "pendingRoot";
        readonly outputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "";
            readonly type: "bytes32";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "pendingSince";
        readonly outputs: readonly [{
            readonly internalType: "uint64";
            readonly name: "";
            readonly type: "uint64";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes4[]";
            readonly name: "selectors";
            readonly type: "bytes4[]";
        }];
        readonly name: "removeRoutes";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes4";
            readonly name: "selector";
            readonly type: "bytes4";
        }];
        readonly name: "routes";
        readonly outputs: readonly [{
            readonly internalType: "address";
            readonly name: "facet";
            readonly type: "address";
        }, {
            readonly internalType: "bytes32";
            readonly name: "codehash";
            readonly type: "bytes32";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "uint64";
            readonly name: "newDelay";
            readonly type: "uint64";
        }];
        readonly name: "setActivationDelay";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "unpause";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "manifestHash";
            readonly type: "bytes32";
        }];
        readonly name: "verifyManifest";
        readonly outputs: readonly [{
            readonly internalType: "bool";
            readonly name: "ok";
            readonly type: "bool";
        }, {
            readonly internalType: "bytes32";
            readonly name: "current";
            readonly type: "bytes32";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }];
    static createInterface(): IManifestDispatcherInterface;
    static connect(address: string, runner?: ContractRunner | null): IManifestDispatcher;
}
