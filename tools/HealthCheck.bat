@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0CMMS-Toolkit.ps1" -Action HealthCheck
exit /b %ERRORLEVEL%
