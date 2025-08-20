import { ContractFactory, ContractTransactionResponse } from "ethers";
import type { Signer, ContractDeployTransaction, ContractRunner } from "ethers";
import type { NonPayableOverrides } from "../../../common";
import type { AccessControlFacet, AccessControlFacetInterface } from "../../../contracts/facets/AccessControlFacet";
type AccessControlFacetConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;
export declare class AccessControlFacet__factory extends ContractFactory {
    constructor(...args: AccessControlFacetConstructorParams);
    getDeployTransaction(overrides?: NonPayableOverrides & {
        from?: string;
    }): Promise<ContractDeployTransaction>;
    deploy(overrides?: NonPayableOverrides & {
        from?: string;
    }): Promise<AccessControlFacet & {
        deploymentTransaction(): ContractTransactionResponse;
    }>;
    connect(runner: ContractRunner | null): AccessControlFacet__factory;
    static readonly bytecode = "0x60808060405234601557610351908161001a8239f35b5f80fdfe6080806040526004361015610012575f80fd5b5f3560e01c908163248a9ca3146101f8575080632f2ff15d1461014457806391d14854146100fc5763d547741f14610048575f80fd5b346100f85761005636610248565b90610061338261026e565b805f525f5160206102fc5f395f51905f5260205260405f2060018060a01b0383165f5260205260ff60405f20541661009557005b5f8181525f5160206102fc5f395f51905f52602090815260408083206001600160a01b0395909516808452949091528120805460ff19169055339291907ff6391f5c32d9c69d2a47ea670b442974b53935d1edc7fd64eb21e047a839171b9080a4005b5f80fd5b346100f85761010a36610248565b905f525f5160206102fc5f395f51905f5260205260405f209060018060a01b03165f52602052602060ff60405f2054166040519015158152f35b346100f85761015236610248565b9061015d338261026e565b805f525f5160206102fc5f395f51905f5260205260405f2060018060a01b0383165f5260205260ff60405f2054161561019257005b5f8181525f5160206102fc5f395f51905f52602090815260408083206001600160a01b0395909516808452949091528120805460ff19166001179055339291907f2f8788117e7eff1d82e926ec794901d17c78024a50270940304540a733656f0d9080a4005b346100f85760203660031901126100f8576020906004355f527fcab4d17318aeaabb38cce9d7872ecfed2752c05570a4e2c3cf99e5dc5552eff0825260405f205480155f1461024457505f5b8152f35b60409060031901126100f857600435906024356001600160a01b03811681036100f85790565b805f527fcab4d17318aeaabb38cce9d7872ecfed2752c05570a4e2c3cf99e5dc5552eff060205260405f205480156102f4575b5f525f5160206102fc5f395f51905f5260205260405f2060018060a01b0383165f5260205260ff60405f205416156102d7575050565b63095acc8b60e31b5f5260045260018060a01b031660245260445ffd5b505f6102a156fecab4d17318aeaabb38cce9d7872ecfed2752c05570a4e2c3cf99e5dc5552efefa26469706673582212208c7b91fe3aadb4813d668ee16725c4a9e3d1faf0a82b7810a9d8af129f6a8e2364736f6c634300081e0033";
    static readonly abi: readonly [{
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "role";
            readonly type: "bytes32";
        }, {
            readonly internalType: "address";
            readonly name: "account";
            readonly type: "address";
        }];
        readonly name: "MissingRole";
        readonly type: "error";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "role";
            readonly type: "bytes32";
        }, {
            readonly internalType: "address";
            readonly name: "caller";
            readonly type: "address";
        }];
        readonly name: "NotRoleAdmin";
        readonly type: "error";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "bytes32";
            readonly name: "role";
            readonly type: "bytes32";
        }, {
            readonly indexed: true;
            readonly internalType: "bytes32";
            readonly name: "previousAdminRole";
            readonly type: "bytes32";
        }, {
            readonly indexed: true;
            readonly internalType: "bytes32";
            readonly name: "newAdminRole";
            readonly type: "bytes32";
        }];
        readonly name: "RoleAdminChanged";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "bytes32";
            readonly name: "role";
            readonly type: "bytes32";
        }, {
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "account";
            readonly type: "address";
        }, {
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "sender";
            readonly type: "address";
        }];
        readonly name: "RoleGranted";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "bytes32";
            readonly name: "role";
            readonly type: "bytes32";
        }, {
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "account";
            readonly type: "address";
        }, {
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "sender";
            readonly type: "address";
        }];
        readonly name: "RoleRevoked";
        readonly type: "event";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "role";
            readonly type: "bytes32";
        }];
        readonly name: "getRoleAdmin";
        readonly outputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "";
            readonly type: "bytes32";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "role";
            readonly type: "bytes32";
        }, {
            readonly internalType: "address";
            readonly name: "account";
            readonly type: "address";
        }];
        readonly name: "grantRole";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "role";
            readonly type: "bytes32";
        }, {
            readonly internalType: "address";
            readonly name: "account";
            readonly type: "address";
        }];
        readonly name: "hasRole";
        readonly outputs: readonly [{
            readonly internalType: "bool";
            readonly name: "";
            readonly type: "bool";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "role";
            readonly type: "bytes32";
        }, {
            readonly internalType: "address";
            readonly name: "account";
            readonly type: "address";
        }];
        readonly name: "revokeRole";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }];
    static createInterface(): AccessControlFacetInterface;
    static connect(address: string, runner?: ContractRunner | null): AccessControlFacet;
}
export {};
