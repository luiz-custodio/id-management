#!/usr/bin/env python
"""
Reset total do banco + importação de empresas/unidades a partir do Excel,
criando a estrutura de pastas conforme a documentação docs/pastas.html.

Uso (exemplos):
  python scripts/reset_and_import_from_excel.py --file "B:\\Planilha Mestre - Copia.xlsx" --sheet "Filiais" --backup-folders --use-excel-ids

Requisitos: pandas, openpyxl
  pip install pandas openpyxl
"""
from __future__ import annotations
import argparse
import os
import re
import shutil
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _add_repo_to_syspath() -> None:
    # Permite "from backend.app import ..."
    sys.path.insert(0, str(_repo_root()))


# ---------- Detecção flexível de colunas ----------
COLS_CANDIDATAS: Dict[str, List[str]] = {
    "empresa_id": ["ID DE EMPRE", "ID DE EMPRESA", "ID EMPRESA", "ID EMPRE", "ID EMP", "ID DE EMPR"],
    "unidade_id": ["ID DE FILIAL", "ID FILIAL", "ID DE UNIDADE", "ID UNIDADE", "FILIAL ID"],
    "agente": ["AGENTE", "EMPRESA", "NOME AGENTE", "CLIENTE", "RAZAO SOCIAL"],
    "nome_filial": ["NOME FILIAL", "FILIAL", "UNIDADE", "NOME UNIDADE", "NOME DA FILIAL"],
}


def _normaliza_header(col: str) -> str:
    return re.sub(r"\s+", " ", col.strip().upper().replace("-", " "))


def _detecta_colunas(df) -> Dict[str, str]:
    disponiveis = { _normaliza_header(c): c for c in df.columns }
    out: Dict[str, str] = {}
    for destino, candidatos in COLS_CANDIDATAS.items():
        achou = None
        for cand in candidatos:
            key = _normaliza_header(cand)
            possiveis = [orig for norm, orig in disponiveis.items() if norm.startswith(key)]
            if possiveis:
                achou = possiveis[0]
                break
        if not achou:
            possivel = disponiveis.get(_normaliza_header(destino))
            if possivel:
                achou = possivel
        if not achou:
            raise ValueError(f"Coluna obrigatória não encontrada: {destino} (candidatos: {COLS_CANDIDATAS[destino]})")
        out[destino] = achou
    return out


def _zpad(valor, width: int) -> str:
    """Zero-pad robusto para IDs que podem vir como string/float."""
    try:
        s = str(valor).strip()
        if s == "" or s.lower() == "nan":
            return ""
        # remove não-dígitos, preservando números
        s = re.sub(r"\D", "", s)
        return s.zfill(width)[:width]
    except Exception:
        return "".zfill(width)


def _backup_empresas_folders(base_dir: Path) -> None:
    backup_dir = base_dir / "_BACKUP_EXCLUIDAS"
    backup_dir.mkdir(parents=True, exist_ok=True)
    for emp in [p for p in base_dir.iterdir() if p.is_dir() and not p.name.startswith("_")]:
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        dest = backup_dir / f"{emp.name}_{ts}"
        i = 1
        while dest.exists():
            dest = backup_dir / f"{emp.name}_{ts}_{i}"
            i += 1
        print(f"[BACKUP] {emp} -> {dest}")
        shutil.move(str(emp), str(dest))


def main(argv: List[str] | None = None) -> int:
    _add_repo_to_syspath()
    import pandas as pd
    from dotenv import load_dotenv
    from backend.app.database import SessionLocal
    from backend.app import models
    from backend.app.id_utils import next_id_empresa, next_id_unidade
    from backend.app.fs_utils import montar_estrutura_unidade

    parser = argparse.ArgumentParser(description="Reset DB + Importar empresas/unidades do Excel + Criar pastas padrão")
    parser.add_argument("--file", required=True, help="Caminho do Excel (ex.: B:\\Planilha.xlsx)")
    parser.add_argument("--sheet", default="Filiais", help="Nome da aba (padrão: Filiais)")
    parser.add_argument("--backup-folders", action="store_true", help="Move pastas cliente/* para _BACKUP_EXCLUIDAS antes de resetar o DB")
    parser.add_argument("--use-excel-ids", action="store_true", help="Usa IDs da planilha (empresa/unidade) em vez de gerar sequenciais internos")
    parser.add_argument("--base", default=None, help=r"Força BASE_DIR (ex.: B:\\NOVO00_Nossos_Clientes)")
    args = parser.parse_args(argv)

    load_dotenv()

    excel_path = Path(args.file)
    if not excel_path.exists():
        print(f"[ERRO] Planilha não encontrada: {excel_path}")
        return 2

    # BASE_DIR
    base_env = args.base or os.getenv("BASE_DIR")
    base_dir = Path(base_env) if base_env else _repo_root() / "cliente"
    base_dir.mkdir(parents=True, exist_ok=True)
    print(f"[INFO] BASE_DIR: {base_dir}")

    # Backup opcional
    if args.backup_folders:
        print("[INFO] Fazendo backup de pastas atuais...")
        _backup_empresas_folders(base_dir)

    # Carrega DataFrame e detecta colunas
    df = pd.read_excel(excel_path, sheet_name=args.sheet)
    colmap = _detecta_colunas(df)
    # Remover duplicados por (empresa_id, unidade_id) para não recriar unidade diversas vezes
    df = df.drop_duplicates(subset=[colmap["empresa_id"], colmap["unidade_id"]], keep="first")

    db = SessionLocal()
    try:
        # RESET DB
        empresas = db.query(models.Empresa).all()
        print(f"[INFO] Resetando banco: removendo {len(empresas)} empresa(s)...")
        for emp in empresas:
            db.delete(emp)
        db.commit()

        # Mapa para não recriar a mesma empresa
        empresas_map: Dict[str, models.Empresa] = {}

        for _, row in df.iterrows():
            agente = str(row[colmap["agente"]]).strip()
            if not agente:
                print("[WARN] Linha sem 'agente' - pulando")
                continue

            # ID de Empresa
            if args.use_excel_ids:
                id_emp = _zpad(row[colmap["empresa_id"]], 4)
                if not id_emp:
                    # Sem ID válido na planilha -> gera automático
                    id_emp = None
            else:
                id_emp = None

            # Cria/pega empresa
            emp = empresas_map.get(agente)
            if not emp:
                if id_emp is None:
                    id_emp = next_id_empresa(db)
                # Garante unicidade do id_empresa
                exists = db.query(models.Empresa).filter_by(id_empresa=id_emp).first()
                if exists:
                    # se já existe (raro pois resetamos), gera o próximo
                    id_emp = next_id_empresa(db)

                emp = models.Empresa(id_empresa=id_emp, nome=agente)
                db.add(emp)
                db.flush()
                empresas_map[agente] = emp

            # Unidade
            nome_unidade = str(row[colmap["nome_filial"]]).strip() or "Matriz"
            if args.use_excel_ids:
                id_unidade = _zpad(row[colmap["unidade_id"]], 3)
                if not id_unidade:
                    id_unidade = None
            else:
                id_unidade = None

            # Evita duplicidade por empresa+id_unidade
            if id_unidade is not None:
                existing_unidade = db.query(models.Unidade).filter_by(empresa_id=emp.id, id_unidade=id_unidade).first()
                if existing_unidade:
                    continue

            if id_unidade is None:
                # Se é a primeira unidade da empresa, força 001
                first = db.query(models.Unidade).filter_by(empresa_id=emp.id).first()
                id_unidade = "001" if not first else next_id_unidade(db, emp.id)

            und = models.Unidade(id_unidade=id_unidade, nome=nome_unidade, empresa_id=emp.id)
            db.add(und)
            db.flush()

            # Montar estrutura de pastas conforme docs/pastas.html (fs_utils já cumpre)
            rotulo_emp = f"{emp.nome} - {emp.id_empresa}"
            rotulo_und = f"{und.nome} - {und.id_unidade}"
            montar_estrutura_unidade(str(base_dir), rotulo_emp, rotulo_und)

        db.commit()
        print("[OK] Importação concluída e pastas criadas conforme padrão.")
    finally:
        db.close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

