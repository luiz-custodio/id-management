# Script PowerShell para iniciar o Sistema de Gerenciamento de IDs
# Este script inicia tanto o backend (FastAPI) quanto o frontend (React+Vite)

Write-Host "🚀 Iniciando Sistema de Gerenciamento de IDs" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green

# Verificar se estamos no diretório correto
if (-not (Test-Path "backend") -or -not (Test-Path "frontend")) {
    Write-Host "❌ Erro: Execute este script a partir do diretório raiz do projeto" -ForegroundColor Red
    exit 1
}

# Configurar ambiente Python
Write-Host "📦 Configurando ambiente Python..." -ForegroundColor Yellow
Set-Location backend

# Verificar se o ambiente virtual existe
if (-not (Test-Path "../.venv")) {
    Write-Host "🔧 Criando ambiente virtual..." -ForegroundColor Yellow
    python -m venv ../.venv
}

# Ativar ambiente virtual
& "../.venv/Scripts/Activate.ps1"

# Instalar dependências do backend se necessário
if (-not (Test-Path "../.venv/Lib/site-packages/fastapi")) {
    Write-Host "📥 Instalando dependências do backend..." -ForegroundColor Yellow
    if (Test-Path "requirements.txt") {
        pip install -r requirements.txt
    } else {
        pip install fastapi uvicorn sqlalchemy pydantic
    }
}

# Iniciar backend em background
Write-Host "🖥️  Iniciando backend (FastAPI)..." -ForegroundColor Yellow
$backendJob = Start-Job -ScriptBlock {
    Set-Location $args[0]
    & "$args[1]" -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
} -ArgumentList (Get-Location), (Get-Command python).Source

Set-Location ../frontend

# Instalar dependências do frontend se necessário
if (-not (Test-Path "node_modules")) {
    Write-Host "📥 Instalando dependências do frontend..." -ForegroundColor Yellow
    npm install --legacy-peer-deps
}

# Iniciar frontend em background
Write-Host "🌐 Iniciando frontend (React+Vite)..." -ForegroundColor Yellow
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $args[0]
    npm run dev
} -ArgumentList (Get-Location)

Set-Location ..

Write-Host ""
Write-Host "✅ Sistema iniciado com sucesso!" -ForegroundColor Green
Write-Host "📊 Backend (API): http://localhost:8000" -ForegroundColor Cyan
Write-Host "🌐 Frontend (UI): http://localhost:5173" -ForegroundColor Cyan
Write-Host "📖 Documentação API: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  Para parar os serviços, pressione Ctrl+C" -ForegroundColor Yellow

# Aguardar sinal de interrupção
try {
    while ($true) {
        Start-Sleep -Seconds 1
        
        # Verificar se os jobs ainda estão rodando
        if ($backendJob.State -eq "Failed") {
            Write-Host "❌ Backend falhou! Verifique os logs." -ForegroundColor Red
            Receive-Job $backendJob
        }
        if ($frontendJob.State -eq "Failed") {
            Write-Host "❌ Frontend falhou! Verifique os logs." -ForegroundColor Red
            Receive-Job $frontendJob
        }
    }
}
finally {
    Write-Host "🛑 Parando serviços..." -ForegroundColor Yellow
    Stop-Job $backendJob, $frontendJob
    Remove-Job $backendJob, $frontendJob
}
