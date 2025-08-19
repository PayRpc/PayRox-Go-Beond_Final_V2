// SPDX-License-Identifier: MIT
// scripts/deploy/setup-dispatcher-roles.ts
// SPDX-License-Identifier: MIT
import { ethers } from 'hardhat';
import type { Contract } from 'ethers';
import { utils } from '../utils/ethers-compat';

type Address = string;

const ROLE = {
    COMMIT: utils.keccak256(utils.toUtf8Bytes('COMMIT_ROLE')),
    APPLY: utils.keccak256(utils.toUtf8Bytes('APPLY_ROLE')),
    EMERGENCY: utils.keccak256(utils.toUtf8Bytes('EMERGENCY_ROLE')),
};

async function main() {
    const [ops] = await ethers.getSigners();

    const dispatcherAddr = process.env.DISPATCHER as Address;
    const orchestratorAddr = process.env.ORCHESTRATOR as Address;

    if (!dispatcherAddr || !orchestratorAddr) {
        throw new Error('Set DISPATCHER and ORCHESTRATOR env vars');
    }

    // If your AccessControl lives on the dispatcher, use its interface here.
        const access: any = await ethers.getContractAt('IAccessControl', dispatcherAddr, ops);

    console.log('🔐 Granting roles on dispatcher:', dispatcherAddr);
    await (await access.grantRole(ROLE.COMMIT, orchestratorAddr)).wait();
    await (await access.grantRole(ROLE.APPLY, orchestratorAddr)).wait();
    await (await access.grantRole(ROLE.EMERGENCY, orchestratorAddr)).wait();

    console.log('✅ Roles granted to', orchestratorAddr);
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((e) => {
            console.error(e);
            process.exit(1);
        });
}
