# Sistema de Gerenciamento de IDs - Electron

## Versão Desktop

Este aplicativo foi convertido para Electron para distribuição como aplicativo desktop.

### Configuração

- **Electron**: v37.3.1
- **API Backend**: 192.168.1.52:8000 (PostgreSQL)
- **Auto-detecção**: O app detecta automaticamente se está rodando no Electron e usa o servidor de rede

### Comandos Disponíveis

```bash
# Desenvolvimento (modo dev com hot reload)
npm run electron:dev

# Build de produção (gera pasta executável)
npm run electron:pack

# Build com instalador (se necessário)
npm run electron:dist
```

### Arquivos Importantes

- `electron/main.cjs` - Processo principal do Electron
- `electron/preload.cjs` - Script de contexto seguro
- `src/lib/api.ts` - Cliente API com detecção automática de ambiente

### Distribuição

O build fica em `dist-electron/ID Management System-win32-x64/`

Para executar: `"ID Management System.exe"`

### Funcionalidades

✅ Conexão automática com PostgreSQL (192.168.1.52:8000)
✅ Interface React completa
✅ Auto-update preparado (GitHub releases)
✅ Menu de aplicativo nativo
✅ Detecção automática de servidor

### Configuração de Rede

O aplicativo se conecta automaticamente ao servidor PostgreSQL em `192.168.1.52:8000`. 
Certifique-se de que:

1. O backend está rodando: `docker-compose up -d`
2. O PostgreSQL está acessível na rede
3. Não há bloqueios de firewall
