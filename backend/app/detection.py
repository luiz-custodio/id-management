from __future__ import annotations

import re
from datetime import datetime
from pathlib import Path
from typing import Optional, Tuple


def _remove_accents(s: str) -> str:
    try:
        import unicodedata as _ud
        return "".join(c for c in _ud.normalize("NFD", s) if _ud.category(c) != "Mn")
    except Exception:
        return s


def _ym_from_ts(ts: Optional[float], *, prev: bool = False) -> str:
    dt = datetime.fromtimestamp((ts / 1000) if ts and ts > 1e12 else (ts or datetime.now().timestamp()))
    if prev:
        y = dt.year
        m = dt.month - 1
        if m == 0:
            m = 12
            y -= 1
        return f"{y}-{m:02d}"
    return dt.strftime("%Y-%m")


def detect_type_and_date(
    filename: str,
    last_modified: Optional[float] = None,
) -> Tuple[Optional[str], Optional[str], int, str]:
    """
    Heurísticas centralizadas de detecção de tipo e data (AAAA-MM).

    Regras principais (alinhadas ao frontend Empresas.tsx):
      - FAT: nome "YYYY-MM.ext" (pdf/xlsm/xlsx/docx/xml) → data do nome
      - Notas de Energia (NE-CP/NE-LP/NE-VE/NE-CPC/NE-LPC): palavras‑chave → data = lastModified − 1 mês (ou mês anterior de hoje)
      - ICMS (ICMS-DEVEC/ICMS-LDO/ICMS-REC): palavras‑chave → data = lastModified − 1 mês (ou mês anterior de hoje)
      - EST: contém "estudo" → data = mês do lastModified (ou mês atual)
      - REL: contém "relatório" + "MMM-YY" → converte; senão usa mês anterior
      - DOC-* (CAR/ADT/CTR/PRO/CAD/COM/LIC): palavras‑chave → data = mês do lastModified (ou mês atual)
      - CCEE-BOLETOCA: contém "boleto" → data = mês do lastModified (ou mês atual)
      - Padrões exatos (ex: RES-YYYY-MM, CCEE-<COD>-YYYY-MM) são respeitados
    """
    nome_raw = filename
    nome = filename.lower()
    nome_norm = _remove_accents(nome)

    # 1) Padrões exatos com prefixos conhecidos (RES, REL, FAT, NE-*, ICMS-*, DEVEC/LDO legacy, EST)
    exact_prefixes = [
        "FAT", "REL", "RES", "EST",
        # NE
        "NE-CP", "NE-LP", "NE-VE", "NE-CPC", "NE-LPC",
        # ICMS novo
        "ICMS-DEVEC", "ICMS-LDO", "ICMS-REC",
        # compat legada
        "DEVEC", "LDO",
    ]
    for pref in exact_prefixes:
        if re.match(rf"^{pref}-\\d{{4}}-(0[1-9]|1[0-2])", nome_raw):
            return pref, re.search(r"(\d{4}-(0[1-9]|1[0-2]))", nome_raw).group(1), 95, f"Padrão exato {pref} detectado"

    # 2) Padrões CCEE com código: CCEE-<COD>-YYYY-MM
    if re.match(r"^CCEE-(CFZ\d{3}|GFN\d{3}|LFN\d{3}|LFRCA\d{3}|LFRES\d{3}|PEN\d{3}|SUM\d{3}|BOLETOCA|ND)-\d{4}-(0[1-9]|1[0-2])",
                nome_raw, re.IGNORECASE):
        return "CCEE", re.search(r"(\d{4}-(0[1-9]|1[0-2]))", nome_raw).group(1), 95, "Padrão exato CCEE detectado"

    # 3) FAT: nome somente data
    m_fat = re.match(r"^(\d{4})-(\d{2})\.(pdf|xlsm|xlsx?|docx?|xml)$", nome, re.IGNORECASE)
    if m_fat:
        ym = f"{m_fat.group(1)}-{m_fat.group(2)}"
        return "FAT", ym, 95, f"FAT por nome (YYYY-MM): {ym}"

    # 3.1) FAT: nome começando com YYYY-MM + descritivo contendo 'fatura' ou 'icms'
    #          (mas NÃO se contiver 'laudo' para evitar conflito com ICMS-LDO)
    m_fat_desc = re.match(r"^(\d{4})-(\d{2})[\s_-].+\.(pdf|xlsm|xlsx?|docx?|xml)$", nome_raw, re.IGNORECASE)
    if m_fat_desc:
        tokens_fat = re.findall(r"[a-z0-9]+", nome_norm)
        tset_fat = set(tokens_fat)
        if (("fatura" in tset_fat) or ("faturas" in tset_fat) or ("icms" in tset_fat)) and not (("laudo" in tset_fat) or ("laudos" in tset_fat)):
            ym = f"{m_fat_desc.group(1)}-{m_fat_desc.group(2)}"
            return "FAT", ym, 90, f"FAT por YYYY-MM + descritivo (fatura/icms): {ym}"

    # 4) CCEE-BOLETOCA (contém boleto)
    if "boleto" in nome:
        ym = _ym_from_ts(last_modified)
        return "CCEE-BOLETOCA", ym, 85, "CCEE-BOLETOCA por palavra-chave"

    # 5) Notas de energia (palavras-chave com limites de palavra)
    #    Usa tokens [a-z0-9]+ do nome normalizado (sem acento)
    tokens = re.findall(r"[a-z0-9]+", nome_norm)
    tset = set(tokens)
    if ("nota" in tset) or ("cpc" in tset) or ("lpc" in tset) or ("cp" in tset) or ("lp" in tset) or ("venda" in tset) or ("ve" in tset):
        if "cpc" in tset:
            tipo = "NE-CPC"; motivo = "NE-CPC por token 'cpc'"
        elif "lpc" in tset:
            tipo = "NE-LPC"; motivo = "NE-LPC por token 'lpc'"
        elif "cp" in tset:
            tipo = "NE-CP"; motivo = "NE-CP por token 'cp'"
        elif "lp" in tset:
            tipo = "NE-LP"; motivo = "NE-LP por token 'lp'"
        elif ("venda" in tset) or ("ve" in tset):
            tipo = "NE-VE"; motivo = "NE-VE por token 'venda/ve'"
        else:
            tipo = "NE-CP"; motivo = "NE-CP por token 'nota'"
        ym = _ym_from_ts(last_modified, prev=True)
        return tipo, ym, 85, f"{motivo} (mês anterior)"

    # 6) ICMS (DEVEC / LDO / REC)
    # Regra específica: se contiver tokens 'icms' e 'laudo' → ICMS-LDO
    try:
        _tokens_icms = re.findall(r"[a-z0-9]+", nome_norm)
        _tset_icms = set(_tokens_icms)
    except Exception:
        _tset_icms = set()
    if ("icms" in _tset_icms) and (("laudo" in _tset_icms) or ("laudos" in _tset_icms)):
        ym = _ym_from_ts(last_modified, prev=True)
        return "ICMS-LDO", ym, 90, "ICMS-LDO por tokens 'laudo' + 'icms' (mês anterior)"

    if "devec" in nome:
        ym = _ym_from_ts(last_modified, prev=True)
        return "ICMS-DEVEC", ym, 85, "ICMS-DEVEC por palavra-chave (mês anterior)"
    # LDO: manter compatibilidade com nomes que tragam 'ICMS-LDO'/'LDO' explícito
    if re.search(r"\b(icms[-_]?ldo|ldo)\b", nome, re.IGNORECASE):
        ym = _ym_from_ts(last_modified, prev=True)
        return "ICMS-LDO", ym, 85, "ICMS-LDO por palavra-chave (mês anterior)"
    if "rec" in nome:
        ym = _ym_from_ts(last_modified, prev=True)
        return "ICMS-REC", ym, 85, "ICMS-REC por palavra-chave (mês anterior)"

    # 7) Estudo
    if ("estudo" in nome) or ("estudos" in nome):
        ym = _ym_from_ts(last_modified)
        return "EST", ym, 90, "EST por palavra-chave"

    # 8) Documentos/Minutas (DOC-* / MIN-*) – inferidos por palavras
    _tokens = re.findall(r"[a-z0-9]+", nome_norm)
    _tset = set(_tokens)
    is_minuta = ("minuta" in _tset) or ("minutas" in _tset) or ("min" in _tset)
    pref = "MIN" if is_minuta else "DOC"
    if ("carta" in _tset and ("denuncia" in _tset)):
        ym = _ym_from_ts(last_modified)
        return f"{pref}-CAR", ym, 90, f"{pref}-CAR por 'carta' + 'denúncia'"
    # ADITIVO: aceita variações comuns (aditivo/aditamento/adit) como palavra
    if ("aditivo" in _tset) or ("aditamento" in _tset) or ("adit" in _tset):
        ym = _ym_from_ts(last_modified)
        return f"{pref}-ADT", ym, 90, f"{pref}-ADT por 'aditivo'"
    if "contrato" in _tset:
        ym = _ym_from_ts(last_modified)
        return f"{pref}-CTR", ym, 90, f"{pref}-CTR por 'contrato'"
    if ("procuracao" in _tset) or ("procuração" in nome):
        ym = _ym_from_ts(last_modified)
        return f"{pref}-PRO", ym, 90, f"{pref}-PRO por 'procuração'"
    if "cadastro" in _tset:
        ym = _ym_from_ts(last_modified)
        return f"{pref}-CAD", ym, 70, f"{pref}-CAD por 'cadastro'"
    if "comunicado" in _tset:
        ym = _ym_from_ts(last_modified)
        return f"{pref}-COM", ym, 70, f"{pref}-COM por 'comunicado'"
    if ("licenca" in _tset) or ("licença" in nome):
        ym = _ym_from_ts(last_modified)
        return f"{pref}-LIC", ym, 70, f"{pref}-LIC por 'licença'"

    # 9) Relatórios – "relatório" + MMM-YY
    if ("relatorio" in nome) or ("relatório" in nome):
        m = re.search(r"(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)-(\d{2})", nome)
        if m:
            mapa = {
                "jan": "01", "fev": "02", "mar": "03", "abr": "04",
                "mai": "05", "jun": "06", "jul": "07", "ago": "08",
                "set": "09", "out": "10", "nov": "11", "dez": "12",
            }
            mes = mapa.get(m.group(1).lower(), "01")
            ano = f"20{m.group(2)}"
            return "REL", f"{ano}-{mes}", 90, f"REL por mês abreviado {m.group(0).upper()}"
        else:
            ym = _ym_from_ts(last_modified, prev=True)
            return "REL", ym, 70, "REL por palavra-chave (mês anterior)"

    # 10) Sem identificação
    return None, None, 0, "Tipo não identificado"


def suggest_new_name(detected_type: str, filename: str, last_modified: Optional[float] = None) -> str:
    """Sugere novo nome quando aplicável (apenas BOLETOCA). Caso contrário, mantém o original."""
    if detected_type == "CCEE-BOLETOCA":
        # Usa mês do last_modified (ou mês atual)
        dt = datetime.fromtimestamp((last_modified / 1000) if last_modified and last_modified > 1e12 else (last_modified or datetime.now().timestamp()))
        ym = f"{dt.year}-{dt.month:02d}"
        ext = Path(filename).suffix
        return f"CCEE-BOLETOCA-{ym}{ext}"
    return filename


def top_level_folder(file_type: str) -> str:
    """
    Mapeia tipo → pasta de alto nível (contadores/visão batch).
    Segue a FOLDER_STRUCTURE do frontend (BatchOrganize):
      - FAT → 02 Faturas
      - NE-* → 03 Notas de Energia
      - CCEE/CCEE-BOLETOCA → 04 CCEE - DRI
      - DOC-CTR/DOC-PRO, MIN-* → 05 BM Energia
      - DOC-CAD/DOC-ADT/DOC-COM/DOC-LIC/DOC-CAR → 06 Documentos do Cliente
      - REL/RES → 01 Relatórios e Resultados
      - DEVEC/LDO → 11 ICMS
      - EST → 12 Estudos e Análises
      - default → 07 Projetos
    """
    t = (file_type or "").upper()
    if t == "FAT":
        return "02 Faturas"
    if t.startswith("NE-"):
        return "03 Notas de Energia"
    if t.startswith("CCEE"):
        return "04 CCEE - DRI"
    if t.startswith("MIN-") or t in {"DOC-CTR", "DOC-PRO"}:
        return "05 BM Energia"
    if t in {"DOC-CAD", "DOC-ADT", "DOC-COM", "DOC-LIC", "DOC-CAR"}:
        return "06 Documentos do Cliente"
    if t in {"REL", "RES"}:
        return "01 Relatórios e Resultados"
    if t.startswith("ICMS-") or t in {"DEVEC", "LDO"}:
        return "11 ICMS"
    if t == "EST":
        return "12 Estudos e Análises"
    return "07 Projetos"
