import { ContractFactory, ContractTransactionResponse } from "ethers";
import type { Signer, ContractDeployTransaction, ContractRunner } from "ethers";
import type { NonPayableOverrides } from "../../../common";
import type { SaltViewFacet, SaltViewFacetInterface } from "../../../contracts/facets/SaltViewFacet";
type SaltViewFacetConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;
export declare class SaltViewFacet__factory extends ContractFactory {
    constructor(...args: SaltViewFacetConstructorParams);
    getDeployTransaction(overrides?: NonPayableOverrides & {
        from?: string;
    }): Promise<ContractDeployTransaction>;
    deploy(overrides?: NonPayableOverrides & {
        from?: string;
    }): Promise<SaltViewFacet & {
        deploymentTransaction(): ContractTransactionResponse;
    }>;
    connect(runner: ContractRunner | null): SaltViewFacet__factory;
    static readonly bytecode = "0x608080604052346015576103a9908161001a8239f35b5f80fdfe6080806040526004361015610012575f80fd5b5f3560e01c908163279e8f3e14610287575080633bef06b4146102105780636a9f1e16146101195780638e6a2c1d146100ce5763eb117be814610053575f80fd5b346100ca5760603660031901126100ca57602061006e6102e1565b604051908282019060ff60f81b82526bffffffffffffffffffffffff199060601b16602183015260243560358301526044356055830152605582526100b46075836102f7565b905190206040516001600160a01b039091168152f35b5f80fd5b346100ca5760203660031901126100ca5760043567ffffffffffffffff81116100ca5761010b61010460209236906004016102b3565b369161032d565b818151910120604051908152f35b346100ca5760803660031901126100ca576101326102e1565b60243567ffffffffffffffff81116100ca576101529036906004016102b3565b919060643567ffffffffffffffff81116100ca57602080949260448261019981966101916101876102059836906004016102b3565b969092369161032d565b94369161032d565b604051968794818601996f2830bca937bc21b937b9b9a1b430b4b760811b8b526bffffffffffffffffffffffff199060601b1660308701528051918291018587015e840190833584830152805192839101606483015e01015f838201520301601f1981018352826102f7565b519020604051908152f35b346100ca5760203660031901126100ca5760043567ffffffffffffffff81116100ca5761024661010460209236906004016102b3565b604051610205602d8285808201956c506179526f78466163746f727960981b87528051918291018484015e81015f838201520301601f1981018352826102f7565b346100ca575f3660031901126100ca5780734e59b44847b379578588920ca78fbf26c0b4956c60209252f35b9181601f840112156100ca5782359167ffffffffffffffff83116100ca57602083818601950101116100ca57565b600435906001600160a01b03821682036100ca57565b90601f8019910116810190811067ffffffffffffffff82111761031957604052565b634e487b7160e01b5f52604160045260245ffd5b92919267ffffffffffffffff82116103195760405191610357601f8201601f1916602001846102f7565b8294818452818301116100ca578281602093845f96013701015256fea26469706673582212204f1c92f2339f2ab692b8a313bb64dce6853db0eeaadfb59301ef32c5d442424564736f6c634300081e0033";
    static readonly abi: readonly [{
        readonly inputs: readonly [];
        readonly name: "eip2470";
        readonly outputs: readonly [{
            readonly internalType: "address";
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "pure";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "string";
            readonly name: "version";
            readonly type: "string";
        }];
        readonly name: "factorySalt";
        readonly outputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "";
            readonly type: "bytes32";
        }];
        readonly stateMutability: "pure";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes";
            readonly name: "initCode";
            readonly type: "bytes";
        }];
        readonly name: "hashInitCode";
        readonly outputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "";
            readonly type: "bytes32";
        }];
        readonly stateMutability: "pure";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "deployer";
            readonly type: "address";
        }, {
            readonly internalType: "bytes32";
            readonly name: "salt";
            readonly type: "bytes32";
        }, {
            readonly internalType: "bytes32";
            readonly name: "initCodeHash";
            readonly type: "bytes32";
        }];
        readonly name: "predictCreate2";
        readonly outputs: readonly [{
            readonly internalType: "address";
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "pure";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "deployer";
            readonly type: "address";
        }, {
            readonly internalType: "string";
            readonly name: "content";
            readonly type: "string";
        }, {
            readonly internalType: "uint256";
            readonly name: "crossNonce";
            readonly type: "uint256";
        }, {
            readonly internalType: "string";
            readonly name: "version";
            readonly type: "string";
        }];
        readonly name: "universalSalt";
        readonly outputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "";
            readonly type: "bytes32";
        }];
        readonly stateMutability: "pure";
        readonly type: "function";
    }];
    static createInterface(): SaltViewFacetInterface;
    static connect(address: string, runner?: ContractRunner | null): SaltViewFacet;
}
export {};
