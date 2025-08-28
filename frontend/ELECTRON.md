# ID Management System - Electron App

## Comandos Disponíveis

### Desenvolvimento
```
npm run electron:dev     # Frontend + Electron em modo dev
npm run dev              # Apenas frontend (para web)
```

### Build e Distribuição
```
npm run build:electron   # Build completo (web + electron)
npm run electron:pack    # Empacota para seu sistema
npm run electron:dist    # Cria instalador
npm run electron:publish # Publica no GitHub Releases
```

### Produção
```
npm run electron         # Roda o app buildado
```

## Configuração do Servidor

Padrão local:
- URL: http://127.0.0.1:8000

Para clientes em rede, crie no Windows o arquivo:
`%USERPROFILE%\.id-management-config.json`

Conteúdo de exemplo:
```
{ "host": "SEU_IP_DO_SERVIDOR", "port": 8000, "protocol": "http" }
```

Substitua `SEU_IP_DO_SERVIDOR` pelo IP do servidor (ex.: 192.168.1.54).

## Estrutura de Build

```
dist-electron/           # Electron executável
└── ID Management System-win32-x64/
    ├── ID Management System.exe
    └── resources/app.asar

dist/                    # Frontend buildado
├── index.html
└── assets/
```

## Auto-Updates

O app verifica automaticamente por atualizações no GitHub Releases.

## Customização

- Ícones: pasta `build/`
- Configuração: `package.json` → `build`
- Menu/Janela: `electron/main.cjs`
