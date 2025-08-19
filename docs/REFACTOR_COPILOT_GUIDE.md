# PayRox Refactor Copilot - Usage Guide

## Overview

The PayRox Refactor Copilot is a self-correcting AI system that performs behavior-preserving
contract refactors to Diamond Pattern (EIP-2535) while enforcing strict constraints.

## Quick Start

### 1. Basic Refactor

```bash
# Convert any monolith contract to Diamond facets
npx ts-node tools/ai-refactor-copilot.ts "Refactor ExampleContract to Diamond facets"
```

### 2. With Specific File

```bash
# Target a specific contract file
npx ts-node tools/ai-refactor-copilot.ts --file contracts/ExampleContract.sol --prompt "Diamond refactor with optimized storage"
```

### 3. Manual Validation

```bash
# Run the validation pipeline manually
npm run ai:validate
```

## System Components

### 1. System Prompt (tools/ai-rulebook/system-prompt.txt)

- Locked constraints that AI cannot violate
- EIP-170 (24,576 bytes per facet) enforcement
- EIP-2535 Diamond compliance rules
- Mandatory self-check footer requirement

### 2. Refactor Linter (tools/refactor-lint.ts)

- Validates bytecode size limits
- Checks for prohibited loupe functions in facets
- Verifies selector parity and collision detection
- Ensures proper role assignments

### 3. Self-Correction Loop (tools/ai-refactor-copilot.ts)

- Automatic retry on validation failures
- Error feedback to AI for corrections
- Maximum retry limit with graceful failure

### 4. CI Gate (.github/workflows/payrox-refactor-gate.yml)

- Automated validation on every commit
- Blocks bad refactors from merging
- Runs comprehensive test suite

## Validation Pipeline

The system runs this validation sequence:

1. **Compile** - npx hardhat compile
2. **Lint** - npm run ai:lint
3. **Test** - Critical tests for loupe, selectors, epochs, roles
4. **Self-Check** - Validates AI's mandatory footer

## Hard Constraints

### EIP-170 Compliance

- Each facet runtime bytecode ≤ 24,576 bytes
- Automatic size checking in lint phase

### EIP-2535 Diamond Pattern

- **Dispatcher**: Implements IDiamondLoupe + ERC-165
- **Facets**: Only claim their own interfaces (NOT loupe)
- **Selectors**: Exact parity with monolith ABI
- **Storage**: Unique namespaces per facet
- **Roles**: Granted to DISPATCHER (delegatecall context)

### Deployment Rules

- CREATE2 deterministic addresses
- Predict == Deploy address verification
- Correct refund calculations
- Idempotent operations allowed

### Routing System

- Manifest selector → facet mapping
- Dispatcher enforces "next epoch only"
- Last-write-wins for same epoch commits

## Expected Outputs

Every refactor produces:

1. **Facets** (facets/*.sol)

   - Namespaced storage structs
   - Custom error definitions
   - Proper access control modifiers
   - NO loupe function claims

2. **Manifest** (payrox-manifest.json)

   - Facet → selector mappings
   - Routing configuration
   - Optional codehash verification
   - Deployment metadata

3. **Selector Map** (selector_map.json)

   - Complete selector inventory
   - Collision detection report

4. **Deploy Scripts**

   - Deterministic deployment via factory
   - Dispatcher registration
   - Verification routines

5. **Tests**

   - Loupe functionality validation
   - Selector routing tests
   - Role assignment verification
   - Epoch rules compliance
   - Gas and size sanity checks

6. **Report** (report.md)
   - Summary of changes
   - Usage instructions
   - Migration guide

## Self-Check Validation

Every AI output MUST end with this exact footer:

```text
--- SELF-CHECK (tick before submit) ---
[✓] Size OK   [✓] No Loupe in Facets   [✓] Selectors Parity
[✓] Roles→Dispatcher   [✓] Epoch Rules   [✓] Refund Math
[✓] Init Guard
```

**All boxes must be checked** or the output is rejected.

## Common Usage Patterns

### Development Workflow

```bash
# 1. Start refactor
npx ts-node tools/ai-refactor-copilot.ts "Convert MyContract to facets"

# 2. If it fails, check errors and retry
npm run ai:validate

# 3. Manual correction if needed
npm run ai:lint  # See specific lint errors
```

### CI Integration

```bash
# Runs automatically on push/PR
# .github/workflows/payrox-refactor-gate.yml

# Manual CI validation
npm run ai:validate
```

### Debug Mode

```bash
# Check specific components
npx hardhat compile                              # Build only
npm run ai:lint                                  # Lint only
npx hardhat test --grep "(loupe|selectors)"     # Test only
```

## Error Recovery

### Common Issues

1. **Size Limit Exceeded**

   - Error: Facet XYZ runtime 28000 > 24576 bytes
   - Solution: AI splits facet into smaller components

2. **Loupe Function in Facet**

   - Error: Facet XYZ MUST NOT implement loupe function facets()
   - Solution: AI removes loupe claims from facet

3. **Selector Collision**

   - Error: Selector collision: 0x12345678 in FacetA and FacetB
   - Solution: AI renames conflicting functions

4. **Role Assignment Error**
   - Error: Roles granted to facet instead of dispatcher
   - Solution: AI fixes role setup in initialization

### Self-Correction Process

1. AI generates initial refactor
2. Validation pipeline runs automatically
3. If errors found, AI receives error bundle
4. AI generates corrected version
5. Repeat up to maxRetries times (default: 3)
6. Final success or graceful failure

## Advanced Configuration

### Custom Retry Limits

```bash
npx ts-node tools/ai-refactor-copilot.ts --retries 5 "Complex refactor"
```

### Output Directory Control

```bash
npx ts-node tools/ai-refactor-copilot.ts --output ./custom-facets "Refactor task"
```

### Integration with External Tools

```bash
# Chain with other tools
npm run ai:validate && npm run deploy:localhost
```

## Testing Strategy

### Mandatory Tests

- loupe-and-selectors.test.ts - Validates Diamond compliance
- epoch-rules.test.ts - Tests routing epoch enforcement
- roles-delegatecall.test.ts - Verifies role assignment
- size-and-gas.test.ts - Performance validation

### Coverage Requirements

- Facet size validation: 100%
- Selector routing: 100%
- Role assignments: 100%
- Epoch transitions: 100%

## Troubleshooting

### AI Output Rejected

- Check for missing SELF-CHECK footer
- Verify all checkboxes are ticked
- Run manual validation: npm run ai:validate

### Compilation Failures

- Ensure Hardhat config is correct
- Check for missing dependencies
- Verify Solidity version compatibility

### Lint Failures

- Review tools/refactor-lint.ts output
- Check manifest format and content
- Verify artifact generation

### Test Failures

- Run specific test files to isolate issues
- Check for proper mocking in tests
- Validate network configuration

## Best Practices

1. **Always validate** before committing refactored code
2. **Review the report.md** to understand changes
3. **Test on localhost** before mainnet deployment
4. **Backup original contracts** before refactoring
5. **Use descriptive prompts** for better AI results

## Integration Points

### With Existing Tools

- Works with current Hardhat setup
- Integrates with existing test suite
- Compatible with deployment scripts
- Supports manifest system

### With CI/CD

- GitHub Actions automatically validate
- Blocks invalid refactors from merging
- Provides clear error reporting
- Supports multiple environments

This system ensures that every AI-generated refactor meets PayRox's strict Diamond Pattern
requirements while maintaining behavior preservation and enabling rapid, reliable contract
evolution.
