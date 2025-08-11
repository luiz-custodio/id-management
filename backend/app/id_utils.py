import re
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from . import models

# REGEX
RE_FAT = re.compile(r"^FAT-\d{4}-(0[1-9]|1[0-2])\.(pdf|xlsx|csv)$", re.IGNORECASE)
RE_NE  = re.compile(r"^NE-(CP|LP)-\d{4}-(0[1-9]|1[0-2])\.(pdf|xlsx|csv)$", re.IGNORECASE)
RE_REL = re.compile(r"^REL-\d{4}-(0[1-9]|1[0-2])\.(pdf|xlsx|csv)$", re.IGNORECASE)
RE_EST = re.compile(r"^EST-\d{4}-(0[1-9]|1[0-2])\.(pdf|xlsx|csv)$", re.IGNORECASE)
RE_DOC = re.compile(r"^DOC-[A-Z]{3}-.+\.(pdf|docx|xlsx)$", re.IGNORECASE)
RE_CCEE = re.compile(
    r"^CCEE-(?:CFZ|GFN|LFN|LFRCA|LFRES|PEN|SUM|DCT)\d{3}-\d{4}-(0[1-9]|1[0-2])(-V\d+)?(-[A-Z])?( - .+)?\.(pdf|xlsx|csv)$",
    re.IGNORECASE
)

def validar_nome_arquivo(nome_arquivo: str) -> dict:
    for tag, rgx in [("FAT", RE_FAT), ("NE", RE_NE), ("REL", RE_REL), ("EST", RE_EST), ("DOC", RE_DOC), ("CCEE", RE_CCEE)]:
        if rgx.match(nome_arquivo):
            return {"valido": True, "tipo": tag}
    return {"valido": False, "tipo": None}

# IDs
def next_id_empresa(db: Session) -> str:
    max_str = db.execute(select(func.max(models.Empresa.id_empresa))).scalar()
    nxt = (int(max_str) + 1) if max_str else 1
    return f"{nxt:04d}"

def next_id_unidade(db: Session, empresa_id: int) -> str:
    max_str = db.execute(
        select(func.max(models.Unidade.id_unidade)).where(models.Unidade.empresa_id == empresa_id)
    ).scalar()
    nxt = (int(max_str) + 1) if max_str else 1
    return f"{nxt:03d}"

def build_item_id(tipo: str, ano_mes: str | None) -> str:
    t = tipo.upper()
    base_tags = {"FAT", "REL", "EST", "NE-CP", "NE-LP"}
    if t in base_tags:
        if not ano_mes:
            raise ValueError(f"Para tipo {tipo}, 'ano_mes' (YYYY-MM) é obrigatório.")
        if t == "NE-CP": return f"NE-CP-{ano_mes}"
        if t == "NE-LP": return f"NE-LP-{ano_mes}"
        return f"{t}-{ano_mes}"
    if t.startswith("DOC-"):
        return f"{t}-{ano_mes}" if ano_mes else t
    if t.startswith("CCEE-"):
        if not ano_mes:
            raise ValueError(f"Para tipo {tipo}, 'ano_mes' (YYYY-MM) é obrigatório.")
        return f"{t}-{ano_mes}"
    return t
