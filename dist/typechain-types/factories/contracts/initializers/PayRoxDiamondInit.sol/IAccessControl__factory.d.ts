import { type ContractRunner } from "ethers";
import type { IAccessControl, IAccessControlInterface } from "../../../../contracts/initializers/PayRoxDiamondInit.sol/IAccessControl";
export declare class IAccessControl__factory {
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
        readonly name: "hasRole";
        readonly outputs: readonly [{
            readonly internalType: "bool";
            readonly name: "";
            readonly type: "bool";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }];
    static createInterface(): IAccessControlInterface;
    static connect(address: string, runner?: ContractRunner | null): IAccessControl;
}
