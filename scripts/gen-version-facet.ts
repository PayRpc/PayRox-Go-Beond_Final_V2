// SPDX-License-Identifier: MIT
import fs from 'fs';
import path from 'path';

const pkgPath = path.join(process.cwd(), 'package.json');
if (!fs.existsSync(pkgPath)) {
  console.error('package.json not found');
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const version = (process.env.PRX_VERSION || pkg.version || '0.0.0').trim();
const commit = (process.env.GITHUB_SHA || '').slice(0, 8);

const content = `// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @title VersionFacet (auto-generated)
/// @notice Canary-friendly facet exposing version metadata. ERC-165 handled centrally.
contract VersionFacet {
    /// @dev Semantic version, injected from package.json or CI env (PRX_VERSION)
    function version() external pure returns (string memory) {
        return "${version}";
    }

    /// @dev Numeric version for cheap comparisons (major.minor.patch → M*1e6+N*1e3+P)
    function versionNumber() external pure returns (uint256) {
        bytes memory v = bytes("${version}");
        uint256 major; uint256 minor; uint256 patch;
        uint256 i; uint256 num;
        while (i < v.length && v[i] != 0x2e) { // '.'
            major = major * 10 + (uint8(v[i]) - 48); unchecked { ++i; }
        }
        if (i < v.length) { unchecked { ++i; } } // skip '.'
        while (i < v.length && v[i] != 0x2e) {
            minor = minor * 10 + (uint8(v[i]) - 48); unchecked { ++i; }
        }
        if (i < v.length) { unchecked { ++i; } } // skip '.'
        while (i < v.length && v[i] >= 48 && v[i] <= 57) {
            patch = patch * 10 + (uint8(v[i]) - 48); unchecked { ++i; }
        }
        return major * 1_000_000 + minor * 1_000 + patch;
    }

    /// @dev Optional: short commit (empty if not set in CI)
    function commit() external pure returns (string memory) {
        return "${commit}";
    }
}
`;

const outDir = path.join(process.cwd(), 'contracts', 'facets');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'VersionFacet.sol');
fs.writeFileSync(outFile, content);
console.log(`✅ Wrote ${outFile}`);
