# Guia de Release

Este guia mostra como criar uma nova versão e publicar no GitHub automaticamente.

## Como usar

```
# 1. Fazer commit das mudanças
git add .
git commit -m "chore(release): v0.4.1"

# 2. Criar e enviar tag (formato vX.Y.Z)
git tag v0.4.1
git push origin main
git push origin v0.4.1

# 3. GitHub Actions
#    - builda frontend + electron
#    - empacota e faz upload do ZIP
#    - cria release com notas
```

## Versionamento

- v0.4.1 – Ajustes de rede (config por arquivo), correções Electron
- v0.4.0 – Primeira versão desktop (Electron)

## Artefatos gerados

- `ID-Management-Cliente-Windows.zip` – App para distribuir aos clientes
