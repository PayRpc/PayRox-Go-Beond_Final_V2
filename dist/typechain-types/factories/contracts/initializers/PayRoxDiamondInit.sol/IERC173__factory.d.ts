import { type ContractRunner } from "ethers";
import type { IERC173, IERC173Interface } from "../../../../contracts/initializers/PayRoxDiamondInit.sol/IERC173";
export declare class IERC173__factory {
    static readonly abi: readonly [{
        readonly inputs: readonly [];
        readonly name: "owner";
        readonly outputs: readonly [{
            readonly internalType: "address";
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "newOwner";
            readonly type: "address";
        }];
        readonly name: "transferOwnership";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }];
    static createInterface(): IERC173Interface;
    static connect(address: string, runner?: ContractRunner | null): IERC173;
}
