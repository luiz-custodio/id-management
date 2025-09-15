# ID Management System – Electron App

## Comandos

```
npm run electron:dev   # Dev (Vite + Electron)
npm run electron:pack  # Empacota (pasta dist-electron)
npm run electron:dist  # Instalador (NSIS)
npm run electron       # Executa app buildado
```

## Configuração de Servidor

- Desktop: `%USERPROFILE%\\.id-management-config.json`

```
{ "host": "SEU_IP_DO_SERVIDOR", "port": 8000, "protocol": "http" }
```

- Web: `.env` com `VITE_API_BASE=http://localhost:8000`.

## Estrutura

- `electron/main.cjs`: janela, menu, updater, IPC
- `electron/preload.cjs`: `window.electronAPI` (bridge segura)
- `dist-electron/ID Management System-win32-x64/ID Management System.exe`: binário

## Auto-Updates

Requer instalador gerado por `electron-builder`. Publicação automática no GitHub Releases via CI.

