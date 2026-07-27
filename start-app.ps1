$ErrorActionPreference = "Stop"

$appDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $appDir "backend"
$frontendDir = Join-Path $appDir "frontend"
$pythonExe = Join-Path $backendDir ".venv\Scripts\python.exe"
$nodeDir = Join-Path $appDir ".tools\node-v20.11.1-win-x64"
$npmExe = Join-Path $nodeDir "npm.cmd"

function Get-ConfigValue {
    param(
        [string]$Name,
        [string]$Default = ""
    )
    $processValue = [Environment]::GetEnvironmentVariable($Name)
    if (-not [string]::IsNullOrWhiteSpace($processValue)) {
        return $processValue
    }
    $envPath = Join-Path $appDir ".env"
    if (Test-Path $envPath) {
        foreach ($rawLine in Get-Content -Path $envPath) {
            $line = $rawLine.Trim()
            if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) {
                continue
            }
            $key, $value = $line.Split("=", 2)
            if ($key.Trim() -eq $Name) {
                return $value.Trim().Trim('"').Trim("'")
            }
        }
    }
    return $Default
}

$backendHost = Get-ConfigValue "LOCAL_BACKEND_HOST" "127.0.0.1"
$frontendHost = Get-ConfigValue "LOCAL_FRONTEND_HOST" "127.0.0.1"
$backendPort = Get-ConfigValue "BACKEND_PORT" "8000"
$frontendPort = Get-ConfigValue "FRONTEND_PORT" "5173"
$appUrl = Get-ConfigValue "FRONTEND_URL" "http://$frontendHost`:$frontendPort/?page=dashboard"
$backendHealthUrl = Get-ConfigValue "BACKEND_HEALTH_URL" "http://$backendHost`:$backendPort/api/health"
$frontendHealthUrl = Get-ConfigValue "FRONTEND_HEALTH_URL" "http://$frontendHost`:$frontendPort/"

function Stop-PortListeners {
    param([int[]]$Ports)

    foreach ($port in $Ports) {
        $listeners = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
            Where-Object { $_.State -eq "Listen" -and $_.OwningProcess -ne 0 } |
            Select-Object -ExpandProperty OwningProcess -Unique

        foreach ($processId in $listeners) {
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        }
    }
}

function Test-Url {
    param([string]$Url)

    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 2
        return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
    } catch {
        return $false
    }
}

if (-not (Test-Path $pythonExe)) {
    throw "Backend Python environment was not found: $pythonExe"
}

if (-not (Test-Path $npmExe)) {
    throw "Local Node.js was not found: $npmExe"
}

Set-Location $appDir
Stop-PortListeners -Ports @(5173, 8000)
Start-Sleep -Seconds 2

Remove-Item `
    (Join-Path $appDir "backend-out.log"), `
    (Join-Path $appDir "backend-err.log"), `
    (Join-Path $appDir "vite-out.log"), `
    (Join-Path $appDir "vite-err.log") `
    -ErrorAction SilentlyContinue

Start-Process `
    -FilePath $pythonExe `
    -ArgumentList @("-m", "uvicorn", "app.main:app", "--host", $backendHost, "--port", $backendPort) `
    -WorkingDirectory $backendDir `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $appDir "backend-out.log") `
    -RedirectStandardError (Join-Path $appDir "backend-err.log")

$frontendCommand = "/c set PATH=$nodeDir;%PATH% && `"$npmExe`" run dev -- --host $frontendHost --port $frontendPort"
Start-Process `
    -FilePath "cmd.exe" `
    -ArgumentList $frontendCommand `
    -WorkingDirectory $frontendDir `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $appDir "vite-out.log") `
    -RedirectStandardError (Join-Path $appDir "vite-err.log")

Write-Host "Starting Maintenance Management System..."

$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    if ((Test-Url $backendHealthUrl) -and (Test-Url $frontendHealthUrl)) {
        $ready = $true
        break
    }
    Start-Sleep -Seconds 1
}

if (-not $ready) {
    Write-Host "The app is still starting. If the browser does not open correctly, wait a few seconds and refresh."
}

Start-Process $appUrl

Write-Host ""
Write-Host "App URL: $appUrl"
Write-Host "Login credentials are read from ADMIN_USERNAME and ADMIN_PASSWORD."
