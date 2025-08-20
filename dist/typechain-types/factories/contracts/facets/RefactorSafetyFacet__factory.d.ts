import { ContractFactory, ContractTransactionResponse } from "ethers";
import type { Signer, ContractDeployTransaction, ContractRunner } from "ethers";
import type { NonPayableOverrides } from "../../../common";
import type { RefactorSafetyFacet, RefactorSafetyFacetInterface } from "../../../contracts/facets/RefactorSafetyFacet";
type RefactorSafetyFacetConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;
export declare class RefactorSafetyFacet__factory extends ContractFactory {
    constructor(...args: RefactorSafetyFacetConstructorParams);
    getDeployTransaction(overrides?: NonPayableOverrides & {
        from?: string;
    }): Promise<ContractDeployTransaction>;
    deploy(overrides?: NonPayableOverrides & {
        from?: string;
    }): Promise<RefactorSafetyFacet & {
        deploymentTransaction(): ContractTransactionResponse;
    }>;
    connect(runner: ContractRunner | null): RefactorSafetyFacet__factory;
    static readonly bytecode = "0x6080806040523460135760d5908160188239f35b5f80fdfe60808060405260043610156011575f80fd5b5f3560e01c908163c34c492f146088575063e623a87c14602f575f80fd5b346084575f3660031901126084576040513060601b6020820152601481526040810190811067ffffffffffffffff8211176070578060209160405260018152f35b634e487b7160e01b5f52604160045260245ffd5b5f80fd5b346084575f36600319011260845780600160209252f3fea26469706673582212207b1640fe71f2bb75f870a7520d29f155176b662ec2a2db5f636a1d05d1376aac64736f6c634300081e0033";
    static readonly abi: readonly [{
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: false;
            readonly internalType: "uint256";
            readonly name: "version";
            readonly type: "uint256";
        }, {
            readonly indexed: false;
            readonly internalType: "bytes32";
            readonly name: "codeHash";
            readonly type: "bytes32";
        }];
        readonly name: "RefactorSafetyInitialized";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "bytes32";
            readonly name: "checkId";
            readonly type: "bytes32";
        }, {
            readonly indexed: false;
            readonly internalType: "string";
            readonly name: "checkType";
            readonly type: "string";
        }];
        readonly name: "RefactorValidationPassed";
        readonly type: "event";
    }, {
        readonly inputs: readonly [];
        readonly name: "emergencyRefactorValidation";
        readonly outputs: readonly [{
            readonly internalType: "bool";
            readonly name: "";
            readonly type: "bool";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "getRefactorSafetyVersion";
        readonly outputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "pure";
        readonly type: "function";
    }];
    static createInterface(): RefactorSafetyFacetInterface;
    static connect(address: string, runner?: ContractRunner | null): RefactorSafetyFacet;
}
export {};
