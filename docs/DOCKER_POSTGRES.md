# 🐳 Guia PostgreSQL via Docker - ID Management

## 🚀 Início Rápido

### Pré-requisitos
- **Docker Desktop** instalado e rodando
- **Python 3.11+** com pip
- **Node.js 18+** para o frontend

### 1. Instalação das Dependências

```bash
# Backend - PostgreSQL support
cd backend
pip install -r requirements.txt

# Frontend (mantém igual)
cd ../frontend
npm install
```

### 2. Iniciando PostgreSQL via Docker

**Windows:**
```cmd
# Execute o script automático
start-postgres.bat
```

**Linux/Mac:**
```bash
# Execute o script automático
chmod +x start-postgres.sh
./start-postgres.sh
```

**Manual:**
```bash
# Copia configuração PostgreSQL
cp backend/.env.docker backend/.env

# Inicia PostgreSQL
docker-compose up -d

# Aguarda ficar pronto
docker exec id_management_postgres pg_isready -U id_user -d id_management
```

### 3. Migração de Dados (se você já tem dados SQLite)

```bash
# Primeiro inicie o PostgreSQL (passo 2)
# Depois execute a migração
python migrate_to_postgres.py
```

### 4. Iniciando a Aplicação

```bash
# Backend
cd backend
uvicorn app.main:app --reload

# Frontend (novo terminal)
cd frontend
npm run dev
```

## 🔧 Gerenciamento

### Endpoints de Controle
- `GET /database/info` - Info sobre banco em uso
- `POST /database/postgres/start` - Inicia PostgreSQL
- `POST /database/postgres/stop` - Para PostgreSQL 
- `GET /database/postgres/status` - Status detalhado
- `GET /database/postgres/logs` - Logs do container

### Comandos Docker Úteis

```bash
# Status dos containers
docker-compose ps

# Logs do PostgreSQL
docker logs id_management_postgres

# Parar PostgreSQL (preserva dados)
docker-compose down

# Parar e remover volumes (APAGA DADOS!)
docker-compose down -v

# Backup do banco
docker exec id_management_postgres pg_dump -U id_user id_management > backup.sql

# Restore do banco
docker exec -i id_management_postgres psql -U id_user id_management < backup.sql
```

## 🏗️ Arquitetura

### Compatibilidade Total
- ✅ **Todas as funcionalidades preservadas**
- ✅ **Mesma API** (endpoints iguais)
- ✅ **Mesmo frontend** (zero mudanças)
- ✅ **Fallback para SQLite** se PostgreSQL falhar

### Auto-Gerenciamento
- 🚀 **Startup automático** do PostgreSQL
- 🔄 **Reconexão automática** se container reiniciar
- 💾 **Dados persistentes** via Docker volumes
- 📊 **Monitoramento** via endpoints da API

### Configuração

**PostgreSQL (produção):**
```env
DATABASE_URL=postgresql://id_user:id_secure_2025@localhost:5432/id_management
```

**SQLite (desenvolvimento/fallback):**
```env
DATABASE_URL=sqlite:///./ids.db
```

## 🌐 Distribuição em Rede

### No Seu PC (Servidor)
1. Execute `start-postgres.bat`
2. Configure firewall para porta 5432
3. Anote seu IP: `ipconfig` (Windows) ou `ip addr` (Linux)

### Nos Outros PCs (Clientes)
1. Instale apenas o frontend Electron
2. Configure IP do servidor no `.env`:
```env
DATABASE_URL=postgresql://id_user:id_secure_2025@192.168.1.100:5432/id_management
```

### Configuração de Rede
```bash
# No docker-compose.yml, exponha para rede
services:
  postgres:
    ports:
      - "0.0.0.0:5432:5432"  # Aceita de qualquer IP
```

## 🔒 Segurança

### Produção
- Altere senha padrão no `docker-compose.yml`
- Configure SSL/TLS para conexões remotas
- Use VPN ou firewall para restringir acesso
- Backup regular automático

### Desenvolvimento
- Senha padrão OK para testes locais
- Docker isolado na rede local
- Logs disponíveis para debug

## 🐛 Solução de Problemas

### PostgreSQL não inicia
```bash
# Verifica se Docker está rodando
docker info

# Verifica logs
docker logs id_management_postgres

# Força rebuild
docker-compose down
docker-compose up -d --force-recreate
```

### Erro de conexão
```bash
# Testa conectividade
docker exec id_management_postgres pg_isready -U id_user -d id_management

# Verifica porta
netstat -an | grep 5432
```

### Migração falhou
```bash
# Volta para SQLite
cp backend/.env.sqlite backend/.env

# Reinicia aplicação
uvicorn app.main:app --reload
```

## ✅ Status das Funcionalidades

**Preservadas 100%:**
- ✅ Drag and drop de arquivos
- ✅ Detecção automática de tipos
- ✅ Estrutura de pastas espelho
- ✅ Validação de nomes
- ✅ Sincronização bidirecional
- ✅ CRUD de empresas/unidades/itens
- ✅ Upload com preview
- ✅ Sistema de IDs únicos

**Melhoradas:**
- 🚀 Performance em múltiplos usuários
- 💾 Backup centralizado
- 🔄 Sincronização automática
- 📊 Monitoramento de status
