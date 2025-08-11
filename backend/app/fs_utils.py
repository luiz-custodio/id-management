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

CCEE_SUBCODIGOS = ["CFZ003","CFZ004","GFN001","LFN001","LFRCA001","LFRES001","PEN001","SUM001","DCT006"]

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

    for cod in CCEE_SUBCODIGOS:
        for base_ccee in (uni_dir / "04 CCEE - DRI", uni_dir / "09 CCEE - Modelagem"):
            p = base_ccee / cod
            if p.exists(): existentes.append(str(p))
            else:
                p.mkdir(parents=True, exist_ok=True); criadas.append(str(p))

    return {"criadas": criadas, "existentes": existentes, "raiz_unidade": str(uni_dir)}

def subpasta_por_tipo(tipo: str, ccee_cod: str | None = None) -> str:
    t = tipo.upper()
    if t == "FAT": return "02 Faturas"
    if t in {"NE-CP","NE-LP"}: return "03 Notas de Energia"
    if t == "REL": return "01 Relatórios e Resultados"
    if t == "EST": return "12 Estudos e Análises"
    if t.startswith("DOC-PRO"): return "07 Projetos"
    if t.startswith("DOC-"): return "06 Documentos do Cliente"
    if t.startswith("CCEE-"):
        cod = ccee_cod or t.replace("CCEE-", "")
        return os.path.join("04 CCEE - DRI", cod)
    return "06 Documentos do Cliente"
