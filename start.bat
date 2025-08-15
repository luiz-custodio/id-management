@echo off
REM Script para iniciar o sistema ID Management no Windows

echo 🚀 Iniciando Sistema de Gerenciamento de IDs...

REM Verificar se estamos no diretório correto
if not exist "backend" (
    echo ❌ Execute este script no diretório raiz do projeto (id-management)
    pause
    exit /b 1
)

if not exist "frontend" (
    echo ❌ Execute este script no diretório raiz do projeto (id-management)
    pause
    exit /b 1
)

echo 🔧 Iniciando backend (FastAPI)...
start "Backend FastAPI" cmd /k "cd backend && python -m uvicorn app.main:app --reload --port 8000"

timeout /t 3 /nobreak > nul

echo 🎨 Iniciando frontend (React + Vite)...
start "Frontend React" cmd /k "cd frontend && npm run dev"

echo.
echo 🌟 Sistema iniciado com sucesso!
echo 📱 Frontend: http://localhost:5173
echo 🔧 Backend: http://localhost:8000
echo 📖 Docs da API: http://localhost:8000/docs
echo.
echo Para parar os serviços, feche as janelas do terminal abertas.

pause
