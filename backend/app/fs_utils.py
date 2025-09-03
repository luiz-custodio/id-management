import os
from pathlib import Path
from typing import List

SUBPASTAS_NUMERADAS = [
    "01 Relatórios e Resultados",
    "02 Faturas",
    "03 Notas de Energia",
    "04 CCEE - DRI",
    "05 BM Energia",
    "06 Documentos do Cliente",
    "07 Projetos",
    "08 Comercializadoras",
    "09 CCEE - Modelagem",
    "10 Distribuidora",
    "11 ICMS",
    "12 Estudos e Análises",
]

# Subcódigos CCEE usados na pasta 04 e também replicados na 09 (Modelagem)
# Mantidos conforme documentação oficial do projeto
CCEE_SUBCODIGOS = [
    "CFZ003", "CFZ004", "GFN001", "LFN001", "LFRCA001",
    "LFRES001", "PEN001", "SUM001", "BOLETOCA", "ND"
]

def montar_estrutura_unidade(base_dir: str, empresa_rotulo: str, unidade_rotulo: str) -> dict:
    base = Path(base_dir)
    emp_dir = base / empresa_rotulo
    uni_dir = emp_dir / unidade_rotulo
    criadas: List[str] = []
    existentes: List[str] = []

    for p in (emp_dir, uni_dir):
        if p.exists(): existentes.append(str(p))
        else:
            p.mkdir(parents=True, exist_ok=True); criadas.append(str(p))

    for nome in SUBPASTAS_NUMERADAS:
        p = uni_dir / nome
        if p.exists(): existentes.append(str(p))
        else:
            p.mkdir(parents=True, exist_ok=True); criadas.append(str(p))

    # Conforme documentação (docs/pastas.html), as subpastas por código CCEE
    # são criadas apenas dentro de "04 CCEE - DRI" (não em "09 CCEE - Modelagem").
    for cod in CCEE_SUBCODIGOS:
        p = (uni_dir / "04 CCEE - DRI") / cod
        if p.exists(): existentes.append(str(p))
        else:
            p.mkdir(parents=True, exist_ok=True); criadas.append(str(p))

    return {"criadas": criadas, "existentes": existentes, "raiz_unidade": str(uni_dir)}

def subpasta_por_tipo(tipo: str, ccee_cod: str | None = None) -> str:
    t = tipo.upper()
    if t == "FAT":
        return "02 Faturas"
    if t in {"NE-CP", "NE-LP", "NE-VE", "NE-CPC", "NE-LPC"}:
        return "03 Notas de Energia"
    if t == "REL":
        return "01 Relatórios e Resultados"
    if t == "EST":
        return "12 Estudos e Análises"
    if t in {"DEVEC", "LDO"}:
        return "11 ICMS"
    # DOC e MIN residem em "05 BM Energia" (ver docs/dicionario-tags)
    if t.startswith("DOC-") or t.startswith("MIN-"):
        return "05 BM Energia"
    if t.startswith("CCEE-"):
        cod = ccee_cod or t.replace("CCEE-", "")
        return os.path.join("04 CCEE - DRI", cod)
    return "06 Documentos do Cliente"
