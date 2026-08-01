@echo off
title Media Manager Master Launcher
echo ===================================================
echo Starting Media Manager Suite...
echo ===================================================
echo.

:: 1. Start the Backend in a separate terminal window
echo [1/2] Booting up the Node.js Backend Server...
start "Media Manager Backend" cmd /c "Backend\Start Backend.bat"

:: 2. Start the Frontend (Nginx and Browser) in a separate terminal window
echo [2/2] Booting up the Nginx Frontend Server...
start "Media Manager Frontend" cmd /c "Frontend\Start Frontend.bat"

echo.
echo ===================================================
echo SUCCESS: Both systems have been initialized!
echo ===================================================
exit
