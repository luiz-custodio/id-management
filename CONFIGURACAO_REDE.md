# ============================================================================
# 📋 GUIA DE CONFIGURAÇÃO - SISTEMA ID MANAGEMENT
# ============================================================================

## 🖥️ **SERVIDOR PRINCIPAL (onde o PostgreSQL roda)**

**IP deste servidor: 192.168.1.52**

### 1️⃣ **Passos no Servidor:**

```powershell
# 1. Navegue até a pasta do projeto
cd "C:\Users\luiz\Documents\projetos\id-management"

# 2. Execute o script automático (ou execute os comandos abaixo)
.\scripts\start-postgres-server.ps1

# OU execute manualmente:
docker-compose up -d  # Inicia PostgreSQL
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload  # Inicia API
```

### 2️⃣ **Verificar se está funcionando:**
- PostgreSQL: Acesse http://192.168.1.52:8000/database-info
- Frontend: Acesse http://192.168.1.52:5173 (se rodando)

---

## 💻 **CLIENTES (outros PCs da rede)**

### 1️⃣ **Instalar no PC Cliente:**

**Opção A - Clone Completo:**
```bash
git clone [URL_DO_REPOSITORIO]
cd id-management
npm install  # Para o frontend
pip install -r backend/requirements.txt  # Para o backend
```

**Opção B - Download Manual:**
- Baixe apenas as pastas: `frontend/`, `backend/app/`
- Instale dependências conforme Opção A

### 2️⃣ **Configurar Conexão com Servidor:**

Crie arquivo `.env` na pasta `backend/`:
```env
# CONECTA NO SERVIDOR POSTGRESQL
POSTGRES_HOST=192.168.1.52
POSTGRES_PORT=5432
POSTGRES_DB=id_management
POSTGRES_USER=id_user
POSTGRES_PASSWORD=id_secure_2025
```

### 3️⃣ **Iniciar Cliente:**
```bash
# Backend (conecta no servidor PostgreSQL)
cd backend
uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload

# Frontend (nova aba/terminal)
cd frontend
npm run dev
```

**Acessar em:** http://localhost:5173

---

## 🔥 **COMANDOS ÚTEIS**

### **No Servidor:**
```powershell
# Ver logs do PostgreSQL
docker logs id_management_postgres

# Parar tudo
docker-compose down

# Reiniciar PostgreSQL
docker-compose restart

# Backup do banco
docker exec id_management_postgres pg_dump -U id_user id_management > backup.sql
```

### **Em Qualquer PC:**
```bash
# Testar conexão com servidor
curl http://192.168.1.52:8000/database-info

# Ver logs do backend
# (logs aparecem no terminal onde rodou uvicorn)

# Mudar porta do cliente (se 8001 estiver ocupada)
uvicorn app.main:app --host 127.0.0.1 --port 8002 --reload
```

---

## 🛠️ **SOLUÇÃO DE PROBLEMAS**

### ❌ **"Não consegue conectar no PostgreSQL"**
1. Verifique se o servidor (192.168.1.52) está ligado
2. Verifique se o Docker está rodando no servidor
3. Teste: `docker ps` no servidor (deve mostrar container `id_management_postgres`)
4. Verifique firewall do Windows no servidor

### ❌ **"Frontend não carrega dados"**
1. Verifique se o backend está rodando: http://localhost:8001/docs
2. Verifique se backend conectou no PostgreSQL: http://localhost:8001/database-info
3. Verifique arquivo `.env` no cliente

### ❌ **"Erro de permissão/porta ocupada"**
1. Mude a porta: `--port 8002` (ou qualquer outra)
2. Verifique processos: `netstat -an | findstr :8001`

---

## ⚙️ **CONFIGURAÇÕES OPCIONAIS**

### **Mudar IP do Servidor:**
Se o IP do servidor mudar, atualize nos clientes:
```env
POSTGRES_HOST=NOVO_IP_AQUI
```

### **Usar SQLite como Backup:**
Se o PostgreSQL estiver indisponível, o sistema usa SQLite automaticamente.
Sem configuração necessária.

### **Frontend em Produção:**
```bash
cd frontend
npm run build
# Servir arquivos da pasta dist/ com qualquer servidor web
```

---

## 📱 **PRÓXIMOS PASSOS (após testes)**
1. ✅ **PostgreSQL em rede** - CONCLUÍDO
2. 🔄 **Testes em múltiplos PCs** - AGORA
3. 📦 **Empacotar com Electron** - DEPOIS
4. 🚀 **Instalador único** - FUTURO

---

**🆘 Problemas? Execute no servidor:**
```powershell
.\scripts\start-postgres-server.ps1
```
**Mostra todas as informações e IPs atualizados!**
