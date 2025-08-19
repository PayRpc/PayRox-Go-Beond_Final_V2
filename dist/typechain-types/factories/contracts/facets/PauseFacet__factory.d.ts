import { ContractFactory, ContractTransactionResponse } from "ethers";
import type { Signer, ContractDeployTransaction, ContractRunner } from "ethers";
import type { NonPayableOverrides } from "../../../common";
import type { PauseFacet, PauseFacetInterface } from "../../../contracts/facets/PauseFacet";
type PauseFacetConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;
export declare class PauseFacet__factory extends ContractFactory {
    constructor(...args: PauseFacetConstructorParams);
    getDeployTransaction(overrides?: NonPayableOverrides & {
        from?: string;
    }): Promise<ContractDeployTransaction>;
    deploy(overrides?: NonPayableOverrides & {
        from?: string;
    }): Promise<PauseFacet & {
        deploymentTransaction(): ContractTransactionResponse;
    }>;
    connect(runner: ContractRunner | null): PauseFacet__factory;
    static readonly bytecode = "0x60808060405234601557610230908161001a8239f35b5f80fdfe60806040526004361015610011575f80fd5b5f3560e01c80633f4ba83a1461012e5780635c975abb1461010057638456cb591461003a575f80fd5b346100fc575f3660031901126100fc57335f9081527ff72802865ab3e50a373d64e6c56f6982132f873f4500941f6a9b0373bcaadb5d602052604090205460ff16156100e9575f5160206101db5f395f51905f525460ff81166100da5760019060ff1916175f5160206101db5f395f51905f52557f62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a2586020604051338152a1005b631785c68160e01b5f5260045ffd5b6310351a3760e11b5f523360045260245ffd5b5f80fd5b346100fc575f3660031901126100fc57602060ff5f5160206101db5f395f51905f5254166040519015158152f35b346100fc575f3660031901126100fc57335f9081527ff72802865ab3e50a373d64e6c56f6982132f873f4500941f6a9b0373bcaadb5d602052604090205460ff16156100e9575f5160206101db5f395f51905f525460ff8116156101cb5760ff19165f5160206101db5f395f51905f52557f5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa6020604051338152a1005b636cd6020160e01b5f5260045ffdfe9b02e42a9b92e93607133334d133e31dc3f904c7156cf846526371c09ab4c5b2a2646970667358221220afa0f133f655553aa809d6c60dbcea18c49ac17e23cc109991583d07aa3b381464736f6c634300081e0033";
    static readonly abi: readonly [{
        readonly inputs: readonly [];
        readonly name: "AlreadyPaused";
        readonly type: "error";
    }, {
        readonly inputs: readonly [];
        readonly name: "NotPaused";
        readonly type: "error";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "caller";
            readonly type: "address";
        }];
        readonly name: "NotPauser";
        readonly type: "error";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: false;
            readonly internalType: "address";
            readonly name: "account";
            readonly type: "address";
        }];
        readonly name: "Paused";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: false;
            readonly internalType: "address";
            readonly name: "account";
            readonly type: "address";
        }];
        readonly name: "Unpaused";
        readonly type: "event";
    }, {
        readonly inputs: readonly [];
        readonly name: "pause";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "paused";
        readonly outputs: readonly [{
            readonly internalType: "bool";
            readonly name: "";
            readonly type: "bool";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "unpause";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }];
    static createInterface(): PauseFacetInterface;
    static connect(address: string, runner?: ContractRunner | null): PauseFacet;
}
export {};
