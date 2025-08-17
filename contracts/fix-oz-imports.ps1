if (Test-Path "node_modules\@openzeppelin\contracts-upgradeable\access\AccessControlUpgradeable.sol") {
    Write-Host "OpenZeppelin contracts found."
} else {
    Write-Host "OpenZeppelin contracts NOT found!"
    exit 1
}