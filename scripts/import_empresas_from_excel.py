#!/usr/bin/env python
"""
Importa empresas e filiais a partir da planilha Excel (aba 'Filiais') com colunas:
  ID de Empresa | ID de Filial | Agente | Nome Filial

Regras:
- Cria/usa empresas por 'Agente' (nome) com id_empresa sequencial automático (ignora 'ID de Empresa' da planilha para manter regra interna).
- Para cada linha, cria a unidade com nome 'Nome Filial'. A unidade 001 será a primeira criada de cada empresa; demais seguem sequencial.
- Após criar, monta a estrutura de pastas conforme padrão no BASE_DIR.
"""
from __future__ import annotations
import argparse
from pathlib import Path
import sys


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _add_repo_to_syspath() -> None:
    sys.path.insert(0, str(_repo_root()))


def main(argv: list[str] | None = None) -> int:
    _add_repo_to_syspath()
    import pandas as pd
    from backend.app.database import SessionLocal
    import os
    from backend.app import models
    from backend.app.id_utils import next_id_empresa, next_id_unidade
    from backend.app.fs_utils import montar_estrutura_unidade
    from backend.app.excel_sync import (
        ExcelSyncError,
        ExcelSyncLockedError,
        append_empresa,
        append_filial,
    )

    parser = argparse.ArgumentParser()
    parser.add_argument("--file", required=True, help="Caminho completo do Excel")
    parser.add_argument("--sheet", default="Filiais", help="Nome da aba a ser lida (default: Filiais)")
    args = parser.parse_args(argv)

    xlsx_path = Path(args.file)
    if not xlsx_path.exists():
        print(f"[ERRO] Planilha não encontrada: {xlsx_path}")
        return 2

    df = pd.read_excel(xlsx_path, sheet_name=args.sheet)

    # Normaliza nomes de colunas
    col_map = {
        "ID de Empresa": "id_empresa_in",
        "ID de Filial": "id_filial_in",
        "Agente": "agente",
        "Nome Filial": "nome_filial",
    }
    missing = [c for c in col_map.keys() if c not in df.columns]
    if missing:
        print(f"[ERRO] Colunas obrigatórias ausentes na aba '{args.sheet}': {missing}")
        return 2
    df = df.rename(columns=col_map)

    db = SessionLocal()
    base_dir = Path(os.getenv("BASE_DIR", str(_repo_root() / "cliente")))
    base_dir_str = str(base_dir)
    try:
        # Agrupa por agente
        for agente, grp in df.groupby("agente"):
            agente = str(agente).strip()
            if not agente:
                continue

            # Existe empresa com mesmo nome?
            emp = db.query(models.Empresa).filter(models.Empresa.nome == agente).first()
            if not emp:
                emp = models.Empresa(id_empresa=next_id_empresa(db), nome=agente)
                db.add(emp)
                db.flush()
                try:
                    append_empresa(emp.nome, emp.id_empresa)
                except ExcelSyncLockedError as exc:
                    db.rollback()
                    print(f'[ERRO] Planilha mestre em uso: {exc}')
                    return 3
                except ExcelSyncError as exc:
                    db.rollback()
                    print(f'[ERRO] Falha ao atualizar planilha mestre: {exc}')
                    return 3

            # Cria unidades para este agente
            # Mantém ordem estável; usa valores únicos de 'nome_filial'
            unidades_nomes = [str(v).strip() for v in grp["nome_filial"].tolist() if str(v).strip()]

            # Garante que sempre tenha ao menos uma (Matriz) se vazio
            if not unidades_nomes:
                unidades_nomes = ["Matriz"]

            # Coleta existentes para evitar duplicidade por nome dentro da empresa
            existentes = {u.nome for u in db.query(models.Unidade).filter_by(empresa_id=emp.id).all()}

            for nome_un in unidades_nomes:
                if nome_un in existentes:
                    continue
                # id_unidade sequencial adequado
                if not db.query(models.Unidade).filter_by(empresa_id=emp.id).first():
                    id_unidade = "001"
                else:
                    id_unidade = next_id_unidade(db, emp.id)

                und = models.Unidade(id_unidade=id_unidade, nome=nome_un, empresa_id=emp.id)
                db.add(und)
                db.flush()
                try:
                    append_filial(
                        nome_empresa=emp.nome,
                        id_empresa=emp.id_empresa,
                        nome_unidade=und.nome,
                        id_unidade=und.id_unidade,
                        base_dir=base_dir,
                    )
                except ExcelSyncLockedError as exc:
                    db.rollback()
                    print(f'[ERRO] Planilha mestre em uso: {exc}')
                    return 3
                except ExcelSyncError as exc:
                    db.rollback()
                    print(f'[ERRO] Falha ao atualizar planilha mestre: {exc}')
                    return 3

                # Monta estrutura de pastas usando BASE_DIR
                montar_estrutura_unidade(base_dir_str, f"{emp.nome} - {emp.id_empresa}", f"{und.nome} - {und.id_unidade}")
                existentes.add(und.nome)

        db.commit()
        print("[OK] Importação concluída.")
    finally:
        db.close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
