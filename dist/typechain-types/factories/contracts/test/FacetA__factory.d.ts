import { ContractFactory, ContractTransactionResponse } from "ethers";
import type { Signer, ContractDeployTransaction, ContractRunner } from "ethers";
import type { NonPayableOverrides } from "../../../common";
import type { FacetA, FacetAInterface } from "../../../contracts/test/FacetA";
type FacetAConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;
export declare class FacetA__factory extends ContractFactory {
    constructor(...args: FacetAConstructorParams);
    getDeployTransaction(overrides?: NonPayableOverrides & {
        from?: string;
    }): Promise<ContractDeployTransaction>;
    deploy(overrides?: NonPayableOverrides & {
        from?: string;
    }): Promise<FacetA & {
        deploymentTransaction(): ContractTransactionResponse;
    }>;
    connect(runner: ContractRunner | null): FacetA__factory;
    static readonly bytecode = "0x608080604052346013576074908160188239f35b5f80fdfe60808060405260043610156011575f80fd5b5f3560e01c6374322ad9146023575f80fd5b34603a575f366003190112603a5780600160209252f35b5f80fdfea2646970667358221220e46f2ca62ba7f5f1751885dbd5b29083d73ebef9ac159fa49e7075d5f56a4df664736f6c634300081e0033";
    static readonly abi: readonly [{
        readonly inputs: readonly [];
        readonly name: "fooA";
        readonly outputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "pure";
        readonly type: "function";
    }];
    static createInterface(): FacetAInterface;
    static connect(address: string, runner?: ContractRunner | null): FacetA;
}
export {};
