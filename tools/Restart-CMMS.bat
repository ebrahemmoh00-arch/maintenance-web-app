@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0CMMS-Toolkit.ps1" -Action Restart
set EXITCODE=%ERRORLEVEL%
if not "%EXITCODE%"=="0" exit /b %EXITCODE%
start "" "http://localhost:5173"
start "" "http://localhost:8000/docs"
exit /b 0
