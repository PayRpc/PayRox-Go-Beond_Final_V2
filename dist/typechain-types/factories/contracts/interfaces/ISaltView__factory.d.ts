import { type ContractRunner } from "ethers";
import type { ISaltView, ISaltViewInterface } from "../../../contracts/interfaces/ISaltView";
export declare class ISaltView__factory {
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
    static createInterface(): ISaltViewInterface;
    static connect(address: string, runner?: ContractRunner | null): ISaltView;
}
