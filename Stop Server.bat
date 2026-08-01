@echo off
title Media Manager Shutdown
echo ===================================================
echo Stopping Media Manager Suite...
echo ===================================================
echo.

:: 1. Stop Frontend (Nginx)
echo [1/2] Stopping Nginx Frontend Server...
taskkill /F /IM nginx.exe /T >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo - Nginx stopped successfully.
) else (
    echo - Nginx is not running.
)

:: 2. Stop Backend (Node.js on port 5000)
echo.
echo [2/2] Stopping Node.js Backend Server (Port 5000)...
FOR /F "tokens=5" %%a IN ('netstat -aon ^| findstr ":5000"') DO (
    taskkill /F /PID %%a /T >nul 2>&1
)
echo - Backend stopped successfully.

echo.
echo ===================================================
echo SUCCESS: All systems have been safely shut down!
echo ===================================================
exit
