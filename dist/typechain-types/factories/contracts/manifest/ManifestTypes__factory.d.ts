import { ContractFactory, ContractTransactionResponse } from "ethers";
import type { Signer, ContractDeployTransaction, ContractRunner } from "ethers";
import type { NonPayableOverrides } from "../../../common";
import type { ManifestTypes, ManifestTypesInterface } from "../../../contracts/manifest/ManifestTypes";
type ManifestTypesConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;
export declare class ManifestTypes__factory extends ContractFactory {
    constructor(...args: ManifestTypesConstructorParams);
    getDeployTransaction(overrides?: NonPayableOverrides & {
        from?: string;
    }): Promise<ContractDeployTransaction>;
    deploy(overrides?: NonPayableOverrides & {
        from?: string;
    }): Promise<ManifestTypes & {
        deploymentTransaction(): ContractTransactionResponse;
    }>;
    connect(runner: ContractRunner | null): ManifestTypes__factory;
    static readonly bytecode = "0x6080806040523460175760399081601c823930815050f35b5f80fdfe5f80fdfea264697066735822122078abaec3127008c3ffa77edb7f5bb11dba3d64091909fd9a663019bf3598205664736f6c634300081e0033";
    static readonly abi: readonly [{
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "proposalId";
            readonly type: "bytes32";
        }];
        readonly name: "ProposalNotFound";
        readonly type: "error";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "proposalId";
            readonly type: "bytes32";
        }, {
            readonly internalType: "uint256";
            readonly name: "forVotes";
            readonly type: "uint256";
        }, {
            readonly internalType: "uint256";
            readonly name: "quorumRequired";
            readonly type: "uint256";
        }];
        readonly name: "QuorumNotReached";
        readonly type: "error";
    }, {
        readonly inputs: readonly [];
        readonly name: "UnauthorizedDeployer";
        readonly type: "error";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "bytes32";
            readonly name: "manifestHash";
            readonly type: "bytes32";
        }, {
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "auditor";
            readonly type: "address";
        }, {
            readonly indexed: false;
            readonly internalType: "bool";
            readonly name: "passed";
            readonly type: "bool";
        }];
        readonly name: "AuditCompleted";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "bytes32";
            readonly name: "auditId";
            readonly type: "bytes32";
        }, {
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "auditor";
            readonly type: "address";
        }, {
            readonly indexed: false;
            readonly internalType: "bool";
            readonly name: "passed";
            readonly type: "bool";
        }];
        readonly name: "AuditRegistered";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "bytes32";
            readonly name: "id";
            readonly type: "bytes32";
        }, {
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "proposer";
            readonly type: "address";
        }, {
            readonly indexed: false;
            readonly internalType: "uint256";
            readonly name: "startBlock";
            readonly type: "uint256";
        }, {
            readonly indexed: false;
            readonly internalType: "uint256";
            readonly name: "endBlock";
            readonly type: "uint256";
        }, {
            readonly indexed: false;
            readonly internalType: "uint16";
            readonly name: "quorumBps";
            readonly type: "uint16";
        }];
        readonly name: "GovernanceProposalCreated";
        readonly type: "event";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "bytes32";
            readonly name: "proposalId";
            readonly type: "bytes32";
        }, {
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "voter";
            readonly type: "address";
        }, {
            readonly indexed: false;
            readonly internalType: "bool";
            readonly name: "support";
            readonly type: "bool";
        }, {
            readonly indexed: false;
            readonly internalType: "uint256";
            readonly name: "weight";
            readonly type: "uint256";
        }];
        readonly name: "GovernanceVoteCast";
        readonly type: "event";
    }];
    static createInterface(): ManifestTypesInterface;
    static connect(address: string, runner?: ContractRunner | null): ManifestTypes;
}
export {};
