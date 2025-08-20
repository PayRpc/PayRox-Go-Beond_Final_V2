import { type ContractRunner } from 'ethers';
import type { IAntiBotFacet, IAntiBotFacetInterface } from '../../../contracts/facets/IAntiBotFacet';
export declare class IAntiBotFacet__factory {
    static readonly abi: readonly [{
        readonly inputs: readonly [];
        readonly name: "BadThresholds";
        readonly type: "error";
    }, {
        readonly inputs: readonly [];
        readonly name: "CircuitBreakerActive";
        readonly type: "error";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "user";
            readonly type: "address";
        }, {
            readonly internalType: "uint256";
            readonly name: "untilBlock";
            readonly type: "uint256";
        }];
        readonly name: "TransactionThrottled";
        readonly type: "error";
    }, {
        readonly inputs: readonly [];
        readonly name: "GOVERNANCE_ROLE";
        readonly outputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "";
            readonly type: "bytes32";
        }];
        readonly stateMutability: "pure";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "MONITOR_ROLE";
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
            readonly name: "a";
            readonly type: "address";
        }];
        readonly name: "addTrusted";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "ensureBuybackAllowed";
        readonly outputs: readonly [{
            readonly internalType: "bool";
            readonly name: "ok";
            readonly type: "bool";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "a";
            readonly type: "address";
        }];
        readonly name: "isTrusted";
        readonly outputs: readonly [{
            readonly internalType: "bool";
            readonly name: "";
            readonly type: "bool";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "a";
            readonly type: "address";
        }];
        readonly name: "removeTrusted";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "int256";
            readonly name: "moveBps";
            readonly type: "int256";
        }];
        readonly name: "reportMarketMove";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "resetCircuitBreaker";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bool";
            readonly name: "paused";
            readonly type: "bool";
        }];
        readonly name: "setBuybackPaused";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bool";
            readonly name: "enabled";
            readonly type: "bool";
        }];
        readonly name: "setEnabled";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "pauseBps_";
            readonly type: "uint256";
        }, {
            readonly internalType: "uint256";
            readonly name: "circuitBps_";
            readonly type: "uint256";
        }];
        readonly name: "setThresholds";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "blocks_";
            readonly type: "uint256";
        }];
        readonly name: "setThrottleBlocks";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "sender";
            readonly type: "address";
        }];
        readonly name: "validateTransaction";
        readonly outputs: readonly [{
            readonly internalType: "bool";
            readonly name: "ok";
            readonly type: "bool";
        }];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }];
    static createInterface(): IAntiBotFacetInterface;
    static connect(address: string, runner?: ContractRunner | null): IAntiBotFacet;
}
