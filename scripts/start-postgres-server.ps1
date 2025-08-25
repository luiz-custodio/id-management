# Script para facilitar o início do PostgreSQL
# Execute no PowerShell como Administrador

# Remove container anterior (se existir)
docker stop id_management_postgres 2>$null
docker rm id_management_postgres 2>$null

# Inicia o PostgreSQL
Write-Host "🚀 Iniciando PostgreSQL para rede..." -ForegroundColor Green
docker-compose up -d

# Aguarda o banco estar pronto
Write-Host "⏳ Aguardando PostgreSQL ficar disponível..." -ForegroundColor Yellow
$timeout = 60
$count = 0

do {
    Start-Sleep -Seconds 2
    $status = docker exec id_management_postgres pg_isready -U id_user -d id_management 2>$null
    $count += 2
    
    if ($count -ge $timeout) {
        Write-Host "❌ Timeout aguardando PostgreSQL" -ForegroundColor Red
        exit 1
    }
} while ($LASTEXITCODE -ne 0)

Write-Host "✅ PostgreSQL está rodando!" -ForegroundColor Green

# Mostra informações da rede
$IP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like "192.168.*" -and $_.InterfaceAlias -like "*Wi-Fi*"}).IPAddress
if (-not $IP) {
    $IP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like "192.168.*"}).IPAddress | Select-Object -First 1
}

Write-Host "`n📋 INFORMAÇÕES PARA OUTROS PCs:" -ForegroundColor Cyan
Write-Host "IP deste servidor: $IP" -ForegroundColor White
Write-Host "PostgreSQL rodando na porta: 5432" -ForegroundColor White
Write-Host "Banco: id_management" -ForegroundColor White
Write-Host "Usuário: id_user" -ForegroundColor White
Write-Host "Senha: id_secure_2025" -ForegroundColor White

Write-Host "`n🔗 Configuração para clientes (.env):" -ForegroundColor Cyan
Write-Host "POSTGRES_HOST=$IP" -ForegroundColor Yellow
Write-Host "POSTGRES_PORT=5432" -ForegroundColor Yellow
Write-Host "POSTGRES_DB=id_management" -ForegroundColor Yellow
Write-Host "POSTGRES_USER=id_user" -ForegroundColor Yellow
Write-Host "POSTGRES_PASSWORD=id_secure_2025" -ForegroundColor Yellow

Write-Host "`n🌐 Iniciando backend na rede..." -ForegroundColor Green
$env:DATABASE_URL="postgresql://id_user:id_secure_2025@localhost:5432/id_management"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

Write-Host "🎯 Backend iniciado em: http://$IP:8000" -ForegroundColor Green
Write-Host "📚 API Docs: http://$IP:8000/docs" -ForegroundColor Green
Write-Host "🔍 Database Info: http://$IP:8000/database-info" -ForegroundColor Green

Write-Host "`n🛑 Para parar tudo: docker-compose down" -ForegroundColor Magenta
