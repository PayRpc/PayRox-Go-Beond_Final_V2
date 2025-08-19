import { type ContractRunner } from "ethers";
import type { IPausable, IPausableInterface } from "../../../../contracts/initializers/PayRoxDiamondInit.sol/IPausable";
export declare class IPausable__factory {
    static readonly abi: readonly [{
        readonly inputs: readonly [];
        readonly name: "paused";
        readonly outputs: readonly [{
            readonly internalType: "bool";
            readonly name: "";
            readonly type: "bool";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }];
    static createInterface(): IPausableInterface;
    static connect(address: string, runner?: ContractRunner | null): IPausable;
}
