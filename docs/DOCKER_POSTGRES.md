# Guia PostgreSQL via Docker - ID Management

## Início Rápido

### Pré‑requisitos
- Docker Desktop instalado e rodando
- Python 3.11+ com pip
- Node.js 18+ (para frontend e Electron)

### 1) Instalar dependências

```
# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

### 2) Subir PostgreSQL via Docker

Windows (recomendado):

```
pwsh scripts/start-postgres-server.ps1
```

Manual (qualquer SO):

```
# Iniciar containers
docker-compose up -d

# Aguardar o banco ficar pronto
docker exec id_management_postgres pg_isready -U id_user -d id_management
```

Opcional: copie `backend/.env.docker` para `backend/.env` e ajuste conforme necessidade.

### 3) Migrar dados (se já usava SQLite)

```
python migrate_to_postgres.py
```

### 4) Iniciar aplicação

```
# Backend
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Frontend (novo terminal)
cd frontend
npm run dev
```

## Gerenciamento

### Endpoints de Controle
- `GET /database/info` – info sobre banco em uso
- `POST /database/postgres/start` – inicia PostgreSQL
- `POST /database/postgres/stop` – para PostgreSQL
- `GET /database/postgres/status` – status detalhado
- `GET /database/postgres/logs` – logs do container

### Comandos Docker úteis

```
# Status dos containers
docker-compose ps

# Logs do PostgreSQL
docker logs id_management_postgres

# Parar (preserva dados)
docker-compose down

# Parar e remover volumes (APAGA DADOS!)
docker-compose down -v

# Backup
docker exec id_management_postgres pg_dump -U id_user id_management > backup.sql

# Restore
docker exec -i id_management_postgres psql -U id_user id_management < backup.sql
```

## Configuração

PostgreSQL (recomendado):

```
DATABASE_URL=postgresql://id_user:id_secure_2025@localhost:5432/id_management
```

SQLite (fallback):

```
DATABASE_URL=sqlite:///./ids.db
```

## Distribuição em Rede

Servidor (seu PC):
1. `docker-compose up -d`
2. Liberar portas 5432 (PostgreSQL) e 8000 (API) no firewall
3. Descobrir o IP local (ex.: `ipconfig` no Windows)

Clientes:
- Use o app Electron e configure `%USERPROFILE%\.id-management-config.json`

```
{ "host": "SEU_IP_DO_SERVIDOR", "port": 8000, "protocol": "http" }
```

No `docker-compose.yml`, a porta está exposta em `0.0.0.0:5432:5432` (acesso pela rede).

## Segurança

- Trocar a senha padrão em produção (arquivo `docker-compose.yml`)
- Restringir acesso à porta 5432 (VPN, firewall, rede interna)
- Fazer backups periódicos

## Solução de Problemas

PostgreSQL não inicia:

```
docker info
docker logs id_management_postgres
docker-compose down && docker-compose up -d --force-recreate
```

Erro de conexão:

```
docker exec id_management_postgres pg_isready -U id_user -d id_management
```

Migração falhou:

```
# Voltar para SQLite
setx DATABASE_URL sqlite:///./ids.db
```

## Status das Funcionalidades

Preservadas:
- Drag & drop, detecção de tipos, espelho de pastas
- Sincronização bidirecional, CRUD, upload com preview

Melhorias com PostgreSQL:
- Conexões simultâneas, centralização de dados, observabilidade

