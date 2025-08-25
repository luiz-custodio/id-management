# Script de teste em rede - Versao simplificada
# Inicia sistema ID Management para testes via rede

Write-Host "Iniciando sistema ID-Management em rede..." -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green

# Obter IP atual
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like "192.168.*"}).IPAddress | Select-Object -First 1
if (-not $ip) { $ip = "localhost" }

Write-Host "SEU IP: $ip" -ForegroundColor Yellow
Write-Host ""

# Parar servicos anteriores
Write-Host "Parando servicos anteriores..." -ForegroundColor Blue
docker-compose down 2>$null | Out-Null
Stop-Process -Name "uvicorn" -Force -ErrorAction SilentlyContinue
Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue

# Iniciar PostgreSQL
Write-Host "Iniciando PostgreSQL..." -ForegroundColor Blue
docker-compose up -d

# Aguardar PostgreSQL
Write-Host "Aguardando PostgreSQL..." -ForegroundColor Yellow
Start-Sleep 8

# Verificar se PostgreSQL está rodando
$pgTest = docker exec id_management_postgres pg_isready -U id_user -d id_management 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "PostgreSQL OK!" -ForegroundColor Green
} else {
    Write-Host "PostgreSQL com problemas - mas continuando..." -ForegroundColor Yellow
}

# Configurar ambiente
$env:DATABASE_URL = "postgresql://id_user:id_secure_2025@localhost:5432/id_management"

# Iniciar Backend
Write-Host "Iniciando Backend..." -ForegroundColor Blue
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$PWD\backend'; `$env:DATABASE_URL='postgresql://id_user:id_secure_2025@localhost:5432/id_management'; uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
) -WindowStyle Normal

Start-Sleep 5

# Iniciar Frontend
Write-Host "Iniciando Frontend..." -ForegroundColor Blue
Start-Process powershell -ArgumentList @(
    "-NoExit", 
    "-Command",
    "cd '$PWD\frontend'; npm run dev"
) -WindowStyle Normal

Start-Sleep 8

Write-Host ""
Write-Host "SISTEMA RODANDO!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "ACESSOS PARA OUTROS PCs:" -ForegroundColor Cyan
Write-Host "Sistema Completo: http://$ip:5173" -ForegroundColor White
Write-Host "API Backend: http://$ip:8000" -ForegroundColor White  
Write-Host "Documentacao: http://$ip:8000/docs" -ForegroundColor White
Write-Host "Status da API: http://$ip:8000/health" -ForegroundColor White
Write-Host "Info do Banco: http://$ip:8000/database-info" -ForegroundColor White
Write-Host ""

Write-Host "TESTES NO OUTRO PC:" -ForegroundColor Yellow
Write-Host "1. Abra: http://$ip:5173" -ForegroundColor White
Write-Host "2. Teste: http://$ip:8000/docs" -ForegroundColor White
Write-Host "3. Crie uma empresa via interface" -ForegroundColor White
Write-Host "4. Veja dados sincronizados!" -ForegroundColor White
Write-Host ""

Write-Host "PARA PARAR:" -ForegroundColor Magenta
Write-Host "- Feche os terminais que abriram" -ForegroundColor White
Write-Host "- Ou execute: docker-compose down" -ForegroundColor White
Write-Host ""

# Abrir pagina de teste automaticamente
Write-Host "Abrindo pagina de teste..." -ForegroundColor Green
Start-Process "http://$ip:8000/docs"

Write-Host "Pressione ENTER para finalizar..."
Read-Host
