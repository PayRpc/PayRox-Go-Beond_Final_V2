import { ContractFactory, ContractTransactionResponse } from "ethers";
import type { Signer, ContractDeployTransaction, ContractRunner } from "ethers";
import type { NonPayableOverrides } from "../../../common";
import type { OrderedMerkle, OrderedMerkleInterface } from "../../../contracts/utils/OrderedMerkle";
type OrderedMerkleConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;
export declare class OrderedMerkle__factory extends ContractFactory {
    constructor(...args: OrderedMerkleConstructorParams);
    getDeployTransaction(overrides?: NonPayableOverrides & {
        from?: string;
    }): Promise<ContractDeployTransaction>;
    deploy(overrides?: NonPayableOverrides & {
        from?: string;
    }): Promise<OrderedMerkle & {
        deploymentTransaction(): ContractTransactionResponse;
    }>;
    connect(runner: ContractRunner | null): OrderedMerkle__factory;
    static readonly bytecode = "0x6080806040523460175760399081601c823930815050f35b5f80fdfe5f80fdfea26469706673582212205af473515e6483ba6aa740f6fcfa568b15a638f6a13c6eb2e06823fd9129837764736f6c634300081e0033";
    static readonly abi: readonly [{
        readonly inputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "required";
            readonly type: "uint256";
        }, {
            readonly internalType: "uint256";
            readonly name: "available";
            readonly type: "uint256";
        }];
        readonly name: "InsufficientGas";
        readonly type: "error";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "proofLength";
            readonly type: "uint256";
        }, {
            readonly internalType: "uint256";
            readonly name: "positionLength";
            readonly type: "uint256";
        }];
        readonly name: "ProofLengthMismatch";
        readonly type: "error";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "length";
            readonly type: "uint256";
        }, {
            readonly internalType: "uint256";
            readonly name: "maxLength";
            readonly type: "uint256";
        }];
        readonly name: "ProofTooLong";
        readonly type: "error";
    }];
    static createInterface(): OrderedMerkleInterface;
    static connect(address: string, runner?: ContractRunner | null): OrderedMerkle;
}
export {};
