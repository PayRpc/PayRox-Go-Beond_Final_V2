import { type ContractRunner } from "ethers";
import type { RefactorSafeFacetBase, RefactorSafeFacetBaseInterface } from "../../../contracts/libraries/RefactorSafeFacetBase";
export declare class RefactorSafeFacetBase__factory {
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
    }];
    static createInterface(): RefactorSafeFacetBaseInterface;
    static connect(address: string, runner?: ContractRunner | null): RefactorSafeFacetBase;
}
