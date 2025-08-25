# =============================================================================
# 🛠️ SCRIPT SIMPLES - APENAS INICIA OS SERVIÇOS
# =============================================================================
# Para usar quando você já testou tudo e só quer ligar o sistema

Write-Host "🚀 Iniciando sistema ID-Management..." -ForegroundColor Green

# Obter IP
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like "192.168.*"}).IPAddress | Select-Object -First 1

# PostgreSQL
Write-Host "🐳 PostgreSQL..." -ForegroundColor Blue
docker-compose up -d

# Backend
Write-Host "🔧 Backend..." -ForegroundColor Blue
Start-Process powershell -ArgumentList "-Command", "cd backend; `$env:DATABASE_URL='postgresql://id_user:id_secure_2025@localhost:5432/id_management'; uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload" -WindowStyle Minimized

# Frontend  
Write-Host "🎨 Frontend..." -ForegroundColor Blue
Start-Process powershell -ArgumentList "-Command", "cd frontend; npm run dev" -WindowStyle Minimized

Start-Sleep 5

Write-Host ""
Write-Host "✅ Sistema rodando em: http://$ip:5173" -ForegroundColor Green
Write-Host "📚 API docs em: http://$ip:8000/docs" -ForegroundColor Cyan
