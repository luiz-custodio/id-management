# Configuração de Rede – ID Management

Este guia explica como expor a API e o banco PostgreSQL na rede local e conectar clientes.

## Servidor (onde roda o PostgreSQL)

1) Na pasta do projeto:

```
pwsh scripts/start-postgres-server.ps1
```

O script:
- Sobe o PostgreSQL (`docker-compose up -d`)
- Aguarda o banco ficar pronto
- Inicia o backend FastAPI em `0.0.0.0:8000`
- Mostra o IP do servidor e variáveis de conexão

2) Verifique:
- API: `http://SEU_IP:8000/docs`
- Database info: `http://SEU_IP:8000/database-info`

3) Firewall do Windows:
- Liberar portas 5432 (PostgreSQL) e 8000 (API).

## Clientes (outros PCs da rede)

1) Use o app Electron ou rode o frontend em modo web.

2) Configurar conexão com o servidor:

Electron (recomendado): arquivo `%USERPROFILE%\\.id-management-config.json`:

```
{ "host": "SEU_IP_DO_SERVIDOR", "port": 8000, "protocol": "http" }
```

Web: `frontend/.env` com a base da API (ex.: `VITE_API_BASE=http://SEU_IP:8000`).

3) Iniciar o cliente:

Web:

```
cd frontend
npm run dev
```

Electron (dev):

```
cd frontend
npm run electron:dev
```

## Comandos úteis

Servidor:

```
docker logs id_management_postgres
docker-compose ps
docker-compose down        # para (preserva dados)
```

Clientes:

```
curl http://SEU_IP:8000/database-info
```

## Solução de Problemas

- Não conecta no PostgreSQL: verifique `docker ps` no servidor, portas no firewall e IP correto.
- Frontend sem dados: valide `http://SEU_IP:8000/docs` e configuração de base da API.
- Porta ocupada: mude para `--port 8002` no Uvicorn.

