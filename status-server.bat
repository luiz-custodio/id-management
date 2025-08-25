@echo off
title Status do Servidor ID Management
color 0B

echo.
echo ========================================
echo   STATUS DO SERVIDOR ID MANAGEMENT
echo ========================================
echo.

REM Verificar Docker
echo 🐳 Docker:
docker version >nul 2>&1
if errorlevel 1 (
    echo    ❌ Nao rodando
) else (
    echo    ✅ Funcionando
)

echo.
echo 🗄️  PostgreSQL:
docker ps | findstr "postgres" >nul
if errorlevel 1 (
    echo    ❌ Parado
) else (
    echo    ✅ Rodando
)

echo.
echo 🔧 Backend API:
curl -s http://192.168.1.52:8000/health >nul 2>&1
if errorlevel 1 (
    echo    ❌ Offline
) else (
    echo    ✅ Online - http://192.168.1.52:8000
)

echo.
echo 🌐 Clientes conectados:
netstat -an | findstr ":8000" | findstr "ESTABLISHED" | find /c "ESTABLISHED"

echo.
echo ========================================
pause
