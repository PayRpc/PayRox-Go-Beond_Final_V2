import { ContractFactory, ContractTransactionResponse } from 'ethers';
import type { Signer, ContractDeployTransaction, ContractRunner } from 'ethers';
import type { NonPayableOverrides } from '../../../../../common';
import type { ECDSA, ECDSAInterface } from '../../../../../@openzeppelin/contracts/utils/cryptography/ECDSA';
type ECDSAConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;
export declare class ECDSA__factory extends ContractFactory {
    constructor(...args: ECDSAConstructorParams);
    getDeployTransaction(overrides?: NonPayableOverrides & {
        from?: string;
    }): Promise<ContractDeployTransaction>;
    deploy(overrides?: NonPayableOverrides & {
        from?: string;
    }): Promise<ECDSA & {
        deploymentTransaction(): ContractTransactionResponse;
    }>;
    connect(runner: ContractRunner | null): ECDSA__factory;
    static readonly bytecode = "0x6080806040523460175760399081601c823930815050f35b5f80fdfe5f80fdfea26469706673582212201bee9e6719e961bc9807df64532e0c3ec5cb5b2cd2b9b4ff86e1aab534d4b4be64736f6c634300081e0033";
    static readonly abi: readonly [{
        readonly inputs: readonly [];
        readonly name: "ECDSAInvalidSignature";
        readonly type: "error";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "length";
            readonly type: "uint256";
        }];
        readonly name: "ECDSAInvalidSignatureLength";
        readonly type: "error";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "s";
            readonly type: "bytes32";
        }];
        readonly name: "ECDSAInvalidSignatureS";
        readonly type: "error";
    }];
    static createInterface(): ECDSAInterface;
    static connect(address: string, runner?: ContractRunner | null): ECDSA;
}
export {};
