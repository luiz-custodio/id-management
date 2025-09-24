# Instruções do Projeto — Sistema de Gerenciamento de IDs

## Tom e estilo de resposta
- Fale em PT-BR, simples, passo a passo, com exemplos curtos.
- Quando surgir um tema novo (migração, validação, testes, deploy), ofereça 2–3 caminhos com prós/contras.
- Comente trechos importantes de código (PEP 8 / ESLint).

## Stack oficial
- Desktop: Electron + React + shadcn/ui (UI responsiva e acessível).
- Backend: Python (FastAPI preferencial), Pydantic nos modelos.
- Banco: SQLite (arquivo local).
- Tests: priorize exemplos práticos e pequenos testes unitários.

## Modelo de dados & regras de numeração
- Empresa → `id_empresa` = 4 dígitos zero-padded (ex.: 0001).
- Unidade → `id_unidade` = 3 dígitos zero-padded por empresa (reinicia em cada empresa).
- Item → `id_item` depende do tipo:
  - FAT: `FAT-AAAA-MM`
  - NE: `NE-CP-AAAA-MM`, `NE-LP-AAAA-MM` ou `NE-VE-AAAA-MM` (todas juntas na MESMA pasta)
  - REL: `REL-AAAA-MM`
  - EST: `EST-AAAA-MM`
  - DOC-<SUB>: SUB ∈ {CTR, ADT, CAD, PRO, CAR, COM, LIC}  
    exemplos: `DOC-CTR-2025`, `DOC-ADT-2025-03-18`, `DOC-COM-2025-08-001`, `DOC-PRO-2025-V2`
  - CCEE (tipos com subcódigo): `CCEE-<COD><SUB>-AAAA-MM[-Vn][-X]`
    - exemplos: `CCEE-CFZ003-2025-04`, `CCEE-GFN001-2025-04-V2`, `CCEE-SUM001-2025-04-C`

## Estrutura de pastas (espelho humano)
- Empresa: `{SIGLA} - {id_empresa}` (ex.: `DOAL - 0005`)
- Unidade: `{NOME} - {id_unidade}` (ex.: `Matriz - 001`)
- Subpastas padrão na unidade (com numeração sequencial):
  - `01 Relatórios e Resultados/`
  - `02 Faturas/`
  - `03 Notas de Energia/` (CP, LP e VE juntos)
  - `04 CCEE - DRI/` com **uma pasta por tipo** (ex.: `CFZ003/`, `GFN001/`…)
    - Códigos atuais: CFZ003, CFZ004, GFN001, LFN001, LFRCA001, LFRES001, PEN001, SUM001, BOLETOCA, ND
  - `05 BM Energia/`
  - `06 Documentos do Cliente/`
  - `07 Projetos/`
  - `08 Comercializadoras/`
  - `09 CCEE - Modelagem/`
  - `10 Distribuidora/`
  - `11 ICMS/`
  - `12 Estudos e Análises/`

## Validações (regex sugeridas)
- FAT: `^FAT-\d{4}-(0[1-9]|1[0-2])\.(pdf|xlsx|csv)$`
- NE: `^NE-(CP|LP|VE)-\d{4}-(0[1-9]|1[0-2])\.(pdf|xlsx|csv)$`
- REL: `^REL-\d{4}-(0[1-9]|1[0-2])\.(pdf|xlsx|csv)$`
- EST: `^EST-\d{4}-(0[1-9]|1[0-2])\.(pdf|xlsx|csv)$`
- DOC: `^DOC-[A-Z]{3}-.+\.(pdf|docx|xlsx)$`
- CCEE (estrita): `^CCEE-(?:CFZ|GFN|LFN|LFRCA|LFRES|PEN|SUM)\d{3}|BOLETOCA|ND)-\d{4}-(0[1-9]|1[0-2])(-V\d+)?(-[A-Z])?( - .+)?\.(pdf|xlsx|csv)$`

## Códigos CCEE - DRI (pasta 04)
- **Estrutura:** Uma pasta por código CCEE para organização específica
- **Códigos disponíveis:**
  - CFZ003, CFZ004: Cronogramas Físico-Financeiros
  - GFN001: Garantia Financeira
  - LFN001: Liquidação Financeira
  - LFRCA001: Liquidação Financeira RCA
  - LFRES001: Liquidação Financeira RES
  - PEN001: Penalidades
  - SUM001: Sumários
  - BOLETOCA: Boletim CCEE
  - ND: Notas de Débito
- **Nomenclatura:** CCEE-{CODIGO}-AAAA-MM[-Vn][-X][ - Descrição].ext
- **Versionamento:** Suporte a -V2, -V3... e complementos -C, -R, -A...

## Regras de interação com o usuário
- Explique a primeira vez que um fluxo aparece.
- Antes de exclusões em cascata, peça confirmação e liste o impacto.
- Se houver ambiguidade, proponha um padrão com exemplos e confirme.
- **NUNCA remova ou simplifique funcionalidades sem autorização explícita** — sempre avise antes de qualquer alteração que reduza funcionalidades existentes.

## Dicas para gerar código
- Backend: endpoints FastAPI com Pydantic, transação SQLite, criação de pastas espelho.
- Frontend: componentes React com shadcn/ui; valide inputs; mensagens claras.
- Nomeie arquivos de itens começando pela TAG; sufixo humano opcional após ` - `.
