@echo off
title Parar Servidor ID Management
color 0C

echo.
echo ========================================
echo   PARAR SERVIDOR ID MANAGEMENT
echo ========================================
echo.

echo [1/2] 🛑 Parando Backend API...
taskkill /F /IM python.exe 2>nul
taskkill /F /IM uvicorn.exe 2>nul

echo [2/2] 🐳 Parando PostgreSQL...
cd /d "%~dp0"
docker-compose down

echo.
echo ✅ Servidor parado com sucesso!
echo.
pause
