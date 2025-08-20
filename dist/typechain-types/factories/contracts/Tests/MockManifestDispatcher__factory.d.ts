import { ContractFactory, ContractTransactionResponse } from "ethers";
import type { Signer, ContractDeployTransaction, ContractRunner } from "ethers";
import type { NonPayableOverrides } from "../../../common";
import type { MockManifestDispatcher, MockManifestDispatcherInterface } from "../../../contracts/Tests/MockManifestDispatcher";
type MockManifestDispatcherConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;
export declare class MockManifestDispatcher__factory extends ContractFactory {
    constructor(...args: MockManifestDispatcherConstructorParams);
    getDeployTransaction(overrides?: NonPayableOverrides & {
        from?: string;
    }): Promise<ContractDeployTransaction>;
    deploy(overrides?: NonPayableOverrides & {
        from?: string;
    }): Promise<MockManifestDispatcher & {
        deploymentTransaction(): ContractTransactionResponse;
    }>;
    connect(runner: ContractRunner | null): MockManifestDispatcher__factory;
    static readonly bytecode = "0x60808060405234602e5760038054600160801b600160c81b03191660e160841b17905561064390816100338239f35b5f80fdfe60806040526004361015610011575f80fd5b5f3560e01c8062ebb5f0146104ff578063054f7d9c146104da578063062576b21461046f578063248a9ca3146104545780632f2ff15d1461016d57806336568abe1461016d5780633a8c07861461042b5780633f4ba83a146101eb57806351c7094f146103a3578063575d7487146102ef57806362a5af3b146101eb578063750588cf146102d25780637d979a4f146102a95780637e932d321461026c5780638456cb59146101eb57806391d148541461025157806396b896eb146102325780639f6b4a3b1461020c578063abb2efdf146101f0578063adc6c3b2146101eb578063b416a8d4146101b4578063b782ba501461017d578063d547741f1461016d578063ec876c39146101555763f552501a1461012b575f80fd5b34610151575f3660031901126101515760206001600160401b0360035416604051908152f35b5f80fd5b34610151576020366003190112610151576004355f55005b346101515761017b3661053e565b005b34610151576020366003190112610151576004356001600160401b038111610151576101ad903690600401610579565b50506105a9565b34610151576020366003190112610151576001600160401b036101d5610528565b166001600160401b031960015416176001555f80f35b610564565b34610151575f3660031901126101515760205f54604051908152f35b34610151575f3660031901126101515760206001600160401b0360015416604051908152f35b346101515760203660031901126101515761024b610528565b506105a9565b346101515761025f3661053e565b5050602060405160018152f35b3461015157602036600319011261015157600435801515809103610151576003805460ff60c01b191660c09290921b60ff60c01b16919091179055005b34610151575f3660031901126101515760206001600160401b0360035460401c16604051908152f35b34610151575f366003190112610151576020600254604051908152f35b346101515760a0366003190112610151576004356001600160401b0381116101515761031f903690600401610579565b50506024356001600160401b03811161015157610340903690600401610579565b50506044356001600160401b03811161015157610361903690600401610579565b50506064356001600160401b03811161015157610382903690600401610579565b50506084356001600160401b038111610151576101ad903690600401610579565b346101515760203660031901126101515760043563ffffffff60e01b8116809103610151575f52600460205260405f2060405190604082018281106001600160401b038211176104175760409260209184526001808060a01b03845416938483520154918291015282519182526020820152f35b634e487b7160e01b5f52604160045260245ffd5b34610151575f3660031901126101515760206001600160401b0360035460801c16604051908152f35b346101515760203660031901126101515760206040515f8152f35b34610151575f366003190112610151575f606061048a6105ee565b828152826020820152826040820152015260806104a56105ee565b5f815260208101905f8252606060408201915f835201905f8252604051925f8452516020840152516040830152516060820152f35b34610151575f36600319011261015157602060ff60035460c01c166040519015158152f35b346101515760403660031901126101515760243561024b6001600160401b038216820361015157565b600435906001600160401b038216820361015157565b604090600319011261015157600435906024356001600160a01b03811681036101515790565b34610151575f366003190112156105a9575f80fd5b9181601f84011215610151578235916001600160401b038311610151576020808501948460051b01011161015157565b60405162461bcd60e51b815260206004820152601760248201527f4e6f7420696d706c656d656e74656420696e206d6f636b0000000000000000006044820152606490fd5b60405190608082018281106001600160401b038211176104175760405256fea2646970667358221220363b12893f7e8d8467e3e4424d69fe770065cf06b908f22ff14819f885b6d58f64736f6c634300081e0033";
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
        readonly stateMutability: "pure";
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
            readonly name: "";
            readonly type: "bytes4[]";
        }, {
            readonly internalType: "address[]";
            readonly name: "";
            readonly type: "address[]";
        }, {
            readonly internalType: "bytes32[]";
            readonly name: "";
            readonly type: "bytes32[]";
        }, {
            readonly internalType: "bytes32[][]";
            readonly name: "";
            readonly type: "bytes32[][]";
        }, {
            readonly internalType: "bool[][]";
            readonly name: "";
            readonly type: "bool[][]";
        }];
        readonly name: "applyRoutes";
        readonly outputs: readonly [];
        readonly stateMutability: "pure";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "";
            readonly type: "bytes32";
        }, {
            readonly internalType: "uint64";
            readonly name: "";
            readonly type: "uint64";
        }];
        readonly name: "commitRoot";
        readonly outputs: readonly [];
        readonly stateMutability: "pure";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "freeze";
        readonly outputs: readonly [];
        readonly stateMutability: "pure";
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
                readonly internalType: "uint256";
                readonly name: "version";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "timestamp";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "selectorCount";
                readonly type: "uint256";
            }];
            readonly internalType: "struct IManifestDispatcher.ManifestInfo";
            readonly name: "info";
            readonly type: "tuple";
        }];
        readonly stateMutability: "pure";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "";
            readonly type: "bytes32";
        }];
        readonly name: "getRoleAdmin";
        readonly outputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "";
            readonly type: "bytes32";
        }];
        readonly stateMutability: "pure";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "";
            readonly type: "bytes32";
        }, {
            readonly internalType: "address";
            readonly name: "";
            readonly type: "address";
        }];
        readonly name: "grantRole";
        readonly outputs: readonly [];
        readonly stateMutability: "pure";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "";
            readonly type: "bytes32";
        }, {
            readonly internalType: "address";
            readonly name: "";
            readonly type: "address";
        }];
        readonly name: "hasRole";
        readonly outputs: readonly [{
            readonly internalType: "bool";
            readonly name: "";
            readonly type: "bool";
        }];
        readonly stateMutability: "pure";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "pause";
        readonly outputs: readonly [];
        readonly stateMutability: "pure";
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
            readonly name: "";
            readonly type: "bytes4[]";
        }];
        readonly name: "removeRoutes";
        readonly outputs: readonly [];
        readonly stateMutability: "pure";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "";
            readonly type: "bytes32";
        }, {
            readonly internalType: "address";
            readonly name: "";
            readonly type: "address";
        }];
        readonly name: "renounceRole";
        readonly outputs: readonly [];
        readonly stateMutability: "pure";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "";
            readonly type: "bytes32";
        }, {
            readonly internalType: "address";
            readonly name: "";
            readonly type: "address";
        }];
        readonly name: "revokeRole";
        readonly outputs: readonly [];
        readonly stateMutability: "pure";
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
            readonly name: "";
            readonly type: "uint64";
        }];
        readonly name: "setActivationDelay";
        readonly outputs: readonly [];
        readonly stateMutability: "pure";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "uint64";
            readonly name: "epoch";
            readonly type: "uint64";
        }];
        readonly name: "setActiveEpoch";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "root";
            readonly type: "bytes32";
        }];
        readonly name: "setActiveRoot";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bool";
            readonly name: "isFrozen";
            readonly type: "bool";
        }];
        readonly name: "setFrozen";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "unpause";
        readonly outputs: readonly [];
        readonly stateMutability: "pure";
        readonly type: "function";
    }];
    static createInterface(): MockManifestDispatcherInterface;
    static connect(address: string, runner?: ContractRunner | null): MockManifestDispatcher;
}
export {};
