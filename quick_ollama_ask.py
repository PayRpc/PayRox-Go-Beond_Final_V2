#!/usr/bin/env python3
"""
Simple Ollama query about Solidity manifest patterns
"""
from ollama import Client
import time

def quick_ask():
    client = Client(host='http://localhost:11434')
    
    questions = [
        "What are ManifestTypes.sol and ManifestUtils.sol files typically used for in Solidity smart contracts?",
        "Can you generate a basic ManifestTypes.sol file with common struct definitions for smart contracts?",
        "What would a ManifestUtils.sol library typically contain for smart contract utilities?"
    ]
    
    for i, question in enumerate(questions, 1):
        print(f"\n🤖 Question {i}: {question}")
        print("=" * 80)
        
        try:
            start_time = time.time()
            response = client.chat(
                model='codellama:7b-instruct',
                messages=[{
                    'role': 'user',
                    'content': question
                }],
                options={
                    'temperature': 0.7,
                    'max_tokens': 1000
                }
            )
            
            elapsed = time.time() - start_time
            answer = response['message']['content']
            print(f"⏱️ Response time: {elapsed:.1f}s")
            print(answer)
            print("\n" + "-" * 80)
            
        except Exception as e:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    quick_ask()
