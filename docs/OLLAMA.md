# Ollama integration — quickstart

This project uses Ollama for local LLM-based diagnostics. The FastAPI server calls `ollama.Client()` and expects an Ollama server available at `localhost:11434` by default.

Checklist to get Ollama working locally:

- Install Ollama per the official instructions: [Ollama docs](https://ollama.ai/docs)
- Start Ollama (on macOS/Linux run `ollama serve` or use the system service on Windows).
- Confirm Ollama is listening:

```powershell
# should return HTTP 200 from the server
Invoke-RestMethod http://127.0.0.1:11434/v1/models
```

- Set environment variables (optional): copy `.env.example` -> `.env` and edit if needed.

Project-specific checks

- The FastAPI endpoint `/diag/ollama` performs a simple client check. Start the server and visit:

```http
http://127.0.0.1:8000/diag/ollama
```

- There are quick scripts in the repository that also call Ollama directly (`direct_ollama_query.py`, `quick_ollama_ask.py`). They require the `ollama` Python package (listed in `requirements.txt`).

If you want, I can add a lightweight GitHub Actions job that runs the `/diag/ollama` healthcheck against a temporary Ollama instance (containerized) to ensure PRs include a working LLM integration.
