# 📱 **ID Management System - Electron App**

## 🚀 **Comandos Disponíveis:**

### **Desenvolvimento:**
```bash
npm run electron:dev     # Frontend + Electron em modo dev
npm run dev             # Apenas frontend (para web)
```

### **Build e Distribuição:**
```bash
npm run build:electron  # Build completo (web + electron)
npm run electron:pack   # Empacota para seu sistema
npm run electron:dist   # Cria instalador
npm run electron:publish # Publica no GitHub Releases
```

### **Produção:**
```bash
npm run electron        # Roda o app buildado
```

## 🎯 **Configuração do Servidor:**

O app se conecta automaticamente ao servidor:
- **IP:** 192.168.1.52
- **Porta:** 8000
- **URL:** http://192.168.1.52:8000

Você pode alterar no menu: **Arquivo → Configurar Servidor**

## 📦 **Estrutura de Build:**

```
dist-electron/           # Electron executável
├── main.js             # Processo principal
├── preload.js          # Script de segurança
└── ...

dist/                   # Frontend buildado
├── index.html
├── assets/
└── ...
```

## 🔄 **Auto-Updates:**

O app verifica automaticamente por atualizações no GitHub Releases.

## 🎨 **Customização:**

- **Ícones:** pasta `build/`
- **Configuração:** `package.json` → `build`
- **Menu:** `electron/main.ts`
