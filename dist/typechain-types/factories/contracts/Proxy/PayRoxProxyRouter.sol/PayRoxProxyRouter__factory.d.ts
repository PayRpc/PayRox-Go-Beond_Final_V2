import { ContractFactory, ContractTransactionResponse } from "ethers";
import type { Signer, ContractDeployTransaction, ContractRunner } from "ethers";
import type { NonPayableOverrides } from "../../../../common";
import type { PayRoxProxyRouter, PayRoxProxyRouterInterface } from "../../../../contracts/Proxy/PayRoxProxyRouter.sol/PayRoxProxyRouter";
type PayRoxProxyRouterConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;
export declare class PayRoxProxyRouter__factory extends ContractFactory {
    constructor(...args: PayRoxProxyRouterConstructorParams);
    getDeployTransaction(overrides?: NonPayableOverrides & {
        from?: string;
    }): Promise<ContractDeployTransaction>;
    deploy(overrides?: NonPayableOverrides & {
        from?: string;
    }): Promise<PayRoxProxyRouter & {
        deploymentTransaction(): ContractTransactionResponse;
    }>;
    connect(runner: ContractRunner | null): PayRoxProxyRouter__factory;
    static readonly bytecode = "0x60808060405234601557611547908161001a8239f35b5f80fdfe60806040526004361015610015575b3661136557005b5f3560e01c806304a49dde14610174578063054f7d9c1461016f5780630729d1ce1461016a5780630d13cfb614610165578063123d04641461016057806316c38b3c1461015b5780631870221e146101565780631a6e649e146101515780631c62af521461014c5780635c975abb1461014757806362a5af3b14610142578063715018a61461013d5780638da5cb5b1461013857806399e2a2ff14610133578063ad61b5411461012e578063b925013514610129578063c1cda55e14610124578063cb7e90571461011f578063cfdbf2541461011a578063d6e5db0f14610115578063ea62ee12146101105763f2fde38b0361000e57611021565b610ff8565b610f26565b610f0b565b610ed7565b610e3e565b610da3565b610d75565b610cdc565b610ca8565b610c34565b610bb7565b610b86565b6109d8565b61091b565b610740565b610696565b610666565b610420565b610274565b610208565b34610204575f366003190112610204575f5160206114f25f395f51905f525460405163abb2efdf60e01b815290602090829060049082906001600160a01b03165afa9081156101ff575f916101d0575b50604051908152602090f35b6101f2915060203d6020116101f8575b6101ea81836110b2565b8101906110d9565b5f6101c4565b503d6101e0565b6110e8565b5f80fd5b34610204575f36600319011261020457602060ff5f5160206114b25f395f51905f525460101c166040519015158152f35b9181601f840112156102045782359167ffffffffffffffff8311610204576020808501948460051b01011161020457565b8015150361020457565b346102045760403660031901126102045760043567ffffffffffffffff8111610204576102a5903690600401610239565b6024356102b18161026a565b5f5160206114925f395f51905f52546001600160a01b03163303610388575f5b8281101561030f57600190610309836102f88360051b8801356102f381610397565b611114565b9060ff801983541691151516179055565b016102d1565b5060405191806040840160408552526060830193905f5b81811061035d5783151560208601527faf8985cdfaa296b885fdd0a2d9f56c5ad7eff0d4b1df1a4e4a46c602f07d613b85870386a1005b909194602080600192883561037181610397565b6001600160e01b0319168152019601929101610326565b6330cd747160e01b5f5260045ffd5b6001600160e01b031981160361020457565b602081016020825282518091526040820191602060408360051b8301019401925f915b8383106103db57505050505090565b909192939460208080600193603f19868203018752818a518051918291828552018484015e5f828201840152601f01601f1916010197019594919091019201906103cc565b346102045760403660031901126102045760043561043d81610397565b60243567ffffffffffffffff81116102045761045d903690600401610239565b90915f5160206114b25f395f51905f525461047c8160ff9060081c1690565b61065757601881901c60ff166106485782156106395760328311610620576104ad6104a683611114565b5460ff1690565b6106035760ff166105ac575b6104c28261118c565b925a916104cd6111d5565b5f5b84811061052d57610529867f2403003b183ff811dedab647749b7525f94e39ff05e4a7b4f02743c21b6c16228787610505611202565b5a60408051938452910360208301524290820152606090a1604051918291826103a9565b0390f35b61057e61056161053e83888761125c565b9190610553604051938492886020850161127c565b03601f1981018352826110b2565b5f5160206114f25f395f51905f52546001600160a01b0316611401565b90156105a45790600191610592828961129c565b5261059d818861129c565b50016104cf565b602081519101fd5b5f5160206114d25f395f51905f5254806105c7575b506104b9565b5f5160206114f25f395f51905f52546001600160a01b03163f908082036105ee57506105c1565b633b1ba18960e21b5f5260045260245260445ffd5b6327fe336560e21b5f526001600160e01b0319821660045260245ffd5b63bb1cb70b60e01b5f526004839052603260245260445ffd5b63c2e5347d60e01b5f5260045ffd5b634168653160e01b5f5260045ffd5b6313d0ff5960e31b5f5260045ffd5b3461020457602036600319011261020457602060ff61068a6004356102f381610397565b54166040519015158152f35b34610204576020366003190112610204576004356106b38161026a565b5f5160206114925f395f51905f52546001600160a01b031633036103885760207f40db37ff5c0bdc2c427fbb2078c8f24afea940abac0e3c23bb4ea3bf2da2b212915f5160206114b25f395f51905f525461ff0082151560081b169061ff001916175f5160206114b25f395f51905f52556040519015158152a1005b6001600160a01b0381160361020457565b346102045760803660031901126102045760043561075d8161072f565b6024356107698161072f565b606435906044356107798361026a565b5f5160206114925f395f51905f52546001600160a01b031661090d576001600160a01b038216156108fe576107d5826107eb956107b86107e69561142d565b6001600160a01b0381166108f557506107d0336112b0565b6112ea565b5f5160206114d25f395f51905f5255565b61114a565b61081361ff00195f5160206114b25f395f51905f5254165f5160206114b25f395f51905f5255565b61083c62ff0000195f5160206114b25f395f51905f5254165f5160206114b25f395f51905f5255565b610844611202565b5f5160206114925f395f51905f52547f5532c4c11a5414a133c3fbd4b41f4234de11dd433a8db193ad6854378cbf00f2906001600160a01b03165f5160206114f25f395f51905f52546001600160a01b0316906108f05f5160206114d25f395f51905f52546108c15f5160206114b25f395f51905f525460ff1690565b604080516001600160a01b03958616815295909416602086015292840152901515606083015281906080820190565b0390a1005b6107d0906112b0565b63433f963360e11b5f5260045ffd5b62dc149f60e41b5f5260045ffd5b346102045760203660031901126102045760043561093881610397565b5f5160206114f25f395f51905f5254604080516351c7094f60e01b81526001600160e01b0319909316600484015290829060249082906001600160a01b03165afa9081156101ff575f905f926109a6575b50604080516001600160a01b039290921682526020820192909252f35b90506109ca915060403d6040116109d1575b6109c281836110b2565b810190611324565b905f610989565b503d6109b8565b346102045760203660031901126102045760043567ffffffffffffffff811161020457610a09903690600401610239565b5f5160206114b25f395f51905f5254600881901c60ff1661065757601881901c60ff166106485781156106395760328211610b6d5760ff16610b2b575b610a4f8161118c565b915a90610a5a6111d5565b5f5b838110610a9257610529857f2403003b183ff811dedab647749b7525f94e39ff05e4a7b4f02743c21b6c16228686610505611202565b610aa5610aa0828685611343565b611107565b610ab16104a682611114565b610b0f57610553610561610ae992610ad7610acd868a89611343565b6020810190611229565b6040949194519485936020850161127c565b90156105a45790600191610afd828861129c565b52610b08818761129c565b5001610a5c565b6327fe336560e21b5f526001600160e01b03191660045260245ffd5b5f5160206114d25f395f51905f525480610b46575b50610a46565b5f5160206114f25f395f51905f52546001600160a01b03163f908082036105ee5750610b40565b63bb1cb70b60e01b5f526004829052603260245260445ffd5b34610204575f36600319011261020457602060ff5f5160206114b25f395f51905f525460081c166040519015158152f35b34610204575f366003190112610204575f5160206114925f395f51905f52546001600160a01b03163303610388576201000062ff0000195f5160206114b25f395f51905f525416175f5160206114b25f395f51905f52557fa8cab3d1893ed53071b052fafa843143492f25d1d6b0170d460789f7ab1954be5f80a1005b34610204575f366003190112610204575f5160206114925f395f51905f52546001600160a01b031633819003610388575f5160206114925f395f51905f5280546001600160a01b03191690555f907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e08280a3005b34610204575f366003190112610204575f5160206114925f395f51905f52546040516001600160a01b039091168152602090f35b34610204575f366003190112610204575f5160206114f25f395f51905f5254604051630153df6760e21b815290602090829060049082906001600160a01b03165afa80156101ff575f90610d38575b6040519015158152602090f35b506020813d602011610d6d575b81610d52602093836110b2565b81010312610204576105299051610d688161026a565b610d2b565b3d9150610d45565b34610204575f36600319011261020457602060ff5f5160206114b25f395f51905f5254166040519015158152f35b3461020457602036600319011261020457600435610dc08161026a565b5f5160206114925f395f51905f52546001600160a01b031633036103885760ff5f5160206114b25f395f51905f525460101c16610e2f57602081610e247fc92775c4b27f81e1bbd67f1d8dac03260d4d9aa33dbd88252ac151d04abca95c9361114a565b6040519015158152a1005b63277a2aa960e21b5f5260045ffd5b34610204576020366003190112610204576004355f5160206114925f395f51905f52546001600160a01b031633036103885760ff5f5160206114b25f395f51905f525460101c16610e2f575f5160206114d25f395f51905f528054908290556040805191825260208201929092527f256cf243b8b676b7c275e8535144b46b3182a083ad5bdae24c7a9d56d09cdc8491819081016108f0565b34610204575f366003190112610204575f5160206114f25f395f51905f52546040516001600160a01b039091168152602090f35b34610204575f36600319011261020457602060405160328152f35b3461020457604036600319011261020457600435610f438161072f565b5f5160206114925f395f51905f525460243591906001600160a01b031633036103885760ff5f5160206114b25f395f51905f525460101c16610e2f576001600160a01b0381169182156108fe5760207f6de3bad16508c7f8935b97ae9494d3ee63a1b0968a031c4e087b107a67c0fb2391610fbd8461142d565b5f5160206114f25f395f51905f52546001600160a01b031693610fdf906112ea565b805f5160206114d25f395f51905f5255604051908152a3005b34610204575f3660031901126102045760205f5160206114d25f395f51905f5254604051908152f35b346102045760203660031901126102045760043561103e8161072f565b5f5160206114925f395f51905f52546001600160a01b031633819003610388576001600160a01b03821691821561038857611078906112b0565b7f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e05f80a3005b634e487b7160e01b5f52604160045260245ffd5b90601f8019910116810190811067ffffffffffffffff8211176110d457604052565b61109e565b90816020910312610204575190565b6040513d5f823e3d90fd5b634e487b7160e01b5f52603260045260245ffd5b3561111181610397565b90565b63ffffffff60e01b165f527f33ae63e241c61ef0943c007e4f9cfac6915b02021dcc9b3cab93785eef505a6e60205260405f2090565b60ff80195f5160206114b25f395f51905f52541691151516175f5160206114b25f395f51905f5255565b67ffffffffffffffff81116110d45760051b60200190565b9061119682611174565b6111a360405191826110b2565b82815280926111b4601f1991611174565b01905f5b8281106111c457505050565b8060606020809385010152016111b8565b630100000063ff000000195f5160206114b25f395f51905f525416175f5160206114b25f395f51905f5255565b63ff000000195f5160206114b25f395f51905f5254165f5160206114b25f395f51905f5255565b903590601e1981360301821215610204570180359067ffffffffffffffff82116102045760200191813603831361020457565b90821015611277576112739160051b810190611229565b9091565b6110f3565b6001600160e01b031990911681526004929182908483013701015f815290565b80518210156112775760209160051b010190565b60018060a01b03166bffffffffffffffffffffffff60a01b5f5160206114925f395f51905f525416175f5160206114925f395f51905f5255565b60018060a01b03166bffffffffffffffffffffffff60a01b5f5160206114f25f395f51905f525416175f5160206114f25f395f51905f5255565b9190826040910312610204576020825161133d8161072f565b92015190565b91908110156112775760051b81013590603e1981360301821215610204570190565b5f5160206114b25f395f51905f5254600881901c60ff16610657575f3560e01c6113916104a682611114565b610b0f57505f5160206114f25f395f51905f52546001600160a01b03169060ff166113d6575b5f8060405192368285378336915af4903d91825f833e156113d457f35bfd5b5f5160206114d25f395f51905f5254806113f1575b506113b7565b813f908082036105ee57506113eb565b5f918291602082519201905af4903d9060405191601f19603f82011683016040528083525f602084013e565b60405163abb2efdf60e01b81526001600160a01b03919091169190602081600481865afa9081611474575b5061147057506379bd133960e01b5f5260045260245ffd5b9050565b61148c9060203d6020116101f8576101ea81836110b2565b61145856fe33ae63e241c61ef0943c007e4f9cfac6915b02021dcc9b3cab93785eef505a6a33ae63e241c61ef0943c007e4f9cfac6915b02021dcc9b3cab93785eef505a6d33ae63e241c61ef0943c007e4f9cfac6915b02021dcc9b3cab93785eef505a6c33ae63e241c61ef0943c007e4f9cfac6915b02021dcc9b3cab93785eef505a6ba2646970667358221220679e839d553c158da684394da07dbcd02e23bf2576172b271024516de52a4da864736f6c634300081e0033";
    static readonly abi: readonly [{
        readonly inputs: readonly [];
        readonly name: "AlreadyInitialized";
        readonly type: "error";
    }, {
        readonly inputs: readonly [];
        readonly name: "BatchReentrancy";
        readonly type: "error";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "size";
            readonly type: "uint256";
        }, {
            readonly internalType: "uint256";
            readonly name: "maxSize";
            readonly type: "uint256";
        }];
        readonly name: "BatchTooLarge";
        readonly type: "error";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "expected";
            readonly type: "bytes32";
        }, {
            readonly internalType: "bytes32";
            readonly name: "actual";
            readonly type: "bytes32";
        }];
        readonly name: "DispatcherCodehashMismatch";
        readonly type: "error";
    }, {
        readonly inputs: readonly [];
        readonly name: "DispatcherZero";
        readonly type: "error";
    }, {
        readonly inputs: readonly [];
        readonly name: "EmptyBatch";
        readonly type: "error";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes4";
            readonly name: "selector";
            readonly type: "bytes4";
        }];
        readonly name: "ForbiddenSelector";
        readonly type: "error";
    }, {
        readonly inputs: readonly [];
        readonly name: "FrozenRouter";
        readonly type: "error";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "dispatcher";
            readonly type: "address";
        }];
        readonly name: "IncompatibleDispatcher";
        readonly type: "error";
    }, {
        readonly inputs: readonly [];
        readonly name: "NotOwner";
        readonly type: "error";
    }, {
        readonly inputs: readonly [];
        readonly name: "Paused";
        readonly type: "error";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: false;
            readonly internalType: "uint256";
            readonly name: "callCount";
            readonly type: "uint256";
        }, {
            readonly indexed: false;
            readonly internalType: "uint256";
            readonly name: "gasUsed";
            readonly type: "uint256";
        }, {
            readonly indexed: false;
            readonly internalType: "uint256";
            readonly name: "timestamp";
            readonly type: "uint256";
        }];
        readonly name: "BatchExecuted";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: false;
            readonly internalType: "bytes32";
            readonly name: "oldCodehash";
            readonly type: "bytes32";
        }, {
            readonly indexed: false;
            readonly internalType: "bytes32";
            readonly name: "newCodehash";
            readonly type: "bytes32";
        }];
        readonly name: "DispatcherCodehashSet";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "oldDispatcher";
            readonly type: "address";
        }, {
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "newDispatcher";
            readonly type: "address";
        }, {
            readonly indexed: false;
            readonly internalType: "bytes32";
            readonly name: "codehash";
            readonly type: "bytes32";
        }];
        readonly name: "DispatcherUpdated";
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
            readonly internalType: "address";
            readonly name: "previousOwner";
            readonly type: "address";
        }, {
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "newOwner";
            readonly type: "address";
        }];
        readonly name: "OwnershipTransferred";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: false;
            readonly internalType: "bool";
            readonly name: "paused";
            readonly type: "bool";
        }];
        readonly name: "PausedSet";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: false;
            readonly internalType: "address";
            readonly name: "owner";
            readonly type: "address";
        }, {
            readonly indexed: false;
            readonly internalType: "address";
            readonly name: "dispatcher";
            readonly type: "address";
        }, {
            readonly indexed: false;
            readonly internalType: "bytes32";
            readonly name: "dispatcherCodehash";
            readonly type: "bytes32";
        }, {
            readonly indexed: false;
            readonly internalType: "bool";
            readonly name: "strictCodehash";
            readonly type: "bool";
        }];
        readonly name: "PayRoxProxyRouterInitialized";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: false;
            readonly internalType: "bytes4[]";
            readonly name: "selectors";
            readonly type: "bytes4[]";
        }, {
            readonly indexed: false;
            readonly internalType: "bool";
            readonly name: "forbidden";
            readonly type: "bool";
        }];
        readonly name: "SelectorsForbidden";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: false;
            readonly internalType: "bool";
            readonly name: "enabled";
            readonly type: "bool";
        }];
        readonly name: "StrictCodehashSet";
        readonly type: "event";
    }, {
        readonly stateMutability: "payable";
        readonly type: "fallback";
    }, {
        readonly inputs: readonly [];
        readonly name: "MAX_BATCH_SIZE";
        readonly outputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes4";
            readonly name: "selector";
            readonly type: "bytes4";
        }, {
            readonly internalType: "bytes[]";
            readonly name: "datas";
            readonly type: "bytes[]";
        }];
        readonly name: "batchCallSameFunction";
        readonly outputs: readonly [{
            readonly internalType: "bytes[]";
            readonly name: "results";
            readonly type: "bytes[]";
        }];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly components: readonly [{
                readonly internalType: "bytes4";
                readonly name: "selector";
                readonly type: "bytes4";
            }, {
                readonly internalType: "bytes";
                readonly name: "data";
                readonly type: "bytes";
            }];
            readonly internalType: "struct BatchCall[]";
            readonly name: "calls";
            readonly type: "tuple[]";
        }];
        readonly name: "batchExecute";
        readonly outputs: readonly [{
            readonly internalType: "bytes[]";
            readonly name: "results";
            readonly type: "bytes[]";
        }];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "dispatcher";
        readonly outputs: readonly [{
            readonly internalType: "address";
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "dispatcherCodehash";
        readonly outputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "";
            readonly type: "bytes32";
        }];
        readonly stateMutability: "view";
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
        readonly name: "getActiveManifestRoot";
        readonly outputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "";
            readonly type: "bytes32";
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
            readonly internalType: "address";
            readonly name: "owner_";
            readonly type: "address";
        }, {
            readonly internalType: "address";
            readonly name: "dispatcher_";
            readonly type: "address";
        }, {
            readonly internalType: "bytes32";
            readonly name: "expectedCodehash";
            readonly type: "bytes32";
        }, {
            readonly internalType: "bool";
            readonly name: "strictCodehash_";
            readonly type: "bool";
        }];
        readonly name: "initializeProxyRouter";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "isDispatcherFrozen";
        readonly outputs: readonly [{
            readonly internalType: "bool";
            readonly name: "";
            readonly type: "bool";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes4";
            readonly name: "selector";
            readonly type: "bytes4";
        }];
        readonly name: "isForbidden";
        readonly outputs: readonly [{
            readonly internalType: "bool";
            readonly name: "";
            readonly type: "bool";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "owner";
        readonly outputs: readonly [{
            readonly internalType: "address";
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "paused";
        readonly outputs: readonly [{
            readonly internalType: "bool";
            readonly name: "";
            readonly type: "bool";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "renounceOwnership";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "dispatcher_";
            readonly type: "address";
        }, {
            readonly internalType: "bytes32";
            readonly name: "expectedCodehash";
            readonly type: "bytes32";
        }];
        readonly name: "setDispatcher";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "expected";
            readonly type: "bytes32";
        }];
        readonly name: "setDispatcherCodehash";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes4[]";
            readonly name: "selectors";
            readonly type: "bytes4[]";
        }, {
            readonly internalType: "bool";
            readonly name: "forbidden";
            readonly type: "bool";
        }];
        readonly name: "setForbiddenSelectors";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bool";
            readonly name: "paused_";
            readonly type: "bool";
        }];
        readonly name: "setPaused";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bool";
            readonly name: "enabled";
            readonly type: "bool";
        }];
        readonly name: "setStrictCodehash";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "strictCodehash";
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
            readonly name: "newOwner";
            readonly type: "address";
        }];
        readonly name: "transferOwnership";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly stateMutability: "payable";
        readonly type: "receive";
    }];
    static createInterface(): PayRoxProxyRouterInterface;
    static connect(address: string, runner?: ContractRunner | null): PayRoxProxyRouter;
}
export {};
