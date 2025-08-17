# PayRox Deployment & CI Checklist

## Enhanced Facts Configuration

**Required before deployment:**
```bash
# 1. Start API and upgrade facts
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 2. Upgrade facts.json with PayRox defaults  
curl -X POST http://localhost:8000/arch/facts/upgrade

# 3. Verify no missing keys
curl http://localhost:8000/arch/facts
```

## Deployment Sequence

### 1. Deploy Dispatcher
```typescript
const Dispatcher = await ethers.getContractFactory("ManifestDispatcher");
const dispatcher = await Dispatcher.deploy(/* init params */);
const dispatcherCodehash = await ethers.provider.getCode(dispatcher.address).then(c => ethers.utils.keccak256(c));
```

### 2. Commit Initial Manifest  
```typescript
const manifestRoot = await dispatcher.commitRoot(initialManifestRoot, 1);
```

### 3. Deploy Factory with Both Hashes
```typescript
const Factory = await ethers.getContractFactory("DeterministicChunkFactory");
const factory = await Factory.deploy(
  feeRecipient,
  dispatcher.address,
  manifestRoot,              // ← manifest root
  dispatcherCodehash,        // ← dispatcher EXTCODEHASH  
  factoryBytecodeHash,       // ← factory EXTCODEHASH
  baseFeeWei,
  feesEnabled
);
```

### 4. Authorize Dispatcher on Factory
```typescript
await factory.grantRole(await factory.OPERATOR_ROLE(), dispatcher.address);
await factory.grantRole(await factory.FEE_ROLE(), dispatcher.address);
// Keep DEFAULT_ADMIN_ROLE with your Safe/EOA (do NOT give to dispatcher)
```

## CI Tests (Required)

### Integrity Checks
```bash
npm run test:integrity
```
- ✅ `factory.verifySystemIntegrity()` returns true
- ✅ Fails when dispatcher codehash changes  
- ✅ Fails when manifest root changes

### Role Authorization
```bash  
npm run test:roles
```
- ✅ Factory admin calls work through dispatcher after role grants
- ✅ Rejects calls from dispatcher without roles

### Loupe Compliance
```bash
npm run test:loupe  
```
- ✅ `facets()` lists your facets
- ✅ None of the facets claim loupe selectors
- ✅ ERC-165 returns true for interfaces they actually implement
- ✅ No selector collisions between facets

### Epoch Rules
```bash
npm run test:epoch
```
- ✅ `commitRoot(root, activeEpoch+1)` → `applyRoutes(...)` with valid proofs → wait `activationDelay` → `activateCommittedRoot()`
- ✅ Frozen = false, activeEpoch >= 0, pendingEpoch > activeEpoch

### Size Limits
```bash
npm run test:size
```
- ✅ `facet.code.length <= 24576` in dispatcher `adminRegisterUnsafe`
- ✅ Factory rejects chunks > `MAX_CHUNK_BYTES` 

### Full Self-Check
```bash
npm run payrox:self-check
```

## Facts Schema (Enhanced)

The `/arch/facts/upgrade` endpoint merges these defaults:

```json
{
  "loupe_selectors": { "facets()": "0x7a0ed627", ... },
  "constructor_hash_injection": {
    "enabled": true,
    "variables": {
      "manifest_hash_var": "EXPECTED_MANIFEST_HASH",
      "factory_bytecode_hash_var": "EXPECTED_FACTORY_BYTECODE_HASH"
    }
  },
  "merkle": {
    "leaf_encoding": "keccak256(abi.encode(bytes4,address,bytes32))"
  },
  "deployment": {
    "factory_address_env": "PAYROX_FACTORY_ADDRESS"
  },
  "dispatcher_addresses": {
    "localhost": "0xDISPATCHER_LOCALHOST",
    "sepolia": "0xDISPATCHER_SEPOLIA",
    "mainnet": "0xDISPATCHER_MAINNET"
  },
  "epoch_validation": {
    "rules": ["frozen == false", "activeEpoch >= 0", ...]
  }
}
```

## Security Hardening Applied

### DeterministicChunkFactory  
- ✅ Separate `expectedDispatcherCodehash` vs `expectedManifestHash`
- ✅ Size enforcement: `data.length <= MAX_CHUNK_BYTES`
- ✅ Proper integrity verification in `_verifySystemIntegrity()`

### SecurityFacet
- ✅ Explicit `AuthDenied()` error vs generic revert
- ✅ Gas-efficient auth checks

### IDiamondLoupeEx
- ✅ Complete interface with all Ex methods
- ✅ Fingerprint/provenance support

---

**Required footer for PayRox outputs:**

--- SELF-CHECK (tick before submit) ---
[✓] Size OK   [✓] No Loupe in Facets   [✓] Selectors Parity  
[✓] Roles→Dispatcher   [✓] Epoch Rules   [✓] Refund Math
[✓] Init Guard
