# scripts/build_folders_from_excel.py
# Lê um Excel (aba "Filiais") e cria:
# B:\NOVO00_Nossos_Clientes\{AGENTE} - {0001}\{NOME FILIAL} - {001}\subpastas...
# - IDs com zero-padding (empresa=4, unidade=3)
# - Subpastas numeradas conforme padrão
# - Cria também pastas CCEE em "04 CCEE - DRI" e "09 CCEE - Modelagem"
# Requisitos: pandas, openpyxl (pip install pandas openpyxl)

from __future__ import annotations
import argparse
import csv
import re
from pathlib import Path
from typing import Dict, List, Tuple

import pandas as pd

# ---------- SUBPASTAS NUMERADAS ----------
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

# ---------- CÓDIGOS CCEE PADRÃO ----------
DEFAULT_CCEE_CODES = [
    "CFZ003",
    "CFZ004",
    "GFN001",
    "LFN001",
    "LFRCAP001",
    "LFRES001",
    "PEN001",
    "SUM001",
    "DCT006",
]

# ---------- COLUNAS (detecção flexível) ----------
COLS_CANDIDATAS: Dict[str, List[str]] = {
    "empresa_id": ["ID DE EMPRE", "ID DE EMPRESA", "ID EMPRESA", "ID EMPRE", "ID EMP", "ID DE EMPR"],
    "unidade_id": ["ID DE FILIAL", "ID FILIAL", "ID DE UNIDADE", "ID UNIDADE", "FILIAL ID"],
    "agente": ["AGENTE", "EMPRESA", "NOME AGENTE", "CLIENTE", "RAZAO SOCIAL"],
    "nome_filial": ["NOME FILIAL", "FILIAL", "UNIDADE", "NOME UNIDADE", "NOME DA FILIAL"],
}

INVALID_CHARS = r'[<>:"/\\|?*]'
RESERVED_WINDOWS = {
    "CON","PRN","AUX","NUL",
    "COM1","COM2","COM3","COM4","COM5","COM6","COM7","COM8","COM9",
    "LPT1","LPT2","LPT3","LPT4","LPT5","LPT6","LPT7","LPT8","LPT9",
}

def normaliza_header(col: str) -> str:
    return re.sub(r"\s+", " ", col.strip().upper().replace("-", " "))

def detecta_colunas(df: pd.DataFrame) -> Dict[str, str]:
    disponiveis = {normaliza_header(c): c for c in df.columns}
    out: Dict[str, str] = {}
    for destino, candidatos in COLS_CANDIDATAS.items():
        achou = None
        for cand in candidatos:
            key = normaliza_header(cand)
            possiveis = [orig for norm, orig in disponiveis.items() if norm.startswith(key)]
            if possiveis:
                achou = possiveis[0]
                break
        if not achou:
            possivel = disponiveis.get(normaliza_header(destino))
            if possivel:
                achou = possivel
        if not achou:
            raise ValueError(f"Coluna obrigatória não encontrada: {destino} (candidatos: {COLS_CANDIDATAS[destino]})")
        out[destino] = achou
    return out

def zero_pad(valor, width: int) -> str:
    if pd.isna(valor):
        return ""
    try:
        return f"{int(str(valor).strip()):0{width}d}"
    except Exception:
        s = re.sub(r"\D", "", str(valor))
        return s.zfill(width)[:width]

def sane_folder(name: str) -> str:
    n = (name or "").strip()
    n = re.sub(INVALID_CHARS, " ", n)
    n = re.sub(r"\s{2,}", " ", n).strip()
    if n.upper() in RESERVED_WINDOWS:
        n = f"{n}_"
    return n[:120] if len(n) > 120 else n

def cria_dir(p: Path, dry_run: bool, criadas: List[str], existentes: List[str]):
    if p.exists():
        existentes.append(str(p))
        return
    if not dry_run:
        p.mkdir(parents=True, exist_ok=True)
    criadas.append(str(p))

def montar_unidade(
    base_dir: Path,
    agente: str,
    id_emp: str,
    filial: str,
    id_uni: str,
    ccee_codes: List[str],
    dry_run: bool
) -> Tuple[Path, List[str], List[str]]:
    criadas, existentes = [], []
    empresa_rotulo = f"{sane_folder(agente)} - {id_emp}"
    unidade_rotulo = f"{sane_folder(filial)} - {id_uni}"

    emp_dir = base_dir / empresa_rotulo
    uni_dir = emp_dir / unidade_rotulo

    for p in (emp_dir, uni_dir):
        cria_dir(p, dry_run, criadas, existentes)

    for nome in SUBPASTAS_NUMERADAS:
        cria_dir(uni_dir / nome, dry_run, criadas, existentes)

    ccee_dri = uni_dir / "04 CCEE - DRI"
    ccee_model = uni_dir / "09 CCEE - Modelagem"
    for cod in ccee_codes:
        cria_dir(ccee_dri / sane_folder(cod), dry_run, criadas, existentes)
        cria_dir(ccee_model / sane_folder(cod), dry_run, criadas, existentes)

    return uni_dir, criadas, existentes

def processar(
    excel_path: Path,
    sheet: str,
    base_dir: Path,
    ccee_codes: List[str],
    dry_run: bool,
    log_csv: Path | None
):
    df = pd.read_excel(excel_path, sheet_name=sheet)
    colmap = detecta_colunas(df)

    df = df.drop_duplicates(subset=[colmap["empresa_id"], colmap["unidade_id"]], keep="first")

    resumo = []
    total = len(df)
    for _, row in df.iterrows():
        emp_id = zero_pad(row[colmap["empresa_id"]], 4)
        uni_id = zero_pad(row[colmap["unidade_id"]], 3)
        agente = str(row[colmap["agente"]]).strip()
        filial = str(row[colmap["nome_filial"]]).strip()

        if not emp_id or not uni_id or not agente or not filial:
            resumo.append(("PULADO", emp_id, uni_id, agente, filial, "Campos faltando"))
            continue

        raiz_unidade, criadas, existentes = montar_unidade(base_dir, agente, emp_id, filial, uni_id, ccee_codes, dry_run)
        resumo.append(("OK", emp_id, uni_id, agente, filial, f"{raiz_unidade} | novas:{len(criadas)} existentes:{len(existentes)}"))

    if log_csv:
        log_csv.parent.mkdir(parents=True, exist_ok=True)
        with open(log_csv, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f, delimiter=";")
            w.writerow(["status","id_empresa","id_unidade","agente","nome_filial","detalhe"])
            w.writerows(resumo)

    ok = sum(1 for r in resumo if r[0] == "OK")
    pulados = sum(1 for r in resumo if r[0] == "PULADO")
    print(f"Total linhas: {total} | OK: {ok} | Pulados: {pulados}")
    if log_csv:
        print(f"Log salvo em: {log_csv}")

def main():
    parser = argparse.ArgumentParser(description="Criar estrutura de pastas a partir do Excel de filiais.")
    parser.add_argument("--excel", required=True, help="Caminho do Excel (ex.: data/cadastro_filiais.xlsx)")
    parser.add_argument("--sheet", default="Filiais", help="Nome da aba (padrão: Filiais)")
    parser.add_argument("--base", required=True, help=r'Base das pastas (ex.: B:\NOVO00_Nossos_Clientes)')
    parser.add_argument("--ccee-codes",
                        default=",".join(DEFAULT_CCEE_CODES),
                        help="Lista separada por vírgula (ex.: CFZ003,GFN001). Deixe em branco para não criar.")
    parser.add_argument("--dry-run", action="store_true", help="Apenas simula (não cria nada)")
    parser.add_argument("--log", default="reports/build_folders_log.csv", help="CSV de log (opcional)")
    args = parser.parse_args()

    excel_path = Path(args.excel)
    base_dir = Path(args.base)
    log_csv = Path(args.log) if args.log else None

    if not excel_path.exists():
        raise SystemExit(f"Excel não encontrado: {excel_path}")
    if not base_dir.exists():
        raise SystemExit(f"Base não encontrada: {base_dir} (crie a pasta raiz primeiro)")

    ccee_codes = [c.strip() for c in (args.ccee_codes or "").split(",") if c.strip()]
    processar(excel_path, args.sheet, base_dir, ccee_codes, args.dry_run, log_csv)

if __name__ == "__main__":
    main()
