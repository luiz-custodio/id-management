# 🚀 Script de Release Manual

Este script cria uma nova versão e publica no GitHub automaticamente.

## Como usar:

```bash
# 1. Fazer commit das mudanças
git add .
git commit -m "feat: melhorias na interface e performance"

# 2. Criar e enviar tag
git tag v1.0.0
git push origin v1.0.0

# 3. GitHub Actions vai:
#    - Buildar automaticamente
#    - Criar release
#    - Anexar arquivos ZIP
```

## Versionamento:

- **v1.0.0** - Primeira versão estável
- **v1.0.1** - Correções de bugs
- **v1.1.0** - Novas funcionalidades
- **v2.0.0** - Mudanças importantes

## Arquivos gerados:

- `ID-Management-Cliente-Windows.zip` - App para distribuir
- `ID-Management-Servidor.zip` - Servidor completo
