#!/bin/bash
# Script de inicialização - PostgreSQL via Docker
# Facilita o uso do sistema com Docker

echo "🚀 ID Management - Iniciando PostgreSQL via Docker"
echo "=================================================="

# Verifica se Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não encontrado. Instale o Docker Desktop primeiro."
    echo "   Download: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Verifica se Docker está rodando
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker não está rodando. Inicie o Docker Desktop primeiro."
    exit 1
fi

# Copia .env.docker para .env (configuração PostgreSQL)
if [ -f "backend/.env.docker" ]; then
    cp backend/.env.docker backend/.env
    echo "✅ Configuração PostgreSQL aplicada"
else
    echo "⚠️  Arquivo .env.docker não encontrado"
fi

# Inicia PostgreSQL via Docker Compose
echo "🐳 Iniciando PostgreSQL..."
docker-compose up -d

# Aguarda PostgreSQL ficar pronto
echo "⏳ Aguardando PostgreSQL ficar pronto..."
for i in {1..60}; do
    if docker exec id_management_postgres pg_isready -U id_user -d id_management > /dev/null 2>&1; then
        echo "✅ PostgreSQL pronto! (${i}s)"
        break
    fi
    sleep 1
    if [ $i -eq 60 ]; then
        echo "❌ PostgreSQL não ficou pronto em 60 segundos"
        echo "📋 Verifique os logs: docker logs id_management_postgres"
        exit 1
    fi
done

# Instala dependências Python se necessário
if [ ! -d "backend/venv" ]; then
    echo "🐍 Criando ambiente Python..."
    cd backend
    python -m venv venv
    source venv/bin/activate  # Linux/Mac
    # No Windows: venv\Scripts\activate
    pip install -r requirements.txt
    cd ..
fi

echo ""
echo "🎉 PostgreSQL iniciado com sucesso!"
echo "📋 Informações de conexão:"
echo "   Host: localhost"
echo "   Porta: 5432"
echo "   Banco: id_management"
echo "   Usuário: id_user"
echo ""
echo "🚀 Para iniciar a aplicação:"
echo "   cd backend && uvicorn app.main:app --reload"
echo ""
echo "🔧 Comandos úteis:"
echo "   docker logs id_management_postgres  # Ver logs"
echo "   docker-compose down                 # Parar PostgreSQL"
echo "   docker-compose up -d                # Iniciar PostgreSQL"
