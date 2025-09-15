# Estrutura de Pastas – ID Management

## Estrutura Hierárquica

```
cliente/
  {SIGLA_EMPRESA} - {ID_EMPRESA}/
    {NOME_UNIDADE} - {ID_UNIDADE}/
      01 Relatórios e Resultados/
      02 Faturas/
      03 Notas de Energia/
      04 CCEE - DRI/
      05 BM Energia/
      06 Documentos do Cliente/
      07 Projetos/
      08 Comercializadoras/
      09 CCEE - Modelagem/
      10 Distribuidora/
      11 ICMS/
      12 Estudos e Análises/
      13 Miscelânea/
```

## Exemplo – Empresa DOAL

```
cliente/
  DOAL - 0005/
    Matriz - 001/
      01 Relatórios e Resultados/
        REL-2025-08.pdf
        REL-2025-07.xlsx

      02 Faturas/
        FAT-2025-08.pdf
        FAT-2025-07.xlsx

      03 Notas de Energia/
        NE-CP-2025-08.pdf
        NE-LP-2025-08.pdf
        NE-CPC-2025-08.pdf
        NE-LPC-2025-07.xlsx

      04 CCEE - DRI/
        CFZ003/
          CCEE-CFZ003-2025-08.pdf
          CCEE-CFZ003-2025-07-V2.xlsx
        GFN001/
          CCEE-GFN001-2025-08.pdf
        BOLETOCA/
          CCEE-BOLETOCA-2025-08.pdf
        ND/
          CCEE-ND-2025-07.pdf

      05 BM Energia/
        DOC-CTR-2025.pdf
        DOC-PRO-2025-V2.pdf

      06 Documentos do Cliente/
        DOC-ADT-2025-03-18.docx
        DOC-CAD-2025.pdf
        DOC-COM-2025-08-001.pdf
        DOC-LIC-2025.pdf

      07 Projetos/
      08 Comercializadoras/
      09 CCEE - Modelagem/
      10 Distribuidora/
      11 ICMS/
        ICMS-DEVEC-2025-08.pdf
        ICMS-LDO-2025-08.pdf
      12 Estudos e Análises/
        EST-2025-08.pdf
      13 Miscelânea/

    Filial - 002/
      ...
```

## Sistema de Numeração

- Empresas: 4 dígitos zero‑padded (0001, 0002, ...)
- Unidades: 3 dígitos zero‑padded por empresa (001, 002, ...)

## Padrões de Nomes de Arquivos

- Faturas (FAT): `FAT-AAAA-MM.ext`
- Notas de Energia (NE): `NE-{CP|LP|CPC|LPC|VE}-AAAA-MM.ext`
- Relatórios (REL): `REL-AAAA-MM.ext`
- Estudos (EST): `EST-AAAA-MM.ext`
- Documentos do Cliente (DOC):
  - `DOC-CTR-AAAA.ext` (Contratos)
  - `DOC-ADT-AAAA-MM-DD.ext` (Aditivos)
  - `DOC-CAD-AAAA.ext` (Cadastros)
  - `DOC-PRO-AAAA-VX.ext` (Procurações)
  - `DOC-CAR-AAAA.ext` (Cartas)
  - `DOC-COM-AAAA-MM-XXX.ext` (Comunicados)
  - `DOC-LIC-AAAA.ext` (Licenças)
- CCEE – DRI: `CCEE-{CODIGO}-AAAA-MM[-Vn][-X].ext`
  - Códigos: CFZ003, CFZ004, GFN001, LFN001, LFRCA001, LFRES001, PEN001, SUM001, BOLETOCA, ND

## Regras Importantes

- Pastas são criadas automaticamente pelo sistema ao criar empresa/unidade.
- NE-CP, NE-LP, NE-CPC, NE-LPC e NE-VE ficam em “03 Notas de Energia”.
- CCEE organiza em subpastas por código (ex.: `04 CCEE - DRI/CFZ003`).
- ICMS possui pasta dedicada: “11 ICMS” (ICMS-DEVEC, ICMS-LDO, ICMS-REC).

