import { ContractFactory, ContractTransactionResponse } from "ethers";
import type { Signer, ContractDeployTransaction, ContractRunner } from "ethers";
import type { NonPayableOverrides } from "../../../common";
import type { RefactorSafetyLib, RefactorSafetyLibInterface } from "../../../contracts/libraries/RefactorSafetyLib";
type RefactorSafetyLibConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;
export declare class RefactorSafetyLib__factory extends ContractFactory {
    constructor(...args: RefactorSafetyLibConstructorParams);
    getDeployTransaction(overrides?: NonPayableOverrides & {
        from?: string;
    }): Promise<ContractDeployTransaction>;
    deploy(overrides?: NonPayableOverrides & {
        from?: string;
    }): Promise<RefactorSafetyLib & {
        deploymentTransaction(): ContractTransactionResponse;
    }>;
    connect(runner: ContractRunner | null): RefactorSafetyLib__factory;
    static readonly bytecode = "0x6080806040523460175760399081601c823930815050f35b5f80fdfe5f80fdfea26469706673582212209293b0f1710b646a0992d5aa9a5715fff9e396f6c4985b231d11d66851ad81f564736f6c634300081e0033";
    static readonly abi: readonly [{
        readonly inputs: readonly [];
        readonly name: "BaselineGasZero";
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
        readonly name: "IncompatibleStorageLayout";
        readonly type: "error";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "fromVersion";
            readonly type: "uint256";
        }, {
            readonly internalType: "uint256";
            readonly name: "toVersion";
            readonly type: "uint256";
        }];
        readonly name: "RefSafetyNonIncrementing";
        readonly type: "error";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "have";
            readonly type: "uint256";
        }, {
            readonly internalType: "uint256";
            readonly name: "minRequired";
            readonly type: "uint256";
        }];
        readonly name: "RefSafetyVersionIncompatible";
        readonly type: "error";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "string";
            readonly name: "reason";
            readonly type: "string";
        }];
        readonly name: "RefactorSafetyFailed";
        readonly type: "error";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes4";
            readonly name: "expected";
            readonly type: "bytes4";
        }, {
            readonly internalType: "bytes4";
            readonly name: "actual";
            readonly type: "bytes4";
        }];
        readonly name: "SelectorMismatch";
        readonly type: "error";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "bytes32";
            readonly name: "facetId";
            readonly type: "bytes32";
        }, {
            readonly indexed: false;
            readonly internalType: "uint256";
            readonly name: "version";
            readonly type: "uint256";
        }, {
            readonly indexed: false;
            readonly internalType: "bool";
            readonly name: "passed";
            readonly type: "bool";
        }];
        readonly name: "RefactorSafetyCheck";
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
            readonly name: "compatible";
            readonly type: "bool";
        }];
        readonly name: "SelectorCompatibilityVerified";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "bytes32";
            readonly name: "namespace";
            readonly type: "bytes32";
        }, {
            readonly indexed: false;
            readonly internalType: "bytes32";
            readonly name: "structHash";
            readonly type: "bytes32";
        }];
        readonly name: "StorageLayoutValidated";
        readonly type: "event";
    }];
    static createInterface(): RefactorSafetyLibInterface;
    static connect(address: string, runner?: ContractRunner | null): RefactorSafetyLib;
}
export {};
