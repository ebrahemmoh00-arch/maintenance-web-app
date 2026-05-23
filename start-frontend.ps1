Set-Location "$PSScriptRoot\frontend"
$tools = Join-Path $PSScriptRoot ".tools"
$nodeDir = Join-Path $tools "node-v20.11.1-win-x64"
$nodeZip = Join-Path $tools "node.zip"

if (-not (Test-Path (Join-Path $nodeDir "node.exe"))) {
    New-Item -ItemType Directory -Force -Path $tools | Out-Null
    Invoke-WebRequest -Uri "https://nodejs.org/dist/v20.11.1/node-v20.11.1-win-x64.zip" -OutFile $nodeZip
    Expand-Archive -LiteralPath $nodeZip -DestinationPath $tools -Force
}

$env:PATH = "$nodeDir;$env:PATH"
& (Join-Path $nodeDir "npm.cmd") install
& (Join-Path $nodeDir "npm.cmd") run dev -- --host 127.0.0.1 --port 5173
