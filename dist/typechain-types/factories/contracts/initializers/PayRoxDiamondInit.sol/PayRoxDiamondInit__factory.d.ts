import { ContractFactory, ContractTransactionResponse } from "ethers";
import type { Signer, ContractDeployTransaction, ContractRunner } from "ethers";
import type { NonPayableOverrides } from "../../../../common";
import type { PayRoxDiamondInit, PayRoxDiamondInitInterface } from "../../../../contracts/initializers/PayRoxDiamondInit.sol/PayRoxDiamondInit";
type PayRoxDiamondInitConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;
export declare class PayRoxDiamondInit__factory extends ContractFactory {
    constructor(...args: PayRoxDiamondInitConstructorParams);
    getDeployTransaction(overrides?: NonPayableOverrides & {
        from?: string;
    }): Promise<ContractDeployTransaction>;
    deploy(overrides?: NonPayableOverrides & {
        from?: string;
    }): Promise<PayRoxDiamondInit & {
        deploymentTransaction(): ContractTransactionResponse;
    }>;
    connect(runner: ContractRunner | null): PayRoxDiamondInit__factory;
    static readonly bytecode = "0x608080604052346015576102a8908161001a8239f35b5f80fdfe6080600436101561000e575f80fd5b5f3560e01c634ddf47d414610021575f80fd5b346102465760203660031901126102465760043567ffffffffffffffff8111610246573660238201121561024657806004013567ffffffffffffffff811161024a57601f8101601f19908116603f0116830167ffffffffffffffff81118482101761024a576040528083526020830191366024838301011161024657815f926024602093018537840101526040828051810103126102465760406100c76100ce9261025e565b920161025e565b7f355362bf9755e3bf8870923fb5fc00a704038249754ea274074e63278a0f23b5805460ff1990811660019081179092557f1d4b5703411ecaf1b3cc8854204807ceb227204a7984e40a01224a0424234b1180548216831790557f3736d3d49a925b0d03873acb3cdfcf64de146786431fccd67e02096f0b77d09980548216831790557f83490de9dac34285594f595f02634b5d3ee258bc54e260b10c96a9e028c0664b80548216831790557fe7d0d04955bf733f63e8673b8c60f26ba857ca5d75e473ef47e90bc1615f706280548216831790556001600160a01b039384165f9081527f1a93b80846506ef135d1d062834caa1099b42cc3eab0b329c7dc3b52117b93616020908152604080832080548516861790559590941681527ff72802865ab3e50a373d64e6c56f6982132f873f4500941f6a9b0373bcaadb5d909352929091208054831690911790557f9b02e42a9b92e93607133334d133e31dc3f904c7156cf846526371c09ab4c5b280549091169055005b5f80fd5b634e487b7160e01b5f52604160045260245ffd5b51906001600160a01b03821682036102465756fea2646970667358221220f5c5d9f30abee26656e73bc2b636b901c402c83eccb598a52ec64a5022dcc02f64736f6c634300081e0033";
    static readonly abi: readonly [{
        readonly inputs: readonly [{
            readonly internalType: "bytes";
            readonly name: "data";
            readonly type: "bytes";
        }];
        readonly name: "init";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }];
    static createInterface(): PayRoxDiamondInitInterface;
    static connect(address: string, runner?: ContractRunner | null): PayRoxDiamondInit;
}
export {};
