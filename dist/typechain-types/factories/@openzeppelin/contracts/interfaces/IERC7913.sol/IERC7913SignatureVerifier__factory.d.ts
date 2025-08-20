import { type ContractRunner } from 'ethers';
import type { IERC7913SignatureVerifier, IERC7913SignatureVerifierInterface } from '../../../../../@openzeppelin/contracts/interfaces/IERC7913.sol/IERC7913SignatureVerifier';
export declare class IERC7913SignatureVerifier__factory {
    static readonly abi: readonly [{
        readonly inputs: readonly [{
            readonly internalType: "bytes";
            readonly name: "key";
            readonly type: "bytes";
        }, {
            readonly internalType: "bytes32";
            readonly name: "hash";
            readonly type: "bytes32";
        }, {
            readonly internalType: "bytes";
            readonly name: "signature";
            readonly type: "bytes";
        }];
        readonly name: "verify";
        readonly outputs: readonly [{
            readonly internalType: "bytes4";
            readonly name: "";
            readonly type: "bytes4";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }];
    static createInterface(): IERC7913SignatureVerifierInterface;
    static connect(address: string, runner?: ContractRunner | null): IERC7913SignatureVerifier;
}
