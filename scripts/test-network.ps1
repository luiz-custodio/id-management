# =============================================================================
# 🚀 SCRIPT DE TESTE EM REDE - ID MANAGEMENT SYSTEM
# =============================================================================
# Execute este script para testar o sistema completo via rede
# Outros PCs podem acessar sem instalar nada!

param(
    [switch]$SkipInstall,
    [switch]$QuickStart
)

function Write-ColorText {
    param($Text, $Color = "White")
    Write-Host $Text -ForegroundColor $Color
}

function Get-LocalIP {
    $ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
        $_.IPAddress -like "192.168.*" -and 
        $_.InterfaceAlias -like "*Wi-Fi*"
    }).IPAddress
    
    if (-not $ip) {
        $ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
            $_.IPAddress -like "192.168.*"
        }).IPAddress | Select-Object -First 1
    }
    
    if (-not $ip) {
        $ip = "localhost"
    }
    
    return $ip
}

Write-ColorText "🚀 INICIANDO SISTEMA ID-MANAGEMENT EM REDE" Green
Write-ColorText "=" * 60 Green

# Obter IP atual
$ip = Get-LocalIP
Write-ColorText "📍 SEU IP: $ip" Yellow
Write-ColorText ""

# Verificar se Docker está rodando
try {
    docker ps | Out-Null
    Write-ColorText "✅ Docker está rodando" Green
} catch {
    Write-ColorText "❌ Docker não está rodando. Inicie o Docker Desktop primeiro!" Red
    exit 1
}

# Parar serviços anteriores (se existirem)
Write-ColorText "🛑 Parando serviços anteriores..." Blue
docker-compose down 2>$null | Out-Null
Stop-Process -Name "uvicorn" -Force -ErrorAction SilentlyContinue
Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue

# Iniciar PostgreSQL
Write-ColorText "🐳 Iniciando PostgreSQL..." Blue
docker-compose up -d

# Aguardar PostgreSQL ficar pronto
Write-ColorText "⏳ Aguardando PostgreSQL ficar disponível..." Yellow
$timeout = 60
$count = 0

do {
    Start-Sleep -Seconds 2
    $status = docker exec id_management_postgres pg_isready -U id_user -d id_management 2>$null
    $count += 2
    
    if ($count -ge $timeout) {
        Write-ColorText "❌ Timeout aguardando PostgreSQL" Red
        exit 1
    }
    Write-Host "." -NoNewline
} while ($LASTEXITCODE -ne 0)

Write-ColorText ""
Write-ColorText "✅ PostgreSQL está rodando!" Green

# Configurar variável de ambiente para PostgreSQL
$env:DATABASE_URL = "postgresql://id_user:id_secure_2025@localhost:5432/id_management"

# Iniciar Backend
Write-ColorText "🔧 Iniciando Backend na rede..." Blue
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$PWD\backend'; `$env:DATABASE_URL='postgresql://id_user:id_secure_2025@localhost:5432/id_management'; uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
) -WindowStyle Normal

# Aguardar backend
Write-ColorText "⏳ Aguardando backend inicializar..." Yellow
Start-Sleep 5

# Testar se backend está respondendo
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method GET -TimeoutSec 10
    Write-ColorText "✅ Backend está respondendo!" Green
} catch {
    Write-ColorText "⚠️  Backend ainda carregando..." Yellow
}

# Iniciar Frontend
Write-ColorText "🎨 Iniciando Frontend na rede..." Blue
Start-Process powershell -ArgumentList @(
    "-NoExit", 
    "-Command",
    "cd '$PWD\frontend'; npm run dev"
) -WindowStyle Normal

# Aguardar frontend carregar
Write-ColorText "⏳ Aguardando frontend carregar..." Yellow
Start-Sleep 8

Write-ColorText ""
Write-ColorText "🎉 SISTEMA RODANDO EM REDE!" Green
Write-ColorText "=" * 60 Green
Write-ColorText ""

Write-ColorText "📱 ACESSOS PARA OUTROS PCs:" Cyan
Write-ColorText "🌐 Sistema Completo: http://$ip:5173" White
Write-ColorText "🔧 API Backend: http://$ip:8000" White  
Write-ColorText "📚 Documentação: http://$ip:8000/docs" White
Write-ColorText "❤️  Status da API: http://$ip:8000/health" White
Write-ColorText "💾 Info do Banco: http://$ip:8000/database-info" White
Write-ColorText ""

Write-ColorText "🧪 TESTES RÁPIDOS NO OUTRO PC:" Yellow
Write-ColorText "1. Abra no navegador: http://$ip:5173" White
Write-ColorText "2. Teste a API: http://$ip:8000/docs" White
Write-ColorText "3. Crie uma empresa via interface" White
Write-ColorText "4. Veja os dados sincronizados!" White
Write-ColorText ""

Write-ColorText "🛑 PARA PARAR O SISTEMA:" Magenta
Write-ColorText "• Feche os terminais que abriram" White
Write-ColorText "• Ou execute: docker-compose down" White
Write-ColorText ""

Write-ColorText "Pressione ENTER para continuar monitorando ou CTRL+C para sair..."
Read-Host

# Loop de monitoramento (opcional)
while ($true) {
    Clear-Host
    Write-ColorText "🔄 MONITORAMENTO DO SISTEMA" Green
    Write-ColorText "=" * 40 Green
    
    # Status do PostgreSQL
    $pgStatus = docker exec id_management_postgres pg_isready -U id_user -d id_management 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-ColorText "🟢 PostgreSQL: Online" Green
    } else {
        Write-ColorText "🔴 PostgreSQL: Offline" Red
    }
    
    # Status do Backend
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method GET -TimeoutSec 5
        Write-ColorText "🟢 Backend: Online" Green
    } catch {
        Write-ColorText "🔴 Backend: Offline" Red
    }
    
    # Status do Frontend
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5173" -Method GET -TimeoutSec 5
        Write-ColorText "🟢 Frontend: Online" Green
    } catch {
        Write-ColorText "🔴 Frontend: Offline" Red
    }
    
    Write-ColorText ""
    Write-ColorText "Sistema disponível em: http://$ip:5173" Cyan
    Write-ColorText "Pressione CTRL+C para parar o monitoramento"
    Write-ColorText ""
    
    Start-Sleep 10
}
