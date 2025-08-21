# Dicionário de TAGs — Sistema de Gerenciamento de IDs

Guia prático e didático para padronizar nomes de arquivos e pastas.

---

## 1) Visão geral
- **TAG** = código curto no começo do *nome do arquivo* (e no `id_item`) que identifica o tipo do documento.  
- Use nomes de pastas legíveis para humanos.  
- **Formato geral de arquivo**: `TAG-AAAA-MM[ - Descritivo].ext` (para documentos mensais).  
- O sufixo humano é opcional: adicione após ` - ` sem quebrar a validação.  

---

## 2) Regras comuns
- Pastas de Empresa/Unidade: `{SIGLA} - {id_empresa} / {NOME} - {id_unidade}`  
  - Ex.: `CEOLIN - 0001 / Matriz - 001`
- Notas de Energia (NE-CP / NE-LP): ficam na **MESMA** pasta “Notas de Energia/”.
- CCEE: cada tipo/subcódigo (ex.: CFZ003) tem sua própria pasta dentro de `CCEE - DRI/`.

**Exemplo de caminhos:**
/dados/empresas/CEOLIN - 0001/Matriz - 001/
Faturas/FAT-2025-01.pdf
Notas de Energia/NE-CP-2025-02.pdf
Documentos do Cliente/DOC-ADT-2025-03-18.pdf
CCEE - DRI/CFZ003/CCEE-CFZ003-2025-04.pdf

markdown
Copiar
Editar

---

## 3) Tabela principal de TAGs

| TAG (tipo)      | O que é                  | ID base / Padrão                          | Pasta padrão               | Exemplos                           |
|-----------------|--------------------------|--------------------------------------------|-----------------------------|------------------------------------|
| **FAT**         | Fatura mensal           | `FAT-AAAA-MM`                             | Faturas/                    | `FAT-2025-01.pdf`                  |
| **NE-CP**       | Nota de Energia (Curto Prazo) | `NE-CP-AAAA-MM`                    | Notas de Energia/           | `NE-CP-2025-02.pdf`                |
| **NE-LP**       | Nota de Energia (Longo Prazo) | `NE-LP-AAAA-MM`                    | Notas de Energia/           | `NE-LP-2025-02.pdf`                |
| **REL**         | Relatório               | `REL-AAAA-MM`                            | Relatórios e Resultados/    | `REL-2025-01.pdf`                  |
| **RES**         | Resumo                  | `RES-AAAA-MM`                            | Relatórios e Resultados/    | `RES-2025-01.pdf`                  |
| **EST**         | Estudo / Análise        | `EST-AAAA-MM`                            | Estudos e Análises/         | `EST-2025-02.pdf`                  |
| **DOC-<SUB>**   | Documentos do Cliente   | ver subtipos abaixo                       | Documentos do Cliente/      | `DOC-CTR-2025.pdf`                 |
| **CCEE-<COD>**  | Relatórios CCEE         | `CCEE-<COD>-AAAA-MM[-Vn][-X]`             | CCEE - DRI/<COD>/           | `CCEE-CFZ003-2025-04.pdf`          |

---

## 4) Subtipos de DOC (DOC-<SUB>)

| SUB   | Significa            | Padrão sugerido            | Exemplos                 |
|-------|----------------------|----------------------------|--------------------------|
| **CTR** | Contrato            | `DOC-CTR-AAAA`             | `DOC-CTR-2025.pdf`       |
| **ADT** | Aditivo             | `DOC-ADT-AAAA-MM-DD`       | `DOC-ADT-2025-03-18.pdf` |
| **CAD** | Cadastro            | `DOC-CAD-AAAA`             | `DOC-CAD-2025.pdf`       |
| **PRO** | Procuração          | `DOC-PRO-AAAA[-Vn]`        | `DOC-PRO-2025-V2.docx`   |
| **CAR** | Carta Denúncia      | `DOC-CAR-AAAA`             | `DOC-CAR-2025.pdf`       |
| **COM** | Comunicado/Ofício   | `DOC-COM-AAAA-MM[-NNN]`    | `DOC-COM-2025-08-001.pdf`|
| **LIC** | Licença/Autorização | `DOC-LIC-AAAA[-MM[-DD]]`   | `DOC-LIC-2025-06.pdf`    |

> **Regras rápidas (DOC):** jurídico → prefira data completa; vários no mês → -001, -002; revisões → -V1, -V2.

---

## 5) CCEE com subcódigo

- **TAG do tipo**: `CCEE-<COD>`  
- `<COD>` ∈ {CFZ, GFN, LFN, LFRCA, LFRES, PEN, SUM, BOLETOCA, ND}  
- Alguns têm sufixo numérico (003, 004, 001 etc.), mas **BOLETOCA** e **ND** não usam.

**Nome do arquivo:**  
`CCEE-<COD>-AAAA-MM[-Vn][-X][ - Descritivo].pdf`

**Exemplos e pastas:**
CCEE - DRI/CFZ003/CCEE-CFZ003-2025-04.pdf
CCEE - DRI/CFZ004/CCEE-CFZ004-2025-04.pdf
CCEE - DRI/GFN001/CCEE-GFN001-2025-04-V2.pdf
CCEE - DRI/LFN001/CCEE-LFN001-2025-05.pdf
CCEE - DRI/LFRCA001/CCEE-LFRCA001-2025-04.pdf
CCEE - DRI/LFRES001/CCEE-LFRES001-2025-04.pdf
CCEE - DRI/PEN001/CCEE-PEN001-2025-04.pdf
CCEE - DRI/SUM001/CCEE-SUM001-2025-04-C.pdf
CCEE - DRI/BOLETOCA/CCEE-BOLETOCA-2025-04.pdf
CCEE - DRI/ND/CCEE-ND-2025-04.pdf

yaml
Copiar
Editar

---

## 6) Regex de validação

FAT : ^FAT-\d{4}-(0[1-9]|1[0-2]).(pdf|xlsx|csv)$
NE : ^NE-(CP|LP)-\d{4}-(0[1-9]|1[0-2]).(pdf|xlsx|csv)$
REL : ^REL-\d{4}-(0[1-9]|1[0-2]).(pdf|xlsx|csv)$
RES : ^RES-\d{4}-(0[1-9]|1[0-2]).(pdf|xlsx|csv)$
EST : ^EST-\d{4}-(0[1-9]|1[0-2]).(pdf|xlsx|csv)$
DOC : ^DOC-[A-Z]{3}-.*.(pdf|docx|xlsx)$
CCEE : ^CCEE-(?:CFZ\d{3}|GFN\d{3}|LFN\d{3}|LFRCA\d{3}|LFRES\d{3}|PEN\d{3}|SUM\d{3}|BOLETOCA|ND)-\d{4}-(0[1-9]|1[0-2])(-V\d+)?(-[A-Z])?( - .+)?.(pdf|xlsx|csv)$

yaml
Copiar
Editar

---

## 7) Dicionário de siglas CCEE (<COD>)

| <COD>    | Significado breve         | Observações                                       |
|----------|---------------------------|---------------------------------------------------|
| **CFZ**  | Conta de Energia – Faixa Z | Subcódigo numérico de 3 dígitos por cliente.      |
| **GFN**  | Garantia Física – Energia Nova | Relatórios de lastro/garantia no ACL.        |
| **LFN**  | Lastro – Energia Nova     | Documentos de lastro.                             |
| **LFRCA**| Lastro – Reserva (CA)     | Categoria específica de reserva (CA).             |
| **LFRES**| Lastro – Reserva (ES)     | Categoria específica de reserva (ES).             |
| **PEN**  | Penalidades               | Autos, notificações e afins.                      |
| **SUM**  | Sumários/Resumo           | Consolidações mensais.                            |
| **BOLETOCA** | Boleto – Categoria CA | Não possui numeração de 3 dígitos. Pasta única.   |
| **ND**   | Nota de Débito            | Não possui numeração de 3 dígitos. Pasta única.   |

---

## 8) Boas práticas
- Arquivos sempre começam pela TAG.  
- Pastas de Empresa/Unidade: “Nome - ID”.  
- NE-CP e NE-LP juntos em “Notas de Energia/”.  
- CCEE: uma pasta por tipo/subcódigo (ex.: CFZ003/).  
- Para DOC jurídico, use data completa no ID.  
- Revisões: use `-Vn`; múltiplos no mês: `-NNN`.  
- Sufixo humano opcional: ` - Descritivo` no fim do nome.  