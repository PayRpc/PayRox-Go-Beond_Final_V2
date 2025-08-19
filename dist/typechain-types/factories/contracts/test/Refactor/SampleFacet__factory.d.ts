import { ContractFactory, ContractTransactionResponse } from "ethers";
import type { Signer, ContractDeployTransaction, ContractRunner } from "ethers";
import type { NonPayableOverrides } from "../../../../common";
import type { SampleFacet, SampleFacetInterface } from "../../../../contracts/test/Refactor/SampleFacet";
type SampleFacetConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;
export declare class SampleFacet__factory extends ContractFactory {
    constructor(...args: SampleFacetConstructorParams);
    getDeployTransaction(overrides?: NonPayableOverrides & {
        from?: string;
    }): Promise<ContractDeployTransaction>;
    deploy(overrides?: NonPayableOverrides & {
        from?: string;
    }): Promise<SampleFacet & {
        deploymentTransaction(): ContractTransactionResponse;
    }>;
    connect(runner: ContractRunner | null): SampleFacet__factory;
    static readonly bytecode = "0x608080604052346013576096908160188239f35b5f80fdfe60808060405260043610156011575f80fd5b5f3560e01c908163209652551460495750635524107714602f575f80fd5b3460455760203660031901126045576004355f55005b5f80fd5b346045575f3660031901126045576020905f548152f3fea2646970667358221220df2c67821d9800ca21760f6312b163191bebc89abde756e3ec4438746341a3ca64736f6c634300081e0033";
    static readonly abi: readonly [{
        readonly inputs: readonly [];
        readonly name: "getValue";
        readonly outputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "v";
            readonly type: "uint256";
        }];
        readonly name: "setValue";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }];
    static createInterface(): SampleFacetInterface;
    static connect(address: string, runner?: ContractRunner | null): SampleFacet;
}
export {};
