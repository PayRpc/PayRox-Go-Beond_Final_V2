// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * @title GasOptimizationUtils
 * @notice Utilities for gas-efficient operations across facets
 * @dev Provides batching and optimization patterns
 */
library GasOptimizationUtils {
    
    /**
     * @notice Batch multiple low-level calls with gas optimization
     * @param targets Array of target addresses
     * @param data Array of calldata
     * @return results Array of return data
     */
    function batchCall(address[] calldata targets, bytes[] calldata data) 
        external 
        returns (bytes[] memory results) 
    {
        require(targets.length == data.length, "GasOptimizer: length mismatch");
        require(targets.length <= 50, "GasOptimizer: batch too large");
        
        results = new bytes[](targets.length);
        
        for (uint256 i = 0; i < targets.length; i++) {
            (bool success, bytes memory result) = targets[i].call(data[i]);
            require(success, "GasOptimizer: call failed");
            results[i] = result;
        }
    }
    
    /**
     * @notice Optimized storage packing for multiple uint256 values
     * @param values Array of values to pack (max 4 values)
     * @return packed Packed storage value
     */
    function packStorage(uint64[] calldata values) external pure returns (bytes32 packed) {
        require(values.length <= 4, "GasOptimizer: too many values");
        
        assembly {
            let offset := 0
            for { let i := 0 } lt(i, values.length) { i := add(i, 1) } {
                let value := calldataload(add(values.offset, mul(i, 0x20)))
                packed := or(packed, shl(offset, value))
                offset := add(offset, 64)
            }
        }
    }
}