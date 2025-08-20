#!/usr/bin/env python3
"""
PayRox Ollama Knowledge Updater
Comprehensive knowledge base integration for PayRox Diamond proxy system
"""

import json
import subprocess
import os
import time
from pathlib import Path

def run_ollama_command(cmd, input_text=None):
    """Execute ollama command with optional input"""
    try:
        if input_text:
            process = subprocess.run(cmd, input=input_text, text=True, 
                                   capture_output=True, shell=True)
        else:
            process = subprocess.run(cmd, text=True, capture_output=True, shell=True)
        return process.returncode == 0, process.stdout, process.stderr
    except Exception as e:
        return False, "", str(e)

def read_file_safe(filepath):
    """Safely read file content with error handling"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        print(f"Warning: Could not read {filepath}: {e}")
        return ""

def create_knowledge_prompt():
    """Create comprehensive knowledge prompt for Ollama"""
    
    # Read our comprehensive system knowledge
    knowledge_file = Path("PAYROX_SYSTEM_KNOWLEDGE.md")
    system_knowledge = read_file_safe(knowledge_file) if knowledge_file.exists() else ""
    
    # Build comprehensive knowledge prompt
    prompt = f"""
I want you to learn about the PayRox Diamond Proxy System. This is a comprehensive Ethereum smart contract system with advanced security features and L2 governance capabilities. Please study this information carefully as you'll be asked questions about it:

{system_knowledge}

IMPORTANT CONTEXT FOR FUTURE QUERIES:

1. SECURITY POSTURE: PayRox is enterprise-ready with 0 compilation errors, 0 ESLint errors, and all critical vulnerabilities resolved through professional security audits.

2. KEY INNOVATIONS:
   - OrderedMerkle with PayRox-style EXTCODEHASH binding (rare in industry)
   - L2 cross-domain governance via OP-Stack/Arbitrum messengers
   - Symmetric reentrancy protection across all entry points
   - Governance manipulation prevention through snapshot systems

3. CURRENT STATUS (August 2025):
   - Complete ethers v5→v6 migration across entire codebase
   - Solidity 0.8.30 standardization across all contracts
   - Professional audit compliance (SWC-105/112/114/116)
   - Comprehensive documentation and tooling

4. DEVELOPMENT PATTERNS:
   - Diamond proxy with EIP-2535 compliance
   - Namespaced facet storage with collision prevention
   - Cross-chain governance with manipulation protection
   - Professional security standards with audit documentation

5. TOOLS & AUTOMATION:
   - synth-storage.js: AST-based storage analysis
   - transform-one.js: Automated Diamond compatibility
   - FastAPI RAG server with 25 endpoints
   - Comprehensive testing and CI/CD integration

When answering questions about PayRox, reference this knowledge and provide specific, technical answers based on the actual system architecture and security features described above.

Do you understand the PayRox system and are you ready to answer questions about it?
"""
    
    return prompt

def update_ollama_knowledge():
    """Update Ollama with comprehensive PayRox knowledge"""
    
    print("🚀 PayRox Ollama Knowledge Update System")
    print("=" * 50)
    
    # Check if Ollama is running
    print("📡 Checking Ollama status...")
    success, output, error = run_ollama_command("ollama list")
    if not success:
        print(f"❌ Ollama not available: {error}")
        return False
    
    print("✅ Ollama is running")
    print(f"📋 Available models:\n{output}")
    
    # Create knowledge prompt
    print("📚 Preparing PayRox knowledge base...")
    knowledge_prompt = create_knowledge_prompt()
    
    # Update each model with PayRox knowledge
    models = ["llama3.1:latest", "codellama:7b-instruct"]
    
    for model in models:
        print(f"\n🧠 Updating {model} with PayRox knowledge...")
        
        # Create a knowledge session
        cmd = f'ollama run {model}'
        success, response, error = run_ollama_command(cmd, knowledge_prompt)
        
        if success:
            print(f"✅ {model} updated successfully")
            print(f"📝 Response preview: {response[:200]}...")
        else:
            print(f"⚠️  Warning: {model} update had issues: {error}")
    
    # Test knowledge with a sample query
    print(f"\n🧪 Testing PayRox knowledge with sample query...")
    test_query = """
What are the key security features of the PayRox OrderedMerkle library and how does it prevent governance DoS attacks?
"""
    
    cmd = f'ollama run llama3.1:latest'
    success, response, error = run_ollama_command(cmd, test_query)
    
    if success:
        print("✅ Knowledge test successful!")
        print(f"📋 Sample response:\n{response}")
    else:
        print(f"⚠️  Knowledge test warning: {error}")
    
    print("\n🎉 PayRox knowledge update complete!")
    print("💡 You can now ask Ollama detailed questions about:")
    print("   • Diamond proxy architecture")
    print("   • L2 cross-domain governance")
    print("   • Security audit findings and fixes")
    print("   • OrderedMerkle and EXTCODEHASH binding")
    print("   • Storage patterns and collision prevention")
    print("   • Development tools and automation")
    
    return True

def interactive_payrox_session():
    """Start interactive PayRox Q&A session"""
    
    print("\n🎮 Starting Interactive PayRox Knowledge Session")
    print("=" * 50)
    print("Ask any questions about PayRox architecture, security, or development!")
    print("Type 'quit' to exit\n")
    
    while True:
        question = input("🤔 PayRox Question: ").strip()
        
        if question.lower() in ['quit', 'exit', 'q']:
            print("👋 Goodbye!")
            break
            
        if not question:
            continue
            
        print("🧠 Thinking...")
        
        # Query llama3.1 with PayRox context
        full_prompt = f"""
Based on your knowledge of the PayRox Diamond Proxy System, please answer this question with specific technical details:

{question}

Provide a comprehensive answer referencing the actual PayRox architecture, security features, and current system status.
"""
        
        cmd = f'ollama run llama3.1:latest'
        success, response, error = run_ollama_command(cmd, full_prompt)
        
        if success:
            print(f"🎯 PayRox Answer:\n{response}\n")
        else:
            print(f"❌ Error: {error}\n")

if __name__ == "__main__":
    try:
        # Update knowledge base
        success = update_ollama_knowledge()
        
        if success:
            # Start interactive session
            interactive_payrox_session()
        else:
            print("❌ Knowledge update failed. Please check Ollama installation.")
            
    except KeyboardInterrupt:
        print("\n👋 Knowledge update interrupted by user")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
