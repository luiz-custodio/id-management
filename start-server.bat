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
echo  Versao: 1.1.0 (SQLite)
echo  Data: 02/02/2026
echo.
echo ========================================
echo.

REM Navegar para diretorio do projeto
cd /d "%~dp0"

echo [1/3] 🔧 Verificando dependencias Python...
cd backend
if not exist "venv\" (
    echo [1/3] 📦 Criando ambiente virtual...
    python -m venv venv
)

echo [2/3] 🔌 Ativando ambiente virtual...
call venv\Scripts\activate

echo [2/3] 📚 Instalando/Atualizando dependencias...
pip install -r requirements.txt >nul 2>&1

echo [3/3] 🚀 Iniciando Backend API...
echo.
echo ========================================
echo  ✅ SERVIDOR ATIVO
echo ========================================
echo.
echo  🌐 API Backend (local): http://127.0.0.1:8000
echo  🌐 API Backend (rede):  http://SEU_IP:8000
echo  🗄️  Banco de dados: SQLite (ids.db)
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




