import { type ContractRunner } from "ethers";
import type { IAntiBot, IAntiBotInterface } from "../../../contracts/interfaces/IAntiBot";
export declare class IAntiBot__factory {
    static readonly abi: readonly [{
        readonly inputs: readonly [];
        readonly name: "checkPriceImpact";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "account";
            readonly type: "address";
        }, {
            readonly internalType: "bytes32";
            readonly name: "salt";
            readonly type: "bytes32";
        }];
        readonly name: "commitWhitelistAdd";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "hashedData";
            readonly type: "bytes32";
        }];
        readonly name: "createCommit";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "int256";
            readonly name: "price";
            readonly type: "int256";
        }];
        readonly name: "emergencyPriceOverride";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes";
            readonly name: "data";
            readonly type: "bytes";
        }, {
            readonly internalType: "bytes32";
            readonly name: "salt";
            readonly type: "bytes32";
        }];
        readonly name: "executeCommit";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "voteToActivateFailsafeMode";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "voteToDeactivateFailsafeMode";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }];
    static createInterface(): IAntiBotInterface;
    static connect(address: string, runner?: ContractRunner | null): IAntiBot;
}
