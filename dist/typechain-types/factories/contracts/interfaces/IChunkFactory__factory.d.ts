import { type ContractRunner } from "ethers";
import type { IChunkFactory, IChunkFactoryInterface } from "../../../contracts/interfaces/IChunkFactory";
export declare class IChunkFactory__factory {
    static readonly abi: readonly [{
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "recipient";
            readonly type: "address";
        }];
        readonly name: "AuthorizedRecipientAdded";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "recipient";
            readonly type: "address";
        }];
        readonly name: "AuthorizedRecipientRemoved";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: false;
            readonly internalType: "uint256";
            readonly name: "newBaseFee";
            readonly type: "uint256";
        }];
        readonly name: "BaseFeeSet";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: false;
            readonly internalType: "address[]";
            readonly name: "deployed";
            readonly type: "address[]";
        }, {
            readonly indexed: false;
            readonly internalType: "bytes32[]";
            readonly name: "salts";
            readonly type: "bytes32[]";
        }, {
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "deployer";
            readonly type: "address";
        }, {
            readonly indexed: false;
            readonly internalType: "uint256";
            readonly name: "totalFee";
            readonly type: "uint256";
        }];
        readonly name: "BatchDeployed";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: false;
            readonly internalType: "uint256";
            readonly name: "chunkCount";
            readonly type: "uint256";
        }, {
            readonly indexed: false;
            readonly internalType: "uint256";
            readonly name: "gasUsed";
            readonly type: "uint256";
        }, {
            readonly indexed: false;
            readonly internalType: "bytes32";
            readonly name: "packedMetadata";
            readonly type: "bytes32";
        }, {
            readonly indexed: false;
            readonly internalType: "uint256";
            readonly name: "timestamp";
            readonly type: "uint256";
        }];
        readonly name: "BatchStaged";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "chunk";
            readonly type: "address";
        }, {
            readonly indexed: true;
            readonly internalType: "bytes32";
            readonly name: "hash";
            readonly type: "bytes32";
        }, {
            readonly indexed: false;
            readonly internalType: "bytes32";
            readonly name: "salt";
            readonly type: "bytes32";
        }, {
            readonly indexed: false;
            readonly internalType: "uint256";
            readonly name: "size";
            readonly type: "uint256";
        }];
        readonly name: "ChunkStaged";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "deployed";
            readonly type: "address";
        }, {
            readonly indexed: true;
            readonly internalType: "bytes32";
            readonly name: "salt";
            readonly type: "bytes32";
        }, {
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "deployer";
            readonly type: "address";
        }, {
            readonly indexed: false;
            readonly internalType: "uint256";
            readonly name: "fee";
            readonly type: "uint256";
        }];
        readonly name: "ContractDeployed";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "previousAdmin";
            readonly type: "address";
        }, {
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "newAdmin";
            readonly type: "address";
        }];
        readonly name: "DefaultAdminTransferred";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "recipient";
            readonly type: "address";
        }, {
            readonly indexed: false;
            readonly internalType: "uint256";
            readonly name: "amount";
            readonly type: "uint256";
        }];
        readonly name: "EmergencyWithdrawal";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "collector";
            readonly type: "address";
        }, {
            readonly indexed: false;
            readonly internalType: "uint256";
            readonly name: "amount";
            readonly type: "uint256";
        }];
        readonly name: "FeeCollectionFailed";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "newRecipient";
            readonly type: "address";
        }];
        readonly name: "FeeRecipientSet";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: false;
            readonly internalType: "bool";
            readonly name: "enabled";
            readonly type: "bool";
        }];
        readonly name: "FeesEnabledSet";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "recipient";
            readonly type: "address";
        }, {
            readonly indexed: false;
            readonly internalType: "uint256";
            readonly name: "amount";
            readonly type: "uint256";
        }];
        readonly name: "FeesWithdrawn";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: false;
            readonly internalType: "bool";
            readonly name: "enabled";
            readonly type: "bool";
        }];
        readonly name: "IdempotentModeSet";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "uint8";
            readonly name: "tier";
            readonly type: "uint8";
        }, {
            readonly indexed: false;
            readonly internalType: "uint256";
            readonly name: "fee";
            readonly type: "uint256";
        }];
        readonly name: "TierFeeSet";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "user";
            readonly type: "address";
        }, {
            readonly indexed: false;
            readonly internalType: "uint8";
            readonly name: "tier";
            readonly type: "uint8";
        }];
        readonly name: "UserTierSet";
        readonly type: "event";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "recipient";
            readonly type: "address";
        }];
        readonly name: "addAuthorizedRecipient";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "salt";
            readonly type: "bytes32";
        }, {
            readonly internalType: "bytes";
            readonly name: "bytecode";
            readonly type: "bytes";
        }, {
            readonly internalType: "bytes";
            readonly name: "constructorArgs";
            readonly type: "bytes";
        }];
        readonly name: "deployDeterministic";
        readonly outputs: readonly [{
            readonly internalType: "address";
            readonly name: "deployed";
            readonly type: "address";
        }];
        readonly stateMutability: "payable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes32[]";
            readonly name: "salts";
            readonly type: "bytes32[]";
        }, {
            readonly internalType: "bytes[]";
            readonly name: "bytecodes";
            readonly type: "bytes[]";
        }, {
            readonly internalType: "bytes[]";
            readonly name: "constructorArgs";
            readonly type: "bytes[]";
        }];
        readonly name: "deployDeterministicBatch";
        readonly outputs: readonly [{
            readonly internalType: "address[]";
            readonly name: "deployed";
            readonly type: "address[]";
        }];
        readonly stateMutability: "payable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "deploymentCount";
        readonly outputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "hash";
            readonly type: "bytes32";
        }];
        readonly name: "exists";
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
            readonly name: "target";
            readonly type: "address";
        }];
        readonly name: "isDeployedContract";
        readonly outputs: readonly [{
            readonly internalType: "bool";
            readonly name: "";
            readonly type: "bool";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
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
            readonly internalType: "bytes";
            readonly name: "data";
            readonly type: "bytes";
        }];
        readonly name: "predict";
        readonly outputs: readonly [{
            readonly internalType: "address";
            readonly name: "predicted";
            readonly type: "address";
        }, {
            readonly internalType: "bytes32";
            readonly name: "hash";
            readonly type: "bytes32";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "salt";
            readonly type: "bytes32";
        }, {
            readonly internalType: "bytes32";
            readonly name: "codeHash";
            readonly type: "bytes32";
        }];
        readonly name: "predictAddress";
        readonly outputs: readonly [{
            readonly internalType: "address";
            readonly name: "predicted";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes32[]";
            readonly name: "salts";
            readonly type: "bytes32[]";
        }, {
            readonly internalType: "bytes32[]";
            readonly name: "codeHashes";
            readonly type: "bytes32[]";
        }];
        readonly name: "predictAddressBatch";
        readonly outputs: readonly [{
            readonly internalType: "address[]";
            readonly name: "predicted";
            readonly type: "address[]";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "chunk";
            readonly type: "address";
        }];
        readonly name: "read";
        readonly outputs: readonly [{
            readonly internalType: "bytes";
            readonly name: "";
            readonly type: "bytes";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "recipient";
            readonly type: "address";
        }];
        readonly name: "removeAuthorizedRecipient";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "newBase";
            readonly type: "uint256";
        }];
        readonly name: "setBaseFeeWei";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "newRecipient";
            readonly type: "address";
        }];
        readonly name: "setFeeRecipient";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bool";
            readonly name: "enabled";
            readonly type: "bool";
        }];
        readonly name: "setFeesEnabled";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bool";
            readonly name: "enabled";
            readonly type: "bool";
        }];
        readonly name: "setIdempotentMode";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "newMax";
            readonly type: "uint256";
        }];
        readonly name: "setMaxSingleTransfer";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "uint8";
            readonly name: "tier";
            readonly type: "uint8";
        }, {
            readonly internalType: "uint256";
            readonly name: "fee";
            readonly type: "uint256";
        }];
        readonly name: "setTierFee";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "user";
            readonly type: "address";
        }, {
            readonly internalType: "uint8";
            readonly name: "tier";
            readonly type: "uint8";
        }];
        readonly name: "setUserTier";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes";
            readonly name: "data";
            readonly type: "bytes";
        }];
        readonly name: "stage";
        readonly outputs: readonly [{
            readonly internalType: "address";
            readonly name: "chunk";
            readonly type: "address";
        }, {
            readonly internalType: "bytes32";
            readonly name: "hash";
            readonly type: "bytes32";
        }];
        readonly stateMutability: "payable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes[]";
            readonly name: "blobs";
            readonly type: "bytes[]";
        }];
        readonly name: "stageBatch";
        readonly outputs: readonly [{
            readonly internalType: "address[]";
            readonly name: "chunks";
            readonly type: "address[]";
        }, {
            readonly internalType: "bytes32[]";
            readonly name: "hashes";
            readonly type: "bytes32[]";
        }];
        readonly stateMutability: "payable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes[]";
            readonly name: "dataArray";
            readonly type: "bytes[]";
        }];
        readonly name: "stageMany";
        readonly outputs: readonly [{
            readonly internalType: "address[]";
            readonly name: "chunks";
            readonly type: "address[]";
        }];
        readonly stateMutability: "payable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "newAdmin";
            readonly type: "address";
        }];
        readonly name: "transferDefaultAdmin";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "user";
            readonly type: "address";
        }];
        readonly name: "userTiers";
        readonly outputs: readonly [{
            readonly internalType: "uint8";
            readonly name: "";
            readonly type: "uint8";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes";
            readonly name: "bytecode";
            readonly type: "bytes";
        }];
        readonly name: "validateBytecodeSize";
        readonly outputs: readonly [{
            readonly internalType: "bool";
            readonly name: "valid";
            readonly type: "bool";
        }];
        readonly stateMutability: "pure";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "verifySystemIntegrity";
        readonly outputs: readonly [{
            readonly internalType: "bool";
            readonly name: "";
            readonly type: "bool";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "withdrawFees";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "withdrawRefund";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }];
    static createInterface(): IChunkFactoryInterface;
    static connect(address: string, runner?: ContractRunner | null): IChunkFactory;
}
