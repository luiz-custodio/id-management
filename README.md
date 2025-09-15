# Sistema de Gerenciamento de IDs

Sistema para organização automática de documentos com numeração padronizada e estrutura de pastas espelho.

[![FastAPI](https://img.shields.io/badge/FastAPI-0.116.1-00a86b?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19.1.1-61dafb?style=flat&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-3178c6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.17-38b2ac?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Docker-336791?style=flat&logo=postgresql)](https://www.postgresql.org/)

---

## Visão Geral

- Frontend: React 19 + TypeScript + Vite + shadcn/ui + Tailwind
- Backend: FastAPI + SQLAlchemy
- Banco: PostgreSQL via Docker (padrão) com fallback para SQLite
- Desktop: Electron (auto-update via GitHub Releases)

Estrutura hierárquica: Empresas → Unidades → Itens, com espelho no sistema de arquivos.

---

## Estrutura do Repositório

- `backend/`: API FastAPI, modelos, rotas, integração Docker/PostgreSQL
- `frontend/`: App React (web) e Electron
- `database/`: `init.sql` de bootstrap do PostgreSQL
- `docs/`: guias e materiais de apoio
- `scripts/`: scripts PowerShell e Python de automação
- `.github/workflows/`: CI para build e release do Electron

---

## Requisitos

- Docker Desktop (para PostgreSQL em rede/local)
- Python 3.11+
- Node.js 18+

---

## Início Rápido (Windows)

1) Instalar dependências:

```
cd backend && pip install -r requirements.txt
cd ../frontend && npm install
```

2) Subir PostgreSQL e API rapidamente:

```
pwsh scripts/start-postgres-server.ps1
```

3) Rodar o frontend (web):

```
cd frontend
npm run dev
```

- Web: http://localhost:5173
- API docs: http://SEU_IP:8000/docs

Para desenvolvimento com Electron: `npm run electron:dev` dentro de `frontend/`.

---

## Configuração

Variáveis de ambiente são lidas de `/.env` e `backend/.env` (o segundo sobrepõe o primeiro). Exemplos:

Backend (`backend/.env`):

```
# PostgreSQL local via Docker (padrão recomendado)
DATABASE_URL=postgresql://id_user:id_secure_2025@localhost:5432/id_management

# Alternativa: PostgreSQL em outro host (rede)
# POSTGRES_HOST=192.168.1.100
# POSTGRES_PORT=5432
# POSTGRES_DB=id_management
# POSTGRES_USER=id_user
# POSTGRES_PASSWORD=id_secure_2025

# Fallback: SQLite local
# DATABASE_URL=sqlite:///./ids.db

# Diretório base para espelho de pastas
BASE_DIR=C:\\ID_Management\\Empresas
```

Frontend (web) (`frontend/.env`):

```
VITE_API_BASE=http://localhost:8000
```

Electron (desktop): defina o servidor no arquivo `%USERPROFILE%\\.id-management-config.json`:

```
{ "host": "SEU_IP", "port": 8000, "protocol": "http" }
```

Se o arquivo não existir, o app usa o padrão definido no `electron/main.cjs`.

---

## Banco de Dados

- `docker-compose.yml` sobe PostgreSQL 14 com volume persistente e porta 5432 exposta na rede (0.0.0.0).
- A API tenta nesta ordem: `DATABASE_URL` PostgreSQL → variáveis POSTGRES_* → SQLite (`sqlite:///./ids.db`).
- Endpoints úteis:
  - `GET /database/info`: informações sobre o banco ativo
  - `POST /database/postgres/start`: inicia o container via Docker
  - `POST /database/postgres/stop`: para o container
  - `GET /database/postgres/status`: status e saúde

---

## Organização de Arquivos

Subpastas padrão por unidade (espelho):

- 01 Relatórios e Resultados (REL, RES)
- 02 Faturas (FAT)
- 03 Notas de Energia (NE-CP, NE-LP, NE-CPC, NE-LPC, NE-VE)
- 04 CCEE - DRI (subpastas por código: CFZ003, GFN001, BOLETOCA, ND, ...)
- 05 BM Energia (DOC-CTR, DOC-PRO, MIN-*)
- 06 Documentos do Cliente (DOC-CAD, DOC-ADT, DOC-COM, DOC-LIC, DOC-CAR)
- 07 Projetos
- 08 Comercializadoras
- 09 CCEE - Modelagem
- 10 Distribuidora
- 11 ICMS (ICMS-DEVEC, ICMS-LDO, ICMS-REC)
- 12 Estudos e Análises (EST)
- 13 Miscelânea

Consulte `ESTRUTURA-PASTAS-ATUALIZADA.md` para exemplos de nomes e regras.

---

## Desenvolvimento

- Backend: `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`
- Frontend (web): `npm run dev`
- Electron (dev): `npm run electron:dev`

Builds Electron:

- `npm run electron:pack` (pasta executável)
- `npm run electron:dist` (instalador com auto-update)

---

## Release

GitHub Actions cria releases a partir de tags `vX.Y.Z`, empacota Electron e publica artefatos (instalador, latest.yml, blockmap). Veja `.github/workflows/build-and-release.yml` e `RELEASE.md`.

---

## Dicas e Solução de Problemas

- Porta 5432 ocupada: pare outro Postgres, ou mude a porta do compose.
- Firewall do Windows: liberar 5432 (PostgreSQL) e 8000 (API) no servidor.
- Sem Docker: o backend usa SQLite automaticamente (modo fallback).

