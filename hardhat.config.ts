import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-ethers';
import '@nomicfoundation/hardhat-chai-matchers';

// Import tasks
import './tasks/prx.chunk';

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.8.30',
        settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: 'cancun', viaIR: true },
      },
    ],
  },
  paths: {
    sources: './contracts',
    tests: './tests',
    cache: './cache',
    artifacts: './artifacts',
  },
  networks: {
    localhost: { url: 'http://127.0.0.1:8545' },
  },
};
export default config;
