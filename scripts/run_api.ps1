Set-Location 'C:\PayRox-Go-Beyond-Ollama'
$env:PYTHONUNBUFFERED = "1"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload --log-level debug
