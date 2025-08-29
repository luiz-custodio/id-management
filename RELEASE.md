# Guia de Release

Pipeline para criar uma nova versão, publicar no GitHub e habilitar auto‑update no cliente (electron‑updater).

## Como lançar uma versão

```
# 1) Commite suas mudanças
git add .
git commit -m "chore(release): v0.4.2"

# 2) Crie e envie a tag (formato vX.Y.Z)
git tag v0.4.2
git push origin main
git push origin v0.4.2

# 3) GitHub Actions dispara e faz:
#    - build do frontend (Vite)
#    - empacote do Electron (electron-builder, alvo NSIS)
#    - publicação no Release do GitHub (artefatos + latest.yml)
#    - auto-update passa a apontar para essa release
```

Observação: a versão embutida no app é sincronizada com a tag via `--config.extraMetadata.version` no electron‑builder. Então basta versionar por tag.

## Como o auto‑update funciona

- O app usa `electron-updater` e verifica atualizações ao abrir.
- Os artefatos publicados pelo `electron-builder` incluem `latest.yml` (metadados) e o instalador `.exe` com `.blockmap`.
- Ao detectar nova versão, o app baixa em background e, ao concluir, pergunta se deseja reiniciar para aplicar.

## Requisitos para publicar

- O GitHub Actions já injeta `GITHUB_TOKEN`. O workflow exporta como `GH_TOKEN` para o `electron-builder` publicar os artefatos.
- Para builds locais com publicação, defina `GH_TOKEN` no ambiente.

## Artefatos gerados

- `ID-Management-Setup-<versão>.exe` – Instalador do Windows (NSIS)
- `latest.yml` e `.blockmap` – Metadados para auto‑update
- (Opcional) ZIP de backup do diretório empacotado permanece no release

## Histórico de versões

- v0.4.2 – Habilitado auto‑update (electron‑updater + electron‑builder)
- v0.4.1 – Ajustes de rede (config por arquivo), correções Electron
- v0.4.0 – Primeira versão desktop (Electron)
