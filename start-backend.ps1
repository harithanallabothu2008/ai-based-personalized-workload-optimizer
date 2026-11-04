# Start Backend Service Script
$env:PYTHONPATH="backend"
Write-Host "Starting Academic Workload Optimizer FastAPI Backend on http://127.0.0.1:8000..." -ForegroundColor Cyan
.\venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000 --reload
