// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IChunkFactory} from "../interfaces/IChunkFactory.sol";

/**
 * @notice Dedicated loupe facet that exposes the ChunkFactory facet selectors.
 * This moves loupe-specific functions out of implementation facets so the
 * refactor linter and EIP-2535 expectations are met.
 */
contract LoupeFacet {
    function getFacetFunctionSelectors() external pure returns (bytes4[] memory selectors) {
        selectors = new bytes4[](34);
        uint256 i;
        // IChunkFactory interface functions
        selectors[i++] = IChunkFactory.stage.selector;
        selectors[i++] = IChunkFactory.stageMany.selector;
        selectors[i++] = IChunkFactory.stageBatch.selector;
        selectors[i++] = IChunkFactory.deployDeterministic.selector;
        selectors[i++] = IChunkFactory.deployDeterministicBatch.selector;
        selectors[i++] = IChunkFactory.predict.selector;
        selectors[i++] = IChunkFactory.predictAddress.selector;
        selectors[i++] = IChunkFactory.predictAddressBatch.selector;
        selectors[i++] = IChunkFactory.read.selector;
        selectors[i++] = IChunkFactory.exists.selector;
        selectors[i++] = IChunkFactory.isDeployedContract.selector;
        selectors[i++] = IChunkFactory.validateBytecodeSize.selector;
        selectors[i++] = IChunkFactory.verifySystemIntegrity.selector;
        selectors[i++] = IChunkFactory.deploymentCount.selector;
        selectors[i++] = IChunkFactory.userTiers.selector;
        selectors[i++] = IChunkFactory.owner.selector;
        selectors[i++] = IChunkFactory.withdrawFees.selector;
        selectors[i++] = IChunkFactory.withdrawRefund.selector;
        selectors[i++] = IChunkFactory.pause.selector;
        selectors[i++] = IChunkFactory.unpause.selector;
        selectors[i++] = IChunkFactory.setTierFee.selector;
        selectors[i++] = IChunkFactory.setUserTier.selector;
        selectors[i++] = IChunkFactory.setIdempotentMode.selector;
        selectors[i++] = IChunkFactory.setFeeRecipient.selector;
        selectors[i++] = IChunkFactory.setBaseFeeWei.selector;
        selectors[i++] = IChunkFactory.setFeesEnabled.selector;
        selectors[i++] = IChunkFactory.setMaxSingleTransfer.selector;
        selectors[i++] = IChunkFactory.transferDefaultAdmin.selector;
        selectors[i++] = IChunkFactory.addAuthorizedRecipient.selector;
        selectors[i++] = IChunkFactory.removeAuthorizedRecipient.selector;

        // PayRox helpers from this facet
        selectors[i++] = bytes4(keccak256("getExpectedManifestHash()"));
        selectors[i++] = bytes4(keccak256("getExpectedFactoryBytecodeHash()"));
        selectors[i++] = bytes4(keccak256("getManifestDispatcher()"));
        selectors[i++] = bytes4(keccak256("getFactoryAddress()"));

        require(i == selectors.length, "selector count mismatch");
        return selectors;
    }
}
