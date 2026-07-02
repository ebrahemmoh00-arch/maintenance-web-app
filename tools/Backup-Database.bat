@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0CMMS-Toolkit.ps1" -Action Backup
set EXITCODE=%ERRORLEVEL%
if not "%EXITCODE%"=="0" (
    echo.
    echo Backup failed. Review logs\backup.log for details.
    pause
)
exit /b %EXITCODE%
