import { ContractFactory, ContractTransactionResponse } from "ethers";
import type { Signer, ContractDeployTransaction, ContractRunner } from "ethers";
import type { NonPayableOverrides } from "../../../common";
import type { SecurityFacet, SecurityFacetInterface } from "../../../contracts/facets/SecurityFacet";
type SecurityFacetConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;
export declare class SecurityFacet__factory extends ContractFactory {
    constructor(...args: SecurityFacetConstructorParams);
    getDeployTransaction(overrides?: NonPayableOverrides & {
        from?: string;
    }): Promise<ContractDeployTransaction>;
    deploy(overrides?: NonPayableOverrides & {
        from?: string;
    }): Promise<SecurityFacet & {
        deploymentTransaction(): ContractTransactionResponse;
    }>;
    connect(runner: ContractRunner | null): SecurityFacet__factory;
    static readonly bytecode = "0x6080806040523460195760015f556111ae908161001e8239f35b5f80fdfe6080806040526004361015610012575f80fd5b5f3560e01c9081630d2644d214610d4257508063328d8f7214610c885780633ea6b34314610c525780634d9b47e214610c18578063527555da14610b4b57806375b9f5b214610a7e57806388ded880146109e35780638fa3a84c1461086e57806394e096e41461052057806396d64879146104ef5780639f8e6da11461040c578063d4d0d6e614610365578063d55e62a0146102af578063de5f8d93146101f3578063e3064a771461010a5763f36c8f5c146100cc575f80fd5b34610106575f3660031901126101065760206040517f71840dc4906352362b0cdaf79870196c8e42acafade72d5d5a6d59291253ceb18152f35b5f80fd5b3461010657604036600319011261010657335f9081525f5160206111395f395f51905f526020526040902054600435906024359060ff1680156101d3575b156101c557811580156101bb575b6101ac57816040917fd081f5afbf5e2859f2be3d6c573e1cdd6c8fb93b18ec6145427882fe51507b6a935f5160206110795f395f51905f5255805f5160206110f95f395f51905f525582519182526020820152a1005b630fc88ead60e01b5f5260045ffd5b5080821015610156565b627d0a7d60e71b5f5260045ffd5b505f5160206111595f395f51905f52546001600160a01b03163314610148565b34610106575f36600319011261010657335f9081525f5160206111395f395f51905f52602052604090205460ff16801561028f575b156101c5575f5160206110995f395f51905f525460ff8160101c1661024957005b62ff000019165f5160206110995f395f51905f52557f62660d79c979483d4529c3a98fc5f219f0106d22f3c3ab3cd7343ad6343d626f604080515f81525f6020820152a1005b505f5160206111595f395f51905f52546001600160a01b03163314610228565b34610106576020366003190112610106576102c8610dc3565b335f9081525f5160206111395f395f51905f52602052604090205460ff168015610345575b156101c55760ff6102fd82610dd9565b541661030557005b61030e81610dd9565b805460ff191690556001600160a01b03167f6a9bd6c8d3252a586171ee60634c44169e3d8988aaf8eef74918ff41feaee91a5f80a2005b505f5160206111595f395f51905f52546001600160a01b031633146102ed565b346101065760203660031901126101065761037e610dc3565b335f9081525f5160206111395f395f51905f52602052604090205460ff1680156103ec575b156101c55760ff6103b382610dd9565b5416156103bc57005b6103c581610dd9565b805460ff191660011790556001600160a01b03165f5160206110b95f395f51905f525f80a2005b505f5160206111595f395f51905f52546001600160a01b031633146103a3565b34610106575f3660031901126101065760405160c081019080821067ffffffffffffffff8311176104db5760c091604052602081016040820160608301608084019160a085019360ff5f5160206110995f395f51905f52548181161515809852818160081c161515835260101c16151582525f5160206111195f395f51905f525483525f5160206110795f395f51905f525484525f5160206110f95f395f51905f52548552604051958652511515602086015251151560408501525160608401525160808301525160a0820152f35b634e487b7160e01b5f52604160045260245ffd5b3461010657602036600319011261010657602060ff61051461050f610dc3565b610dd9565b54166040519015158152f35b346101065760e036600319011261010657610539610db4565b60243560443560643560843567ffffffffffffffff811161010657366023820112156101065780600401359067ffffffffffffffff8211610106576024810190602436918460051b0101116101065760a4356001600160a01b038116949093908585036101065760c4356001600160a01b03811698909790898903610106575f5160206111595f395f51905f52546001600160a01b031615610859575b5f5160206111595f395f51905f52546001600160a01b03163303610814576105fd90610e11565b8061080f575060015b5f5160206111195f395f51905f52558061080a57506101f45b5f5160206110795f395f51905f52558061080557506105dc5b5f5160206110f95f395f51905f525561065033610dd9565b805460ff191660011790555f5b8281106107b6575050508161071d575b50508161067657005b5f8281527fba02f1627b1c879a0a3d33d8433bcb27266aff5e76f5aa759fe930d05a17dc3c60205260408120805460ff191660011790556106ff919083907f8227712ef8ad39d0f26f06731ef0df8665eb7ada7f41b1ee089adf3c238862a2907f2ae6a113c0ed5b78a53413ffbb7679881f11145ccfba4fb92e863dfcd5a1d2f39080a3610dd9565b805460ff191660011790555f5160206110b95f395f51905f525f80a2005b5f8281525f5160206111395f395f51905f5260205260408120805460ff19166001179055610793919083907f71840dc4906352362b0cdaf79870196c8e42acafade72d5d5a6d59291253ceb1907f2ae6a113c0ed5b78a53413ffbb7679881f11145ccfba4fb92e863dfcd5a1d2f39080a3610dd9565b805460ff191660011790555f5160206110b95f395f51905f525f80a2828061066d565b806107cf61050f6107ca6001948787611040565b611064565b8260ff19825416179055818060a01b036107ed6107ca838787611040565b165f5160206110b95f395f51905f525f80a20161065d565b610638565b61061f565b610606565b60405162461bcd60e51b815260206004820152601860248201527f536563757269747946616365743a206e6f74206f776e657200000000000000006044820152606490fd5b335f5160206111595f395f51905f52556105d6565b3461010657602036600319011261010657610887610dc3565b5f5160206110995f395f51905f525460ff8160101c166109d45760ff16806109c0575b6108ba575b602060405160018152f35b6001600160a01b0381165f9081527fb64ad6937e03ba10da13a7621c32c9241681e77fc551f1886afe6b366445d07060205260409020545f5160206111195f395f51905f5254806109bb575060015b81018082116109a75780431061095e575043146108af576001600160a01b03165f9081527fb64ad6937e03ba10da13a7621c32c9241681e77fc551f1886afe6b366445d07060205260409020439055806108af565b8260018060a01b0316807f710a0904ef91c56ce58d340823af4ed491643e2089991b0cac3126466e9ff8496020604051858152a263740505ed60e11b5f5260045260245260445ffd5b634e487b7160e01b5f52601160045260245ffd5b610909565b5060ff6109cc82610dd9565b5416156108aa565b63ff0376e760e01b5f5260045ffd5b3461010657602036600319011261010657335f9081527fba02f1627b1c879a0a3d33d8433bcb27266aff5e76f5aa759fe930d05a17dc3c602052604090205460ff168015610a5e575b156101c55760025f5414610a4f5760025f55610a49600435610e4b565b60015f55005b633ee5aeb560e01b5f5260045ffd5b505f5160206111595f395f51905f52546001600160a01b03163314610a2c565b3461010657602036600319011261010657335f9081525f5160206111395f395f51905f5260205260409020546004359060ff168015610b2b575b156101c55780610b0257507f7b2125f7088cf03b60d38a7e93a920e68b0a9cb1a9a7f7cca51a8312837c9d6c602060015b805f5160206111195f395f51905f5255604051908152a1005b60207f7b2125f7088cf03b60d38a7e93a920e68b0a9cb1a9a7f7cca51a8312837c9d6c91610ae9565b505f5160206111595f395f51905f52546001600160a01b03163314610ab8565b3461010657602036600319011261010657610b64610db4565b335f9081525f5160206111395f395f51905f52602052604090205460ff168015610bf8575b156101c55760ff5f5160206110995f395f51905f525460081c169015158091151503610bb157005b60205f5160206110d95f395f51905f52915f5160206110995f395f51905f525461ff008260081b169061ff001916175f5160206110995f395f51905f5255604051908152a1005b505f5160206111595f395f51905f52546001600160a01b03163314610b89565b34610106575f3660031901126101065760206040517f8227712ef8ad39d0f26f06731ef0df8665eb7ada7f41b1ee089adf3c238862a28152f35b34610106575f366003190112610106575f5160206111595f395f51905f52546040516001600160a01b0390911615158152602090f35b3461010657602036600319011261010657610ca1610db4565b335f9081525f5160206111395f395f51905f52602052604090205460ff168015610d22575b156101c55760ff5f5160206110995f395f51905f525416908015158092151503610cec57005b7fc28c38776cfea475aef8cc6b955a988d70e265b8b75b21485a3088c0da80016891610d19602092610e11565b604051908152a1005b505f5160206111595f395f51905f52546001600160a01b03163314610cc6565b34610106575f366003190112610106575f5160206110995f395f51905f525460ff8160101c166109d45760081c60ff16610d8157602060405160018152f35b62461bcd60e51b815260206004820152600e60248201526d109556509050d2d7d4105554d15160921b6044820152606490fd5b60043590811515820361010657565b600435906001600160a01b038216820361010657565b6001600160a01b03165f9081527fb64ad6937e03ba10da13a7621c32c9241681e77fc551f1886afe6b366445d0716020526040902090565b60ff80195f5160206110995f395f51905f52541691151516175f5160206110995f395f51905f5255565b600160ff1b81146109a7575f0390565b6040518181527ffdd2ba94632b3ee43a12fd32f8c7cffd4e45537712970c67d48b20a1f55e008a60203392a2610e8e5f5160206110f95f395f51905f5254610e3b565b811315610f8c57610eac5f5160206110795f395f51905f5254610e3b565b8113610f0457505f5160206110995f395f51905f525460ff8160081c1615610ed15750565b6101009061ff001916175f5160206110995f395f51905f52555f5160206110d95f395f51905f52602060405160018152a1565b5f131580610f71575b80610f55575b610f1957565b61ff00195f5160206110995f395f51905f5254165f5160206110995f395f51905f52555f5160206110d95f395f51905f5260206040515f8152a1565b5060ff5f5160206110995f395f51905f525460101c1615610f13565b5060ff5f5160206110995f395f51905f525460081c16610f0d565b5f5160206110995f395f51905f525460ff8160101c1615610fab575050565b7f62660d79c979483d4529c3a98fc5f219f0106d22f3c3ab3cd7343ad6343d626f9160409160ff6201000062ff000019831617805f5160206110995f395f51905f525560081c1615611008575b50815190600182526020820152a1565b620101009062ffff001916175f5160206110995f395f51905f52555f5160206110d95f395f51905f526020835160018152a15f610ff8565b91908110156110505760051b0190565b634e487b7160e01b5f52603260045260245ffd5b356001600160a01b0381168103610106579056feb64ad6937e03ba10da13a7621c32c9241681e77fc551f1886afe6b366445d06eb64ad6937e03ba10da13a7621c32c9241681e77fc551f1886afe6b366445d06cb7f5744b9b540d182bc49820e50bc69da5e5075d3830afd46fbd5694e890246cf4d3951cf5e6135665731d56456c9735d07299e5b4135c4ecc167535f63f2570b64ad6937e03ba10da13a7621c32c9241681e77fc551f1886afe6b366445d06fb64ad6937e03ba10da13a7621c32c9241681e77fc551f1886afe6b366445d06d53ab88076528c927edae747775dcce2b0dbfd10b46ddc8b101859057f1cbaba10e8fbb0149f902db2470938d763f4112c30ef97464e778592ff519dd36ab2e87a26469706673582212204ede10fb274b847d7fa09c1a91fd2439b9c77913aae69e85fe0834d65cff1a0f64736f6c634300081e0033";
    static readonly abi: readonly [{
        readonly inputs: readonly [];
        readonly name: "AuthDenied";
        readonly type: "error";
    }, {
        readonly inputs: readonly [];
        readonly name: "BadThresholds";
        readonly type: "error";
    }, {
        readonly inputs: readonly [];
        readonly name: "CircuitBreakerActive";
        readonly type: "error";
    }, {
        readonly inputs: readonly [];
        readonly name: "ReentrancyGuardReentrantCall";
        readonly type: "error";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "user";
            readonly type: "address";
        }, {
            readonly internalType: "uint256";
            readonly name: "untilBlock";
            readonly type: "uint256";
        }];
        readonly name: "TransactionThrottled";
        readonly type: "error";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: false;
            readonly internalType: "bool";
            readonly name: "enabled";
            readonly type: "bool";
        }];
        readonly name: "AntibotStatusUpdated";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: false;
            readonly internalType: "bool";
            readonly name: "status";
            readonly type: "bool";
        }];
        readonly name: "BuybackPaused";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: false;
            readonly internalType: "bool";
            readonly name: "status";
            readonly type: "bool";
        }, {
            readonly indexed: false;
            readonly internalType: "int256";
            readonly name: "moveBps";
            readonly type: "int256";
        }];
        readonly name: "CircuitBreaker";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "monitor";
            readonly type: "address";
        }, {
            readonly indexed: false;
            readonly internalType: "int256";
            readonly name: "moveBps";
            readonly type: "int256";
        }];
        readonly name: "MonitorPing";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "bytes32";
            readonly name: "role";
            readonly type: "bytes32";
        }, {
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "account";
            readonly type: "address";
        }];
        readonly name: "RoleGranted";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "bytes32";
            readonly name: "role";
            readonly type: "bytes32";
        }, {
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "account";
            readonly type: "address";
        }];
        readonly name: "RoleRevoked";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: false;
            readonly internalType: "uint256";
            readonly name: "pauseBps";
            readonly type: "uint256";
        }, {
            readonly indexed: false;
            readonly internalType: "uint256";
            readonly name: "circuitBps";
            readonly type: "uint256";
        }];
        readonly name: "ThresholdsUpdated";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: false;
            readonly internalType: "uint256";
            readonly name: "blocks";
            readonly type: "uint256";
        }];
        readonly name: "ThrottleUpdated";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "user";
            readonly type: "address";
        }, {
            readonly indexed: false;
            readonly internalType: "uint256";
            readonly name: "untilBlock";
            readonly type: "uint256";
        }];
        readonly name: "Throttled";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "account";
            readonly type: "address";
        }];
        readonly name: "TrustedAdded";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "account";
            readonly type: "address";
        }];
        readonly name: "TrustedRemoved";
        readonly type: "event";
    }, {
        readonly inputs: readonly [];
        readonly name: "GOVERNANCE_ROLE";
        readonly outputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "";
            readonly type: "bytes32";
        }];
        readonly stateMutability: "pure";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "MONITOR_ROLE";
        readonly outputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "";
            readonly type: "bytes32";
        }];
        readonly stateMutability: "pure";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "a";
            readonly type: "address";
        }];
        readonly name: "addTrusted";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "ensureBuybackAllowed";
        readonly outputs: readonly [{
            readonly internalType: "bool";
            readonly name: "ok";
            readonly type: "bool";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "getSecurityConfig";
        readonly outputs: readonly [{
            readonly components: readonly [{
                readonly internalType: "bool";
                readonly name: "antibotEnabled";
                readonly type: "bool";
            }, {
                readonly internalType: "bool";
                readonly name: "buybackPaused";
                readonly type: "bool";
            }, {
                readonly internalType: "bool";
                readonly name: "circuitBroken";
                readonly type: "bool";
            }, {
                readonly internalType: "uint256";
                readonly name: "throttleBlocks";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "pauseThresholdBps";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "circuitThresholdBps";
                readonly type: "uint256";
            }];
            readonly internalType: "struct SecurityFacet.SecurityConfig";
            readonly name: "cfg";
            readonly type: "tuple";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bool";
            readonly name: "enabled";
            readonly type: "bool";
        }, {
            readonly internalType: "uint256";
            readonly name: "throttleBlocks";
            readonly type: "uint256";
        }, {
            readonly internalType: "uint256";
            readonly name: "pauseBps";
            readonly type: "uint256";
        }, {
            readonly internalType: "uint256";
            readonly name: "circuitBps";
            readonly type: "uint256";
        }, {
            readonly internalType: "address[]";
            readonly name: "initialTrusted";
            readonly type: "address[]";
        }, {
            readonly internalType: "address";
            readonly name: "governance";
            readonly type: "address";
        }, {
            readonly internalType: "address";
            readonly name: "monitor";
            readonly type: "address";
        }];
        readonly name: "initializeSecurityFacet";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "isSecurityInitialized";
        readonly outputs: readonly [{
            readonly internalType: "bool";
            readonly name: "";
            readonly type: "bool";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "a";
            readonly type: "address";
        }];
        readonly name: "isTrusted";
        readonly outputs: readonly [{
            readonly internalType: "bool";
            readonly name: "";
            readonly type: "bool";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "a";
            readonly type: "address";
        }];
        readonly name: "removeTrusted";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "int256";
            readonly name: "moveBps";
            readonly type: "int256";
        }];
        readonly name: "reportMarketMove";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "resetCircuitBreaker";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bool";
            readonly name: "paused";
            readonly type: "bool";
        }];
        readonly name: "setBuybackPaused";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bool";
            readonly name: "enabled";
            readonly type: "bool";
        }];
        readonly name: "setEnabled";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "pauseBps_";
            readonly type: "uint256";
        }, {
            readonly internalType: "uint256";
            readonly name: "circuitBps_";
            readonly type: "uint256";
        }];
        readonly name: "setThresholds";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "blocks_";
            readonly type: "uint256";
        }];
        readonly name: "setThrottleBlocks";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "sender";
            readonly type: "address";
        }];
        readonly name: "validateTransaction";
        readonly outputs: readonly [{
            readonly internalType: "bool";
            readonly name: "ok";
            readonly type: "bool";
        }];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }];
    static createInterface(): SecurityFacetInterface;
    static connect(address: string, runner?: ContractRunner | null): SecurityFacet;
}
export {};
