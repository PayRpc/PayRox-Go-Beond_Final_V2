#!/usr/bin/env python3
"""
Quick script to query Ollama about missing Solidity files
"""
import requests
import json

def query_ollama(query: str):
    """Query the FastAPI server which talks to Ollama"""
    try:
        response = requests.post(
            "http://127.0.0.1:8000/rag/query",
            json={"query": query},
            timeout=30
        )
        if response.status_code == 200:
            result = response.json()
            return result.get("answer", "No answer received")
        else:
            return f"Error: {response.status_code} - {response.text}"
    except Exception as e:
        return f"Connection error: {e}"

def build_index():
    """Build the RAG index first"""
    try:
        response = requests.post("http://127.0.0.1:8000/rag/build", timeout=60)
        if response.status_code == 200:
            return "Index built successfully"
        else:
            return f"Index build failed: {response.status_code} - {response.text}"
    except Exception as e:
        return f"Index build error: {e}"

if __name__ == "__main__":
    print("🔧 Building RAG index first...")
    build_result = build_index()
    print(f"Build result: {build_result}")
    print("\n" + "="*60 + "\n")
    
    queries = [
        "Do you know about ManifestTypes.sol and ManifestUtils.sol files? Are they in any sandbox or contract repository?",
        "What should ManifestTypes.sol contain based on the contract usage patterns I can see?",
        "What functions should be in ManifestUtils.sol library based on how it's being used?",
        "Can you analyze the contracts that import manifest files and tell me what's missing?"
    ]
    
    for i, query in enumerate(queries, 1):
        print(f"🤖 Query {i}: {query}")
        print("=" * 60)
        answer = query_ollama(query)
        print(f"Answer: {answer}")
        print("\n" + "-" * 60 + "\n")
