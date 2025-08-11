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
  - NE: `NE-CP-AAAA-MM` ou `NE-LP-AAAA-MM` (CP e LP na MESMA pasta)
  - REL: `REL-AAAA-MM`
  - EST: `EST-AAAA-MM`
  - DOC-<SUB>: SUB ∈ {CTR, ADT, CAD, PRO, CAR, COM, LIC}  
    exemplos: `DOC-CTR-2025`, `DOC-ADT-2025-03-18`, `DOC-COM-2025-08-001`, `DOC-PRO-2025-V2`
  - CCEE (tipos com subcódigo): `CCEE-<COD><SUB>-AAAA-MM[-Vn][-X]`
    - exemplos: `CCEE-CFZ003-2025-04`, `CCEE-GFN001-2025-04-V2`, `CCEE-SUM001-2025-04-C`

## Estrutura de pastas (espelho humano)
- Empresa: `{SIGLA} - {id_empresa}` (ex.: `CEOLIN - 0001`)
- Unidade: `{NOME} - {id_unidade}` (ex.: `Matriz - 001`)
- Subpastas padrão na unidade:
  - `Faturas/`
  - `Notas de Energia/` (CP e LP juntos)
  - `Relatórios e Resultados/`
  - `Estudos e Análises/`
  - `Documentos do Cliente/`
  - `CCEE - DRI/` com **uma pasta por tipo** (ex.: `CFZ003/`, `GFN001/`…)

## Validações (regex sugeridas)
- FAT: `^FAT-\d{4}-(0[1-9]|1[0-2])\.(pdf|xlsx|csv)$`
- NE: `^NE-(CP|LP)-\d{4}-(0[1-9]|1[0-2])\.(pdf|xlsx|csv)$`
- REL: `^REL-\d{4}-(0[1-9]|1[0-2])\.(pdf|xlsx|csv)$`
- EST: `^EST-\d{4}-(0[1-9]|1[0-2])\.(pdf|xlsx|csv)$`
- DOC: `^DOC-[A-Z]{3}-.+\.(pdf|docx|xlsx)$`
- CCEE (estrita): `^CCEE-(?:CFZ|GFN|LFN|LFRCA|LFRES|PEN|SUM)\d{3}-\d{4}-(0[1-9]|1[0-2])(-V\d+)?(-[A-Z])?( - .+)?\.(pdf|xlsx|csv)$`

## Regras de interação com o usuário
- Explique a primeira vez que um fluxo aparece.
- Antes de exclusões em cascata, peça confirmação e liste o impacto.
- Se houver ambiguidade, proponha um padrão com exemplos e confirme.

## Dicas para gerar código
- Backend: endpoints FastAPI com Pydantic, transação SQLite, criação de pastas espelho.
- Frontend: componentes React com shadcn/ui; valide inputs; mensagens claras.
- Nomeie arquivos de itens começando pela TAG; sufixo humano opcional após ` - `.
