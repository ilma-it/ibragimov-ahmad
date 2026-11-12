@echo off
cd /d "%~dp0"
title Zapusk servera Umnaya Teplitsa...
echo ===================================================
echo   Zapusk lokalnogo servera...
echo ===================================================
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "server.ps1"
if errorlevel 1 (
    echo.
    echo Proizoshla oshibka zapuska.
    pause
)
