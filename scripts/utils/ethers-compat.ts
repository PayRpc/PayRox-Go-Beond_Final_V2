// SPDX-License-Identifier: MIT
import * as E from 'ethers';

/** v6-friendly replacements for legacy ethers.utils / ethers.constants usage */
export const utils = {
  keccak256: E.keccak256,
  toUtf8Bytes: E.toUtf8Bytes,
  getAddress: E.getAddress,
  parseUnits: E.parseUnits,
  formatEther: E.formatEther,
  concat: E.concat,
};

export const constants = {
  AddressZero: E.ZeroAddress,
  MaxUint256: E.MaxUint256,
};
