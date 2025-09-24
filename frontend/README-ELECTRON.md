# Sistema de Gerenciamento de IDs – Electron

Aplicativo desktop (Windows) baseado em Electron, empacotado a partir do frontend React.

## Comandos

Desenvolvimento:

```
npm run electron:dev     # Vite + Electron com hot reload
```

Builds:

```
npm run build:electron   # Build do React (pré-requisito dos comandos abaixo)
npm run electron:pack    # Empacota executável (pasta dist-electron)
npm run electron:dist    # Gera instalador (NSIS) com suporte a auto-update
npm run electron:publish # Publica instalador no GitHub Releases
```

Executar app empacotado:

```
npm run electron         # Abre o app usando os arquivos buildados
```

## Configuração de Servidor

O app consulta o backend definido em `%USERPROFILE%\\.id-management-config.json`:

```
{ "host": "SEU_IP_DO_SERVIDOR", "port": 8000, "protocol": "http" }
```

Se o arquivo não existir, usa o padrão definido no `electron/main.cjs`.

No modo web (sem Electron), o cliente usa `VITE_API_BASE` (ou `VITE_API_URL`) do `.env`.

## Estrutura de Build

```
dist-electron/
  └─ ID Management System-win32-x64/
      ├─ ID Management System.exe
      └─ resources/app.asar

dist/
  ├─ index.html
  └─ assets/
```

## Auto-Update

- Habilitado quando instalado via setup gerado por `electron-builder`.
- O instalador e os metadados (`latest.yml`, `.blockmap`) são publicados no GitHub Releases.
- Durante a execução, o app verifica novas versões e oferece reinício para aplicar a atualização.

## Arquivos Importantes

- `electron/main.cjs`: processo principal do Electron (menu, janela, updater)
- `electron/preload.cjs`: bridge segura (APIs expostas em `window.electronAPI`)
- `src/lib/api.ts`: cliente HTTP com auto-resolução da base (Electron ou web)

