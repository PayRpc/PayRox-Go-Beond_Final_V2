import { ContractFactory, ContractTransactionResponse } from "ethers";
import type { Signer, ContractDeployTransaction, ContractRunner } from "ethers";
import type { NonPayableOverrides } from "../../../../common";
import type { ERC165Facet, ERC165FacetInterface } from "../../../../contracts/facets/ERC165Facet.sol/ERC165Facet";
type ERC165FacetConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;
export declare class ERC165Facet__factory extends ContractFactory {
    constructor(...args: ERC165FacetConstructorParams);
    getDeployTransaction(overrides?: NonPayableOverrides & {
        from?: string;
    }): Promise<ContractDeployTransaction>;
    deploy(overrides?: NonPayableOverrides & {
        from?: string;
    }): Promise<ERC165Facet & {
        deploymentTransaction(): ContractTransactionResponse;
    }>;
    connect(runner: ContractRunner | null): ERC165Facet__factory;
    static readonly bytecode = "0x6080806040523460135760df908160188239f35b5f80fdfe608060405260043610156010575f80fd5b5f3560e01c6301ffc9a7146022575f80fd5b3460575760203660031901126057576004356001600160e01b031981168103605757604d602091605b565b6040519015158152f35b5f80fd5b6001600160e01b0319166301ffc9a760e01b811460a3575f527f591be81f15f35d8de1478a0d6658a8a057a6ddfe787f14b90117e5734820554260205260ff60405f20541690565b5060019056fea2646970667358221220ce8b8b8e7b6561e7398b8dbeb5594ec431fdb92c50166f6637be8a828ab4224664736f6c634300081e0033";
    static readonly abi: readonly [{
        readonly inputs: readonly [{
            readonly internalType: "bytes4";
            readonly name: "interfaceId";
            readonly type: "bytes4";
        }];
        readonly name: "supportsInterface";
        readonly outputs: readonly [{
            readonly internalType: "bool";
            readonly name: "";
            readonly type: "bool";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }];
    static createInterface(): ERC165FacetInterface;
    static connect(address: string, runner?: ContractRunner | null): ERC165Facet;
}
export {};
