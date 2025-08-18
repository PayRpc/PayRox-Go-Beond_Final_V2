# PayRox Go Beyond - Diamond Pattern Blockchain Platform

[![CI/CD](https://github.com/PayRpc/PayRox-Go-Beond_Final_V2/workflows/payrox-refactor-gate/badge.svg)](https://github.com/PayRpc/PayRox-Go-Beond_Final_V2/actions)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.30-blue.svg)](https://docs.soliditylang.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-green.svg)](https://fastapi.tiangolo.com/)

> **Production-ready blockchain development platform with AI-powered Diamond Pattern (EIP-2535) refactoring, comprehensive testing, and multi-service architecture.**

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Python 3.9+
- Git

### Installation
```bash
# Clone the repository
git clone https://github.com/PayRpc/PayRox-Go-Beond_Final_V2.git
cd PayRox-Go-Beond_Final_V2

# Install dependencies
npm install
pip install -r requirements.txt

# Compile contracts
npm run compile

# Run comprehensive tests
npm run payrox:self-check
```

### Start Development Server
```bash
# Start FastAPI backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# In another terminal, start manifest server
npm run serve:manifest

# Access API documentation
open http://127.0.0.1:8000/docs
```

## 🏗️ Architecture

### Core Components

- **🔷 Diamond Pattern Contracts**: EIP-2535 compliant modular proxy system
- **🏭 Factory System**: CREATE2 deterministic deployment with integrity verification  
- **🤖 AI Refactor Copilot**: Self-correcting Diamond Pattern code generation
- **📊 FastAPI Backend**: RAG-enhanced API with Ollama LLM integration
- **🧪 Testing Suite**: Comprehensive validation for Diamond compliance
- **🚀 Deployment Tools**: Multi-network deployment with CI/CD integration

### Tech Stack
- **Smart Contracts**: Solidity 0.8.30, Hardhat, OpenZeppelin
- **Backend**: Python FastAPI, Ollama, BM25 RAG
- **Frontend Tools**: TypeScript, ESLint, Prettier
- **Testing**: Jest, Mocha, Chai, GitHub Actions
- **Deployment**: Docker, Multi-network support

## 📋 Key Features

### Diamond Pattern (EIP-2535)
- ✅ Modular facet system with upgradeable logic
- ✅ Standard and Enhanced Loupe implementations
- ✅ EXTCODEHASH gating for security
- ✅ Role-based access control (RBAC)
- ✅ Emergency pause/freeze mechanisms

### AI-Powered Development
- ✅ Self-correcting refactor copilot
- ✅ EIP-170 size limit enforcement  
- ✅ Automatic selector collision detection
- ✅ Gas optimization analysis
- ✅ Behavior preservation validation

### Deployment & Security
- ✅ CREATE2 deterministic addresses
- ✅ Integrity verification system
- ✅ Multi-network deployment scripts
- ✅ Comprehensive test coverage
- ✅ CI/CD pipeline with automated validation

## 🛠️ Development Workflow

### Smart Contract Development
```bash
# Compile contracts
npm run compile

# Run Diamond compliance tests
npm run test:diamond

# Lint Solidity code
npm run sol:lint
```

### AI-Powered Refactoring
```bash
# Basic refactor to Diamond Pattern
npx ts-node tools/ai-refactor-copilot.ts "Refactor MyContract to Diamond facets"

# With specific file
npx ts-node tools/ai-refactor-copilot.ts --file contracts/MyContract.sol

# Validate refactor results
npm run ai:validate
```

### API Development
```bash
# Start development server
python -m uvicorn app.main:app --reload

# Build RAG index
curl -X POST http://localhost:8000/rag/build

# Test health endpoint
curl http://localhost:8000/health
```

## 📊 Testing

### Contract Tests
```bash
npm run test:integrity    # System integrity verification
npm run test:loupe       # EIP-2535 compliance
npm run test:epoch       # Manifest lifecycle
npm run test:roles       # Access control
npm run test:size        # Size limit enforcement
```

### Comprehensive Validation
```bash
npm run payrox:self-check  # Full test suite
```

### API Tests
```bash
python -m pytest tests/   # Python API tests
```

## 🚀 Deployment

### Local Development
```bash
# Deploy to local network
npm run deploy:local

# Setup dispatcher roles  
npm run deploy:setup-roles
```

### Production Deployment
```bash
# Set environment variables
cp .env.example .env
# Edit .env with your configuration

# Deploy to mainnet
npm run deploy:mainnet

# Verify deployment
npm run verify:mainnet
```

### Using Docker
```bash
# Start all services
docker-compose up -d

# Check service health
docker-compose ps
```

## 📚 Documentation

- **[Refactor Copilot Guide](docs/REFACTOR_COPILOT_GUIDE.md)**: AI-powered refactoring
- **[Deployment Checklist](docs/PAYROX_DEPLOYMENT_CHECKLIST.md)**: Production deployment
- **[Ollama Integration](docs/OLLAMA.md)**: LLM setup and configuration
- **[Tools Overview](tools/README.md)**: Development tools documentation
- **[Repository Analysis](REPOSITORY_ANALYSIS.md)**: Comprehensive system analysis

## 🔧 Configuration

### Environment Variables
Key configuration options (see `.env.example` for complete list):

```bash
# Network Configuration
DEFAULT_NETWORK=localhost
MAINNET_RPC_URL=https://eth.llamarpc.com

# AI Configuration  
OLLAMA_HOST=http://127.0.0.1:11434
AI_ENABLED=true

# Contract Configuration
FACTORY_ADDRESS=0x...
DISPATCHER_ADDRESS=0x...

# API Configuration
PORT=8000
CORS_ORIGINS=http://localhost:3000
```

### Run API (Windows)
```powershell
Set-Location 'C:\\PayRox-Go-Beyond-Ollama'
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload --log-level debug

# Quick smoke (separate terminal)
Invoke-RestMethod http://127.0.0.1:8000/arch/facts

# Offline smoke (no server)
python scripts\smoke_api.py
```

### Facts Configuration
Enhanced configuration management:
```bash
# Upgrade facts.json with PayRox defaults
curl -X POST http://localhost:8000/arch/facts/upgrade

# View current configuration
curl http://localhost:8000/arch/facts
```

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Install dependencies: `npm install && pip install -r requirements.txt`
4. Run tests: `npm run payrox:self-check`
5. Commit changes: `git commit -m 'Add amazing feature'`
6. Push to branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Code Standards
- **Solidity**: Follow OpenZeppelin standards, use Solhint
- **TypeScript**: ESLint + Prettier configuration
- **Python**: Black formatting, type hints
- **Testing**: Comprehensive test coverage required
- **Documentation**: Update docs for new features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏆 Acknowledgments

- **EIP-2535**: Diamond Pattern specification
- **OpenZeppelin**: Security-focused contract libraries  
- **Hardhat**: Ethereum development environment
- **FastAPI**: Modern Python web framework
- **Ollama**: Local LLM inference

## 📞 Support

- **Documentation**: Check the `docs/` directory
- **Issues**: [GitHub Issues](https://github.com/PayRpc/PayRox-Go-Beond_Final_V2/issues)
- **Discussions**: [GitHub Discussions](https://github.com/PayRpc/PayRox-Go-Beond_Final_V2/discussions)

---

**PayRox Go Beyond** - *Advancing blockchain development with AI-powered Diamond Pattern implementations.*
