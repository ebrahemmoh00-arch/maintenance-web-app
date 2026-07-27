Set-Location "$PSScriptRoot\backend"
$backendHost = if ($env:LOCAL_BACKEND_HOST) { $env:LOCAL_BACKEND_HOST } else { "127.0.0.1" }
$backendPort = if ($env:BACKEND_PORT) { $env:BACKEND_PORT } else { "8000" }
if (-not (Test-Path ".\.venv\Scripts\python.exe")) {
    python -m venv .venv
}
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host $backendHost --port $backendPort
