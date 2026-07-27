Set-Location "$PSScriptRoot\frontend"
$tools = Join-Path $PSScriptRoot ".tools"
$nodeDir = Join-Path $tools "node-v20.11.1-win-x64"
$nodeZip = Join-Path $tools "node.zip"
$frontendHost = if ($env:LOCAL_FRONTEND_HOST) { $env:LOCAL_FRONTEND_HOST } else { "127.0.0.1" }
$frontendPort = if ($env:FRONTEND_PORT) { $env:FRONTEND_PORT } else { "5173" }

if (-not (Test-Path (Join-Path $nodeDir "node.exe"))) {
    New-Item -ItemType Directory -Force -Path $tools | Out-Null
    Invoke-WebRequest -Uri "https://nodejs.org/dist/v20.11.1/node-v20.11.1-win-x64.zip" -OutFile $nodeZip
    Expand-Archive -LiteralPath $nodeZip -DestinationPath $tools -Force
}

$env:PATH = "$nodeDir;$env:PATH"
& (Join-Path $nodeDir "npm.cmd") install
& (Join-Path $nodeDir "npm.cmd") run dev -- --host $frontendHost --port $frontendPort
