#!/bin/bash

# Script para iniciar o sistema ID Management

echo "🚀 Iniciando Sistema de Gerenciamento de IDs..."

# Verificar se estamos no diretório correto
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ Execute este script no diretório raiz do projeto (id-management)"
    exit 1
fi

# Função para iniciar o backend
start_backend() {
    echo "🔧 Iniciando backend (FastAPI)..."
    cd backend
    python -m uvicorn app.main:app --reload --port 8000 &
    BACKEND_PID=$!
    cd ..
    echo "✅ Backend iniciado na porta 8000 (PID: $BACKEND_PID)"
}

# Função para iniciar o frontend
start_frontend() {
    echo "🎨 Iniciando frontend (React + Vite)..."
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    cd ..
    echo "✅ Frontend iniciado na porta 5173 (PID: $FRONTEND_PID)"
}

# Iniciar serviços
start_backend
sleep 2
start_frontend

echo ""
echo "🌟 Sistema iniciado com sucesso!"
echo "📱 Frontend: http://localhost:5173"
echo "🔧 Backend: http://localhost:8000"
echo "📖 Docs da API: http://localhost:8000/docs"
echo ""
echo "Para parar os serviços, pressione Ctrl+C"

# Aguardar sinal de interrupção
trap "echo '🛑 Parando serviços...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
