@echo off
title Status do Servidor ID Management
color 0B

echo.
echo ========================================
echo   STATUS DO SERVIDOR ID MANAGEMENT
echo ========================================
echo.

echo 🗄️  Banco de Dados:
if exist "%~dp0backend\ids.db" (
    echo    ✅ SQLite (ids.db) encontrado
) else (
    echo    ⚠️  SQLite (ids.db) nao encontrado
)

echo.
echo 🔧 Backend API:
curl -s http://127.0.0.1:8000/health >nul 2>&1
if errorlevel 1 (
    echo    ❌ Offline
) else (
    echo    ✅ Online - http://127.0.0.1:8000
)

echo.
echo 🌐 Clientes conectados:
netstat -an | findstr ":8000" | findstr "ESTABLISHED" | find /c "ESTABLISHED"

echo.
echo ========================================
pause
