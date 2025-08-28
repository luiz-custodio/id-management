@echo off
title ID Management System - Servidor
color 0A
cls

echo.
echo ========================================
echo   ID MANAGEMENT SYSTEM - SERVIDOR
echo ========================================
echo.
echo  Autor: BM Energia
echo  Versao: 1.0.0
echo  Data: 25/08/2025
echo.
echo ========================================
echo.

REM Verificar se Docker está rodando
docker version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker nao esta rodando!
    echo.
    echo Solucoes:
    echo 1. Abrir Docker Desktop
    echo 2. Aguardar inicializacao completa
    echo 3. Executar este script novamente
    echo.
    pause
    exit /b 1
)

REM Navegar para diretorio do projeto
cd /d "%~dp0"

echo [1/4] 🐳 Verificando PostgreSQL...
docker ps | findstr "postgres" >nul
if errorlevel 1 (
    echo [1/4] 🚀 Iniciando PostgreSQL...
    docker-compose up -d postgres
    if errorlevel 1 (
        echo ❌ Erro ao iniciar PostgreSQL
        echo.
        echo Verificar:
        echo - Docker Desktop funcionando
        echo - Arquivo docker-compose.yml existe
        echo - Porta 5432 disponivel
        echo.
        pause
        exit /b 1
    )
) else (
    echo [1/4] ✅ PostgreSQL ja rodando
)

echo [2/4] ⏳ Aguardando PostgreSQL ficar pronto...
timeout /t 8 /nobreak >nul

echo [3/4] 🔧 Verificando dependencias Python...
cd backend
if not exist "venv\" (
    echo [3/4] 📦 Criando ambiente virtual...
    python -m venv venv
)

echo [3/4] 🔌 Ativando ambiente virtual...
call venv\Scripts\activate

echo [3/4] 📚 Instalando/Atualizando dependencias...
pip install -r requirements.txt >nul 2>&1

echo [4/4] 🚀 Iniciando Backend API...
echo.
echo ========================================
echo  ✅ SERVIDOR ATIVO
echo ========================================
echo.
echo  🌐 API Backend (local): http://127.0.0.1:8000
echo  ?? API Backend (rede):  http://SEU_IP:8000
echo  🗄️  PostgreSQL: localhost:5432
echo  📁 Pasta Cliente: ../cliente/
echo.
echo  💡 Dica: Mantenha esta janela aberta
echo      Os clientes conectam automaticamente
echo.
echo ========================================
echo.

REM Iniciar FastAPI
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

REM Se chegar aqui, o servidor foi parado
echo.
echo ⚠️  Servidor parado
pause




