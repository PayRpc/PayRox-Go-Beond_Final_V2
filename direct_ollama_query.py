#!/usr/bin/env python3
"""
Direct Ollama query about missing Solidity files
"""
from ollama import Client
import os
from pathlib import Path

def scan_contracts():
    """Scan existing contracts to understand what's missing"""
    contracts_dir = Path("contracts")
    if not contracts_dir.exists():
        return "No contracts directory found"
    
    # Find files that reference ManifestTypes or ManifestUtils
    referencing_files = []
    for sol_file in contracts_dir.rglob("*.sol"):
        try:
            content = sol_file.read_text(encoding='utf-8')
            if "ManifestTypes" in content or "ManifestUtils" in content:
                referencing_files.append({
                    'file': str(sol_file),
                    'content': content[:2000]  # First 2000 chars
                })
        except Exception:
            continue
    
    return referencing_files

def ask_ollama():
    """Ask Ollama directly about the missing files"""
    client = Client(host='http://localhost:11434')
    
    # Get context from existing contracts
    referencing_files = scan_contracts()
    
    context = "Here are the Solidity files that reference ManifestTypes and ManifestUtils:\n\n"
    for file_info in referencing_files:
        context += f"=== {file_info['file']} ===\n{file_info['content']}\n\n"
    
    queries = [
        f"""Based on this Solidity code context, what should be in ManifestTypes.sol?

{context}

Please analyze the usage patterns and create the missing ManifestTypes.sol file with all required structs, events, and errors.""",

        f"""Based on this Solidity code context, what should be in ManifestUtils.sol?

{context}

Please analyze the usage patterns and create the missing ManifestUtils.sol library with all required functions."""
    ]
    
    for i, query in enumerate(queries, 1):
        print(f"\n🤖 Query {i}:")
        print("=" * 60)
        
        try:
            response = client.chat(
                model='codellama:7b-instruct',  # Use available CodeLlama model
                messages=[{
                    'role': 'user',
                    'content': query
                }]
            )
            
            answer = response['message']['content']
            print(answer)
            print("\n" + "-" * 60)
            
        except Exception as e:
            print(f"Error querying Ollama: {e}")

if __name__ == "__main__":
    print("🔍 Scanning contracts for ManifestTypes/ManifestUtils usage...")
    ask_ollama()
