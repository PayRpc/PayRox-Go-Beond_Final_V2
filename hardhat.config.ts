import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-ethers';

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.8.30',
        settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: 'cancun', viaIR: true },
      },
      {
        version: '0.8.26',
        settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: 'cancun' },
      },
    ],
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
  networks: {
    localhost: { url: 'http://127.0.0.1:8545' },
  },
};
export default config;
