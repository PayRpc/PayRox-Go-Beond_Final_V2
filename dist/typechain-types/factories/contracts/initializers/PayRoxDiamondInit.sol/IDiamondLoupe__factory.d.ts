import { type ContractRunner } from "ethers";
import type { IDiamondLoupe, IDiamondLoupeInterface } from "../../../../contracts/initializers/PayRoxDiamondInit.sol/IDiamondLoupe";
export declare class IDiamondLoupe__factory {
    static readonly abi: readonly [{
        readonly inputs: readonly [{
            readonly internalType: "bytes4";
            readonly name: "selector";
            readonly type: "bytes4";
        }];
        readonly name: "facetAddress";
        readonly outputs: readonly [{
            readonly internalType: "address";
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "facetAddresses";
        readonly outputs: readonly [{
            readonly internalType: "address[]";
            readonly name: "";
            readonly type: "address[]";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "facet";
            readonly type: "address";
        }];
        readonly name: "facetFunctionSelectors";
        readonly outputs: readonly [{
            readonly internalType: "bytes4[]";
            readonly name: "";
            readonly type: "bytes4[]";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "facets";
        readonly outputs: readonly [{
            readonly internalType: "bytes";
            readonly name: "";
            readonly type: "bytes";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }];
    static createInterface(): IDiamondLoupeInterface;
    static connect(address: string, runner?: ContractRunner | null): IDiamondLoupe;
}
