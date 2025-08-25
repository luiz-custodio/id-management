@echo off
REM Script de inicialização - PostgreSQL via Docker (Windows)
REM Facilita o uso do sistema com Docker

echo 🚀 ID Management - Iniciando PostgreSQL via Docker
echo ==================================================

REM Verifica se Docker está instalado
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker não encontrado. Instale o Docker Desktop primeiro.
    echo    Download: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

REM Verifica se Docker está rodando
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker não está rodando. Inicie o Docker Desktop primeiro.
    pause
    exit /b 1
)

REM Copia .env.docker para .env (configuração PostgreSQL)
if exist "backend\.env.docker" (
    copy "backend\.env.docker" "backend\.env" >nul
    echo ✅ Configuração PostgreSQL aplicada
) else (
    echo ⚠️  Arquivo .env.docker não encontrado
)

REM Inicia PostgreSQL via Docker Compose
echo 🐳 Iniciando PostgreSQL...
docker-compose up -d

REM Aguarda PostgreSQL ficar pronto
echo ⏳ Aguardando PostgreSQL ficar pronto...
for /l %%i in (1,1,60) do (
    docker exec id_management_postgres pg_isready -U id_user -d id_management >nul 2>&1
    if not errorlevel 1 (
        echo ✅ PostgreSQL pronto! (%%is^)
        goto :ready
    )
    timeout /t 1 /nobreak >nul
)

echo ❌ PostgreSQL não ficou pronto em 60 segundos
echo 📋 Verifique os logs: docker logs id_management_postgres
pause
exit /b 1

:ready
echo.
echo 🎉 PostgreSQL iniciado com sucesso!
echo 📋 Informações de conexão:
echo    Host: localhost
echo    Porta: 5432
echo    Banco: id_management
echo    Usuário: id_user
echo.
echo 🚀 Para iniciar a aplicação:
echo    cd backend ^&^& python -m uvicorn app.main:app --reload
echo.
echo 🔧 Comandos úteis:
echo    docker logs id_management_postgres  # Ver logs
echo    docker-compose down                 # Parar PostgreSQL
echo    docker-compose up -d                # Iniciar PostgreSQL
echo.
pause
