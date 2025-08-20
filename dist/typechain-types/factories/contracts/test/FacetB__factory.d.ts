import { ContractFactory, ContractTransactionResponse } from "ethers";
import type { Signer, ContractDeployTransaction, ContractRunner } from "ethers";
import type { NonPayableOverrides } from "../../../common";
import type { FacetB, FacetBInterface } from "../../../contracts/test/FacetB";
type FacetBConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;
export declare class FacetB__factory extends ContractFactory {
    constructor(...args: FacetBConstructorParams);
    getDeployTransaction(overrides?: NonPayableOverrides & {
        from?: string;
    }): Promise<ContractDeployTransaction>;
    deploy(overrides?: NonPayableOverrides & {
        from?: string;
    }): Promise<FacetB & {
        deploymentTransaction(): ContractTransactionResponse;
    }>;
    connect(runner: ContractRunner | null): FacetB__factory;
    static readonly bytecode = "0x608080604052346013576074908160188239f35b5f80fdfe60808060405260043610156011575f80fd5b5f3560e01c630bfc516b146023575f80fd5b34603a575f366003190112603a5780600260209252f35b5f80fdfea2646970667358221220fa2b57e3ab13cfffae753404e7bf8e02f7da8334a2236056325325768fa9f30864736f6c634300081e0033";
    static readonly abi: readonly [{
        readonly inputs: readonly [];
        readonly name: "fooB";
        readonly outputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "pure";
        readonly type: "function";
    }];
    static createInterface(): FacetBInterface;
    static connect(address: string, runner?: ContractRunner | null): FacetB;
}
export {};
