#!/usr/bin/env python
"""
Reseta o banco de dados: remove TODAS as empresas (cascata para unidades/itens).
Também pode mover as pastas de empresas para a pasta `_BACKUP_EXCLUIDAS/` para
preservar arquivos do filesystem.

Uso:
  - Padrão: só zera o banco.
  - Com --backup-folders: move pastas em cliente/ para backup antes.
"""
from __future__ import annotations
import argparse
import shutil
from pathlib import Path
import sys


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _add_repo_to_syspath() -> None:
    sys.path.insert(0, str(_repo_root()))


def backup_empresas_folders(base_dir: Path) -> None:
    backup_dir = base_dir / "_BACKUP_EXCLUIDAS"
    backup_dir.mkdir(parents=True, exist_ok=True)
    for emp in [p for p in base_dir.iterdir() if p.is_dir() and not p.name.startswith("_")]:
        dest = backup_dir / emp.name
        # Evita sobrescrever backup existente
        i = 1
        while dest.exists():
            dest = backup_dir / f"{emp.name}__{i}"
            i += 1
        print(f"[BACKUP] {emp} -> {dest}")
        shutil.move(str(emp), str(dest))


def main(argv: list[str] | None = None) -> int:
    _add_repo_to_syspath()
    from backend.app.database import SessionLocal
    from backend.app import models

    parser = argparse.ArgumentParser()
    parser.add_argument("--backup-folders", action="store_true", help="Move pastas cliente/* para _BACKUP_EXCLUIDAS antes de zerar o banco")
    args = parser.parse_args(argv)

    import os
    base_dir = Path(os.getenv("BASE_DIR", str(_repo_root() / "cliente")))
    base_dir.mkdir(parents=True, exist_ok=True)

    if args.backup_folders:
        backup_empresas_folders(base_dir)

    db = SessionLocal()
    try:
        empresas = db.query(models.Empresa).all()
        print(f"[INFO] Removendo {len(empresas)} empresas do banco...")
        for emp in empresas:
            db.delete(emp)
        db.commit()
        print("[OK] Banco zerado (empresas/unidades/itens removidos por cascata)")
    finally:
        db.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
