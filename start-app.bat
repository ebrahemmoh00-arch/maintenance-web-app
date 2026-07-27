@echo off
setlocal
title Maintenance Management Launcher

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-app.ps1"

echo.
echo If the browser did not open, check FRONTEND_URL or FRONTEND_PORT in .env.
echo.
pause
