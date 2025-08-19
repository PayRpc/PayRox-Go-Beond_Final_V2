import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('SaltViewFacet', () => {
  it('matches ethers.getCreate2Address', async () => {
    const Fac = await ethers.getContractFactory('SaltViewFacet');
    const f = await Fac.deploy();
    await f.waitForDeployment();

    const deployer = '0x4e59b44847b379578588920cA78FbF26c0B4956C'; // EIP-2470
    const version = '1.0.0';
    const content = 'PayRoxUniversalContract';
    const nonce = 1000n;

    const factorySalt = await f.factorySalt(version);
    const universalSalt = await f.universalSalt(deployer, content, nonce, version);

    // Fake bytecode for test
    const factoryBytecode = '0x60006000fd';
    const targetBytecode = '0x60016000fd';

    const hFac = await f.hashInitCode(factoryBytecode);
    const hTgt = await f.hashInitCode(targetBytecode);

    const predictedFactory = await f.predictCreate2(deployer, factorySalt, hFac);
    const predictedFactoryRef = ethers.getCreate2Address(deployer, factorySalt, hFac);
    expect(predictedFactory).to.equal(predictedFactoryRef);

    const predictedTarget = await f.predictCreate2(predictedFactory, universalSalt, hTgt);
    const predictedTargetRef = ethers.getCreate2Address(predictedFactory, universalSalt, hTgt);
    expect(predictedTarget).to.equal(predictedTargetRef);
  });
});
