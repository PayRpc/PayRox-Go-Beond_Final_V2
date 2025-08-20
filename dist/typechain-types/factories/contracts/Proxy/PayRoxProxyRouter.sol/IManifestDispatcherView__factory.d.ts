import { type ContractRunner } from "ethers";
import type { IManifestDispatcherView, IManifestDispatcherViewInterface } from "../../../../contracts/Proxy/PayRoxProxyRouter.sol/IManifestDispatcherView";
export declare class IManifestDispatcherView__factory {
    static readonly abi: readonly [{
        readonly inputs: readonly [];
        readonly name: "activeRoot";
        readonly outputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "";
            readonly type: "bytes32";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "frozen";
        readonly outputs: readonly [{
            readonly internalType: "bool";
            readonly name: "";
            readonly type: "bool";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes4";
            readonly name: "selector";
            readonly type: "bytes4";
        }];
        readonly name: "routes";
        readonly outputs: readonly [{
            readonly internalType: "address";
            readonly name: "facet";
            readonly type: "address";
        }, {
            readonly internalType: "bytes32";
            readonly name: "codehash";
            readonly type: "bytes32";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }];
    static createInterface(): IManifestDispatcherViewInterface;
    static connect(address: string, runner?: ContractRunner | null): IManifestDispatcherView;
}
