# PayRox AI Refactor Tools

This directory contains the PayRox AI-powered Diamond Pattern refactoring system.

## Tools Overview

### 🤖 AI Refactor Copilot (`ai-refactor-copilot.ts`)

The main orchestrator that:
- Takes refactor prompts and generates Diamond Pattern facets
- Runs self-correction loops with validation feedback
- Enforces EIP-170 and EIP-2535 compliance
- Outputs complete refactor packages

**Usage:**
```bash
# Basic refactor
npx ts-node tools/ai-refactor-copilot.ts "Refactor MyContract to Diamond facets"

# With specific file
npx ts-node tools/ai-refactor-copilot.ts --file contracts/MyContract.sol --prompt "Optimize for gas"

# Custom retry limit
npx ts-node tools/ai-refactor-copilot.ts --retries 5 "Complex refactor"
```

### 🔍 Refactor Linter (`refactor-lint.ts`)

Validates Diamond Pattern refactors for:
- ✅ EIP-170 bytecode size limits (≤ 24,576 bytes per facet)
- ✅ No loupe functions in facets 
- ✅ Selector parity and collision detection
- ✅ Proper role assignments
- ✅ Manifest structure validation

**Usage:**
```bash
# Run full validation
npm run ai:lint

# Custom directories
npx ts-node tools/refactor-lint.ts --facets ./custom-facets --manifest ./custom-manifest.json
```

### 📋 AI Rulebook (`ai-rulebook/`)

Contains the locked system prompt with:
- Hard constraints that AI cannot violate
- EIP-170 and EIP-2535 compliance rules
- Required output specifications
- Mandatory self-check validation

## NPM Scripts

The following scripts are available:

```bash
# AI Refactor System
npm run ai:refactor          # Run interactive refactor copilot
npm run ai:lint              # Run refactor validation linter
npm run ai:validate          # Full validation pipeline

# Compilation & Testing
npm run compile              # Compile contracts
npm run test:diamond         # Run Diamond compliance tests
npm run test:loupe           # Test loupe function compliance
npm run test:epoch           # Test epoch rules
npm run test:roles           # Test role assignments
npm run test:size            # Test size and gas limits
```

## Workflow Integration

### CI/CD Pipeline

The `.github/workflows/payrox-refactor-gate.yml` workflow:
- Runs on every push/PR
- Validates refactor compliance
- Blocks non-compliant changes
- Generates validation reports

### Development Workflow

1. **Generate Refactor**
   ```bash
   npx ts-node tools/ai-refactor-copilot.ts "Your refactor request"
   ```

2. **Validate Output**
   ```bash
   npm run ai:validate
   ```

3. **Fix Issues** (if any)
   ```bash
   npm run ai:lint  # See specific errors
   ```

4. **Test & Deploy**
   ```bash
   npm run test:diamond
   npm run compile
   ```

## Architecture

### Self-Correction Loop

```
User Prompt → AI Generate → Validate → Pass? → Done
                ↑              ↓         ↓
                └─ Fix Issues ←─┘    Retry (max 3x)
```

### Validation Pipeline

1. **Compile** - Ensure code compiles
2. **Lint** - Check size/compliance rules  
3. **Test** - Run critical test suites
4. **Self-Check** - Validate AI footer

### Hard Constraints

- **EIP-170**: 24,576 bytes max per facet
- **EIP-2535**: Proper Diamond Pattern
- **Loupe Ban**: Facets must NOT implement loupe
- **Selector Parity**: Exact ABI match with original
- **Role Safety**: Roles granted to dispatcher only

## Error Recovery

### Common Issues

| Error | Cause | Solution |
|-------|-------|----------|
| Size Limit Exceeded | Facet >24KB | AI splits into smaller facets |
| Loupe in Facet | Facet claims loupe interface | AI removes loupe claims |
| Selector Collision | Same selector in multiple facets | AI renames functions |
| Role Assignment Error | Roles granted to facet | AI fixes role setup |

### Debug Commands

```bash
# Check compilation only
npx hardhat compile

# Check specific lint issues
npm run ai:lint

# Run specific test categories
npm run test:loupe
npm run test:epoch
npm run test:roles
npm run test:size
```

## Output Files

Every successful refactor generates:

```
facets/
├── AdminFacet.sol           # Administrative functions
├── CoreFacet.sol            # Core business logic  
├── libraries/
│   ├── LibAdmin.sol         # Admin storage/logic
│   └── LibCore.sol          # Core storage/logic
└── interfaces/
    ├── IAdmin.sol           # Admin interface
    └── ICore.sol            # Core interface

payrox-manifest.json         # Facet → selector mapping
selector_map.json           # Complete selector inventory
tests/
├── loupe-and-selectors.test.ts    # EIP-2535 compliance
├── epoch-rules.test.ts            # Routing epoch tests
├── roles-delegatecall.test.ts     # Role assignment tests
└── size-and-gas.test.ts           # Performance tests

scripts/deploy/
├── deploy-diamond.ts        # Deployment script
└── verify-deployment.ts     # Verification script

report.md                   # Refactor summary & guide
```

## Configuration

### Environment Variables

```bash
OLLAMA_HOST=http://127.0.0.1:11434     # AI service endpoint
NODE_BIN=node                          # Node binary path
REPO_ROOT=.                           # Repository root
```

### Template Files

- `payrox-manifest.json.template` - Manifest structure template
- `selector_map.json.template` - Selector map template  
- `facets/README.md` - Facets directory guide

## Best Practices

1. **Always validate** before committing refactored code
2. **Review the report.md** to understand changes  
3. **Test on localhost** before mainnet deployment
4. **Backup original contracts** before refactoring
5. **Use descriptive prompts** for better AI results

## Security Considerations

- All refactors maintain behavior preservation
- Storage collision prevention via namespacing
- Proper delegatecall handling in facets
- Role inheritance through dispatcher only
- Gas limit and size optimization

## Troubleshooting

### AI Output Rejected
- Check for missing SELF-CHECK footer
- Verify all checkboxes are ticked
- Run `npm run ai:validate` for details

### Compilation Failures  
- Ensure Hardhat config is correct
- Check for missing dependencies
- Verify Solidity version compatibility

### Lint Failures
- Review `tools/refactor-lint.ts` output
- Check manifest format and content
- Verify artifact generation

This system ensures that every AI-generated refactor meets PayRox's strict Diamond Pattern requirements while maintaining behavior preservation and enabling rapid, reliable contract evolution.
