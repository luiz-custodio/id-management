import os
import re
import unicodedata
from pathlib import Path
from typing import List, Optional

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
    "13 Miscelânea",
]

# Subcódigos CCEE usados na pasta 04 e também replicados na 09 (Modelagem)
# Mantidos conforme documentação oficial do projeto
CCEE_SUBCODIGOS = [
    "CFZ003", "CFZ004", "GFN001", "LFN001", "LFRCAP001",
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
    # ICMS: novos prefixos e compatibilidade legada
    if t.startswith("ICMS-") or t in {"DEVEC", "LDO", "REC"}:
        return "11 ICMS"
    # DOC e MIN residem em "05 BM Energia" (ver docs/dicionario-tags)
    if t.startswith("DOC-") or t.startswith("MIN-"):
        return "05 BM Energia"
    if t.startswith("CCEE-"):
        cod = ccee_cod or t.replace("CCEE-", "")
        return os.path.join("04 CCEE - DRI", cod)
    return "06 Documentos do Cliente"

_YEAR_MONTH_PATTERN = re.compile(r'(?:(?<=^)|(?<=[^0-9]))((?:19|20)\d{2})[^0-9]{0,3}(0?[1-9]|1[0-2])(?:(?=[^0-9])|(?=$))')
_COMPACT_YEAR_MONTH_PATTERN = re.compile(r'((?:19|20)\d{2})(0[1-9]|1[0-2])(?!\d)')
_MONTH_YEAR_PATTERN = re.compile(r'(?:(?<=^)|(?<=[^0-9]))(0?[1-9]|1[0-2])[^0-9]{0,3}((?:19|20)\d{2})(?:(?=[^0-9])|(?=$))')
_COMPACT_MONTH_YEAR_PATTERN = re.compile(r'(0[1-9]|1[0-2])((?:19|20)\d{2})(?!\d)')
_MONTH_ANYWHERE_PATTERN = re.compile(r'(?:(?<=^)|(?<=[^0-9]))(0?[1-9]|1[0-2])(?!\d)')
_YEAR_BOUNDARY_PATTERN = re.compile(r'(?:(?<=^)|(?<=[^0-9]))((?:19|20)\d{2})(?!\d)')
_FILE_EXTENSION_PATTERN = re.compile(r'\.[^./\\]+$')
_MES_ANO_VALIDATOR = re.compile(r'^(?:19|20)\d{2}-(0[1-9]|1[0-2])$')

def _strip_accents(value: str) -> str:
    try:
        normalized = unicodedata.normalize("NFD", value)
        return "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")
    except Exception:
        return value

def extract_year_month_from_path(raw_path: Optional[str]) -> Optional[str]:
    if not raw_path:
        return None

    normalized = raw_path.replace("\\", "/")
    segments = [segment.strip() for segment in normalized.split("/") if segment.strip()]
    if not segments:
        return None

    directories: List[str] = []
    last_index = len(segments) - 1
    for idx, segment in enumerate(segments):
        if idx != last_index:
            directories.append(segment)
        else:
            if not _FILE_EXTENSION_PATTERN.search(segment):
                directories.append(segment)

    if not directories:
        return None

    for idx in range(len(directories) - 1, -1, -1):
        segment_raw = directories[idx]
        segment = _strip_accents(segment_raw)

        direct = _YEAR_MONTH_PATTERN.search(segment)
        if direct:
            return f"{direct.group(1)}-{int(direct.group(2)):02d}"

        compact = _COMPACT_YEAR_MONTH_PATTERN.search(segment)
        if compact:
            return f"{compact.group(1)}-{compact.group(2)}"

        reverse = _MONTH_YEAR_PATTERN.search(segment)
        if reverse:
            return f"{reverse.group(2)}-{int(reverse.group(1)):02d}"

        compact_reverse = _COMPACT_MONTH_YEAR_PATTERN.search(segment)
        if compact_reverse:
            return f"{compact_reverse.group(2)}-{compact_reverse.group(1)}"

        month_only = _MONTH_ANYWHERE_PATTERN.search(segment)
        if month_only:
            month_digits = int(month_only.group(1))
            for back in range(idx - 1, -1, -1):
                previous = _strip_accents(directories[back])
                year_match = _YEAR_BOUNDARY_PATTERN.search(previous)
                if year_match:
                    return f"{year_match.group(1)}-{month_digits:02d}"

    return None

def is_valid_year_month(value: Optional[str]) -> bool:
    if not value:
        return False
    return bool(_MES_ANO_VALIDATOR.match(value.strip()))
