@echo off
setlocal
title Maintenance Management Launcher

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-app.ps1"

echo.
echo If the browser did not open, use:
echo http://127.0.0.1:5173/?page=dashboard
echo.
pause
