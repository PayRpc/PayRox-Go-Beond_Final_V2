import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-ethers';
import '@nomicfoundation/hardhat-chai-matchers';
import './tasks/prx.chunk';
declare const config: HardhatUserConfig;
export default config;
