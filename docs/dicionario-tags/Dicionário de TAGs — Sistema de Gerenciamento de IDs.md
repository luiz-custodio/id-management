# Dicionário de TAGs — Sistema de Gerenciamento de IDs

*Guia prático e didático para padronizar nomes de arquivos e pastas.*

## 1) Visão geral

- **TAG** = código curto no começo do **nome do arquivo** (e no `id_item`) que identifica o tipo do documento.
- Use nomes de **pastas** legíveis para humanos (com espaços/acentos), e **IDs** técnicos sem espaços.
- Formato geral de arquivo (quando mensal): `TAG-AAAA-MM[ - Descritivo].ext`  
- O sufixo humano é opcional: adicione após ` - ` sem quebrar a validação.

## 2) Regras comuns

- Pastas de Empresa/Unidade: `{SIGLA} - {id_empresa} / {NOME} - {id_unidade}` (ex.: `CEOLIN - 0001 / Matriz - 001`).
- **Notas de Energia** (`NE-CP` / `NE-LP`): ficam **na MESMA pasta** `Notas de Energia/`.
- **CCEE**: cada **tipo/subcódigo** (ex.: `CFZ003`) tem sua **própria pasta** dentro de `CCEE - DRI/`.

### Exemplos de caminhos

```
/dados/empresas/CEOLIN - 0001/Matriz - 001/
  Faturas/FAT-2025-01.pdf
  Notas de Energia/NE-CP-2025-02.pdf
  Documentos do Cliente/DOC-ADT-2025-03-18.pdf
  CCEE - DRI/CFZ003/CCEE-CFZ003-2025-04.pdf
```

## 3) Tabela principal de TAGs

| TAG (tipo) | O que é | ID base / Padrão | Pasta padrão | Exemplos |
|---|---|---|---|---|
| **FAT** | Fatura mensal | `FAT-AAAA-MM` | `Faturas/` | `FAT-2025-01.pdf` |
| **NE-CP** | Nota de Energia (Curto Prazo) | `NE-CP-AAAA-MM` | `Notas de Energia/` | `NE-CP-2025-02.pdf` |
| **NE-LP** | Nota de Energia (Longo Prazo) | `NE-LP-AAAA-MM` | `Notas de Energia/` | `NE-LP-2025-02.pdf` |
| **REL** | Relatório / Resultado | `REL-AAAA-MM` | `Relatórios e Resultados/` | `REL-2025-01.pdf` |
| **EST** | Estudo / Análise | `EST-AAAA-MM` | `Estudos e Análises/` | `EST-2025-02.pdf` |
| **DOC-\<SUB\>** | Documentos do Cliente | ver subtipos abaixo | `Documentos do Cliente/` | `DOC-CTR-2025.pdf`, `DOC-ADT-2025-03-18.pdf` |
| **CCEE-`<COD><SUB>`** | Relatórios CCEE com subcódigo | `CCEE-<COD><SUB>-AAAA-MM[-Vn][-X]` | `CCEE - DRI/<COD><SUB>/` | `CCEE-CFZ003-2025-04.pdf` |

> `AAAA-MM` = ano-mês (ex.: `2025-08`). `-Vn` = versão (`-V2` = revisado 2). `-X` = letra opcional (ex.: `-C` de corrigido/consolidado).  
> Pode adicionar sufixo humano: `REL-2025-01 - Consolidado.pdf`.

## 4) Subtipos de DOC (DOC-\<SUB\>)

| SUB | Significa | Padrão sugerido | Exemplos |
|---|---|---|---|
| **CTR** | Contrato | `DOC-CTR-AAAA` | `DOC-CTR-2025.pdf` |
| **ADT** | Aditivo | `DOC-ADT-AAAA-MM-DD` | `DOC-ADT-2025-03-18.pdf` |
| **CAD** | Cadastro | `DOC-CAD-AAAA` | `DOC-CAD-2025.pdf` |
| **PRO** | Procuração | `DOC-PRO-AAAA[-Vn]` | `DOC-PRO-2025-V2.docx` |
| **CAR** | Carta de Adesão | `DOC-CAR-AAAA` | `DOC-CAR-2025.pdf` |
| **COM** | Comunicado/Ofício | `DOC-COM-AAAA-MM[-NNN]` | `DOC-COM-2025-08-001.pdf` |
| **LIC** | Licença/Autorização | `DOC-LIC-AAAA[-MM[-DD]]` | `DOC-LIC-2025-06.pdf` |

Regras rápidas (DOC): jurídico → prefira data completa; vários no mês → `-001`, `-002`; revisões → `-V1`, `-V2`…

## 5) CCEE com subcódigo (cada tipo em uma pasta)

- **TAG do tipo:** `CCEE-<COD><SUB>`, onde `<COD>` ∈ {CFZ, GFN, LFN, LFRCA, LFRES, PEN, SUM} e `<SUB>` são **3 dígitos** (`001`, `002`, `003`…).
- **Nome do arquivo:** `CCEE-<COD><SUB>-AAAA-MM[-Vn][-X][ - Descritivo].pdf`

### Exemplos e pastas

```
CCEE - DRI/CFZ003/CCEE-CFZ003-2025-04.pdf
CCEE - DRI/CFZ004/CCEE-CFZ004-2025-04.pdf
CCEE - DRI/GFN001/CCEE-GFN001-2025-04-V2.pdf
CCEE - DRI/SUM001/CCEE-SUM001-2025-04-C.pdf
```

## 6) Regex de validação (opcional)

Use estas expressões para validar nomes (aceitam extensões comuns e, quando indicado, sufixo humano).

```
FAT  : ^FAT-\d{4}-(0[1-9]|1[0-2])\.(pdf|xlsx|csv)$
NE   : ^NE-(CP|LP)-\d{4}-(0[1-9]|1[0-2])\.(pdf|xlsx|csv)$
REL  : ^REL-\d{4}-(0[1-9]|1[0-2])\.(pdf|xlsx|csv)$
EST  : ^EST-\d{4}-(0[1-9]|1[0-2])\.(pdf|xlsx|csv)$
DOC  : ^DOC-[A-Z]{3}-.*\.(pdf|docx|xlsx)$
CCEE : ^CCEE-(?:CFZ|GFN|LFN|LFRCA|LFRES|PEN|SUM)\d{3}-\d{4}-(0[1-9]|1[0-2])(-V\d+)?(-[A-Z])?( - .+)?\.(pdf|xlsx|csv)$
```

## 7) Boas práticas

- Arquivos sempre começam pela **TAG**.
- Pastas de Empresa/Unidade: “**Nome - ID**” (claro para humanos, estável para a máquina).
- **NE-CP** e **NE-LP** juntos em `Notas de Energia/`.
- **CCEE**: uma pasta por **tipo/subcódigo** (ex.: `CFZ003/`).
- Para **DOC** jurídico, use **data completa** no ID.
- **Revisões**: use `-Vn`; **múltiplos no mês**: `-NNN`.
- Sufixo humano opcional: `- Descritivo` ao final do nome.
