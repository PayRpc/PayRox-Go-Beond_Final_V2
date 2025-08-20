import { ContractFactory, ContractTransactionResponse } from "ethers";
import type { Signer, ContractDeployTransaction, ContractRunner } from "ethers";
import type { NonPayableOverrides } from "../../../common";
import type { EpochManager, EpochManagerInterface } from "../../../contracts/test/EpochManager";
type EpochManagerConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;
export declare class EpochManager__factory extends ContractFactory {
    constructor(...args: EpochManagerConstructorParams);
    getDeployTransaction(overrides?: NonPayableOverrides & {
        from?: string;
    }): Promise<ContractDeployTransaction>;
    deploy(overrides?: NonPayableOverrides & {
        from?: string;
    }): Promise<EpochManager & {
        deploymentTransaction(): ContractTransactionResponse;
    }>;
    connect(runner: ContractRunner | null): EpochManager__factory;
    static readonly bytecode = "0x608080604052346033575f80546001600160e01b03191633600160a01b600160e01b03191617905561040b90816100388239f35b5f80fdfe6080806040526004361015610012575f80fd5b5f3560e01c908163096f5be21461039a5750806311bde4fb146102ab5780633ac63e61146102695780633cf80e6c146100e55780638da5cb5b146100be5780639551dd58146100965763b97dd9e214610069575f80fd5b34610092575f36600319011261009257602067ffffffffffffffff5f5460a01c16604051908152f35b5f80fd5b34610092575f366003190112610092576001546040516001600160a01b039091168152602090f35b34610092575f366003190112610092575f546040516001600160a01b039091168152602090f35b34610092575f366003190112610092575f546001600160a01b03811633036102355767ffffffffffffffff8160a01c1690600182019067ffffffffffffffff82116102215767ffffffffffffffff918260a01b9060a01b16908260a01b191617805f5560a01c16906040519082817f5ede897ba72cfb01013c4079a6e32ebca356116954173b958e8f86979b95ad2b5f80a36001546001600160a01b03169081610195575b602060405160018152f35b5f838195602083960193636654984b60e01b855260248301526044820152604481526101c26064826103b3565b51925af1503d1561021c573d67ffffffffffffffff811161020857604051906101f5601f8201601f1916602001836103b3565b81525f60203d92013e5b8080808061018a565b634e487b7160e01b5f52604160045260245ffd5b6101ff565b634e487b7160e01b5f52601160045260245ffd5b60405162461bcd60e51b815260206004820152600c60248201526b155b985d5d1a1bdc9a5e995960a21b6044820152606490fd5b34610092576020366003190112610092576004356001600160a01b03811690819003610092576bffffffffffffffffffffffff60a01b60015416176001555f80f35b346100925760203660031901126100925760043567ffffffffffffffff811690818103610092575f5467ffffffffffffffff8160a01c16926064840167ffffffffffffffff81116102215767ffffffffffffffff161061035e5767ffffffffffffffff60a01b191660a091821b67ffffffffffffffff60a01b16175f818155911c67ffffffffffffffff1691907f5ede897ba72cfb01013c4079a6e32ebca356116954173b958e8f86979b95ad2b9080a3005b60405162461bcd60e51b815260206004820152601460248201527345706f6368206a756d7020746f6f206c6172676560601b6044820152606490fd5b34610092575f3660031901126100925780606460209252f35b90601f8019910116810190811067ffffffffffffffff8211176102085760405256fea2646970667358221220eb4abb892b9d70a5c3ee972bb5ae2da2ebced84f43738e4f92dbbc53baf3529164736f6c634300081e0033";
    static readonly abi: readonly [{
        readonly inputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "constructor";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "uint64";
            readonly name: "oldEpoch";
            readonly type: "uint64";
        }, {
            readonly indexed: true;
            readonly internalType: "uint64";
            readonly name: "newEpoch";
            readonly type: "uint64";
        }];
        readonly name: "EpochAdvanced";
        readonly type: "event";
    }, {
        readonly inputs: readonly [];
        readonly name: "MAX_EPOCH_JUMP";
        readonly outputs: readonly [{
            readonly internalType: "uint64";
            readonly name: "";
            readonly type: "uint64";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "advanceEpoch";
        readonly outputs: readonly [{
            readonly internalType: "bool";
            readonly name: "";
            readonly type: "bool";
        }];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "getCurrentEpoch";
        readonly outputs: readonly [{
            readonly internalType: "uint64";
            readonly name: "";
            readonly type: "uint64";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "listener";
        readonly outputs: readonly [{
            readonly internalType: "address";
            readonly name: "";
            readonly type: "address";
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
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "l";
            readonly type: "address";
        }];
        readonly name: "registerListener";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "uint64";
            readonly name: "newEpoch";
            readonly type: "uint64";
        }];
        readonly name: "setEpoch";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }];
    static createInterface(): EpochManagerInterface;
    static connect(address: string, runner?: ContractRunner | null): EpochManager;
}
export {};
