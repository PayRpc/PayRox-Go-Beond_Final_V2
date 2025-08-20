import { ethers } from 'hardhat';

// Crash prevention utilities
export class CrashGuard {
  static safeProcessExit(code: number = 0): never {
    console.log(`[CrashGuard] Attempting clean exit with code ${code}`);

    // Give time for async operations to complete
    setTimeout(() => {
      process.exit(code);
    }, 100);

    throw new Error(`Process exit requested with code ${code}`);
  }

  static wrapWithErrorHandling<T extends (..._args: any[]) => any>(fn: T, context: string): T {
    return ((..._args: any[]) => {
      try {
        const result = fn(..._args);

        // Handle promises
        if (result && typeof result.catch === 'function') {
          return result.catch((error: Error) => {
            console.error(`[CrashGuard] Error in ${context}:`, error.message);
            console.error(`[CrashGuard] Stack:`, error.stack);
            throw error;
          });
        }

        return result;
      } catch (error) {
        console.error(`[CrashGuard] Synchronous error in ${context}:`, error);
        throw error;
      }
    }) as T;
  }

  static async safeContractCall<T>(
    contractCall: () => Promise<T>,
    fallback?: T,
    context: string = 'contract call',
  ): Promise<T> {
    try {
      return await contractCall();
    } catch (error) {
      console.error(`[CrashGuard] Contract call failed in ${context}:`, error);

      if (fallback !== undefined) {
        console.log(`[CrashGuard] Using fallback value for ${context}`);
        return fallback;
      }

      throw error;
    }
  }

  static safePropertyAccess<T>(obj: any, path: string, fallback?: T): T | undefined {
    try {
      const keys = path.split('.');
      let current = obj;

      for (const key of keys) {
        if (current === null || current === undefined) {
          return fallback;
        }
        current = current[key];
      }

      return current;
    } catch (error) {
      console.error(`[CrashGuard] Property access failed for path "${path}":`, error);
      return fallback;
    }
  }
}

// Ethers.js v6 compatibility layer
export class EthersV6Helper {
  static async getAddress(contract: any): Promise<string> {
    try {
      // Try v6 method first
      if (typeof contract.getAddress === 'function') {
        return await contract.getAddress();
      }

      // Fall back to v5 property
      if (contract.address) {
        return contract.address;
      }

      throw new Error('Cannot get contract address');
    } catch (error) {
      console.error('[EthersV6Helper] getAddress failed:', error);
      throw error;
    }
  }

  static async waitForDeployment(contract: any): Promise<void> {
    try {
      // Try v6 method first
      if (typeof contract.waitForDeployment === 'function') {
        await contract.waitForDeployment();
        return;
      }

      // Fall back to v5 method
      if (typeof contract.deployed === 'function') {
        await contract.waitForDeployment();
        return;
      }

      console.warn('[EthersV6Helper] No deployment waiting method found');
    } catch (error) {
      console.error('[EthersV6Helper] waitForDeployment failed:', error);
      throw error;
    }
  }

  static getZeroAddress(): string {
    // Ethers v6 approach
    return ethers.ZeroAddress;
  }

  static keccak256(data: string): string {
    // Ethers v6 approach
    return ethers.keccak256(data);
  }

  static toUtf8Bytes(str: string): Uint8Array {
    // Ethers v6 approach
    return ethers.toUtf8Bytes(str);
  }
}
