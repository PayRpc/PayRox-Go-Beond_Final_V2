import { ContractFactory, ContractTransactionResponse } from "ethers";
import type { Signer, ContractDeployTransaction, ContractRunner } from "ethers";
import type { NonPayableOverrides } from "../../../common";
import type { ChunkFactoryLib, ChunkFactoryLibInterface } from "../../../contracts/utils/ChunkFactoryLib";
type ChunkFactoryLibConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;
export declare class ChunkFactoryLib__factory extends ContractFactory {
    constructor(...args: ChunkFactoryLibConstructorParams);
    getDeployTransaction(overrides?: NonPayableOverrides & {
        from?: string;
    }): Promise<ContractDeployTransaction>;
    deploy(overrides?: NonPayableOverrides & {
        from?: string;
    }): Promise<ChunkFactoryLib & {
        deploymentTransaction(): ContractTransactionResponse;
    }>;
    connect(runner: ContractRunner | null): ChunkFactoryLib__factory;
    static readonly bytecode = "0x6080806040523460175760399081601c823930815050f35b5f80fdfe5f80fdfea2646970667358221220487ae54031017093a943d821d852bdb01eee58c47f13759d87ebeea708e0cb1a64736f6c634300081e0033";
    static readonly abi: readonly [{
        readonly inputs: readonly [];
        readonly name: "ChunkTooLarge";
        readonly type: "error";
    }, {
        readonly inputs: readonly [];
        readonly name: "DeploymentFailed";
        readonly type: "error";
    }, {
        readonly inputs: readonly [];
        readonly name: "InvalidBytecode";
        readonly type: "error";
    }, {
        readonly inputs: readonly [];
        readonly name: "SystemIntegrityFailed";
        readonly type: "error";
    }];
    static createInterface(): ChunkFactoryLibInterface;
    static connect(address: string, runner?: ContractRunner | null): ChunkFactoryLib;
}
export {};
