#!/usr/bin/env python3
"""
PayRox RAG Knowledge Base Builder
Builds and updates the Ollama knowledge base with PayRox contracts
"""
import requests
import time
import json

def wait_for_server(max_retries=10):
    """Wait for server to be ready"""
    for i in range(max_retries):
        try:
            response = requests.get("http://127.0.0.1:8000/health", timeout=5)
            if response.status_code == 200:
                print("✅ Server is ready!")
                return True
        except requests.exceptions.RequestException:
            print(f"⏳ Waiting for server... (attempt {i+1}/{max_retries})")
            time.sleep(2)
    return False

def build_knowledge_base():
    """Build the complete RAG knowledge base"""
    try:
        print("🔨 Building RAG knowledge base...")
        response = requests.post("http://127.0.0.1:8000/rag/build_all", timeout=120)
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Knowledge base built successfully!")
            print(f"📊 Indexed {result.get('total_docs', 'unknown')} documents")
            return True
        else:
            print(f"❌ Failed to build knowledge base: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return False

def test_rag_query():
    """Test the RAG system with a sample query"""
    try:
        print("🧪 Testing RAG query...")
        params = {
            "q": "What is the PayRoxProxyRouter and how does it handle L2 governance?",
            "model": "codellama:7b-instruct"
        }
        
        response = requests.get("http://127.0.0.1:8000/rag/ask", params=params, timeout=60)
        
        if response.status_code == 200:
            result = response.json()
            print("✅ RAG query successful!")
            print("🤖 Response:")
            print(result.get("answer", "No answer provided"))
            return True
        else:
            print(f"❌ RAG query failed: {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Query failed: {e}")
        return False

def update_ollama_knowledge():
    """Update Ollama with PayRox-specific knowledge"""
    print("📚 Updating Ollama with PayRox knowledge...")
    
    # Check server availability
    if not wait_for_server():
        print("❌ Server not available")
        return False
    
    # Build knowledge base
    if not build_knowledge_base():
        print("❌ Failed to build knowledge base")
        return False
    
    # Test RAG system
    if not test_rag_query():
        print("❌ RAG system test failed")
        return False
    
    print("🎉 Ollama knowledge base updated successfully!")
    return True

if __name__ == "__main__":
    print("🚀 PayRox Ollama Knowledge Updater")
    print("=" * 50)
    
    success = update_ollama_knowledge()
    
    if success:
        print("\n✅ All operations completed successfully!")
        print("💡 You can now query the PayRox knowledge base:")
        print("   GET http://127.0.0.1:8000/rag/ask?q=your_question")
    else:
        print("\n❌ Some operations failed. Check the logs above.")
