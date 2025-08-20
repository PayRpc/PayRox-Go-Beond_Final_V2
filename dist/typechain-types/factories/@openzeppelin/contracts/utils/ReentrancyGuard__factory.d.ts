import { type ContractRunner } from 'ethers';
import type { ReentrancyGuard, ReentrancyGuardInterface } from '../../../../@openzeppelin/contracts/utils/ReentrancyGuard';
export declare class ReentrancyGuard__factory {
    static readonly abi: readonly [{
        readonly inputs: readonly [];
        readonly name: "ReentrancyGuardReentrantCall";
        readonly type: "error";
    }];
    static createInterface(): ReentrancyGuardInterface;
    static connect(address: string, runner?: ContractRunner | null): ReentrancyGuard;
}
