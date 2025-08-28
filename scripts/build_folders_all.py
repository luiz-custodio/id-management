#!/usr/bin/env python
"""
Garante que TODAS as unidades existentes (no DB ou no filesystem) tenham a
estrutura de pastas completa conforme o padrão do projeto.

Ordem de operação:
1) Tenta carregar empresas/unidades do banco e criar pastas para cada uma.
2) Se não houver dados no banco, varre o diretório cliente/ e cria/esqueletiza
   as subpastas para cada empresa/unidade encontrada.

Saída: imprime um resumo com contagem de pastas criadas e já existentes.
"""
from __future__ import annotations
import sys
from pathlib import Path
import os
from typing import List


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _add_repo_to_syspath() -> None:
    # Suporta import de backend.app.* como pacote namespace implícito
    sys.path.insert(0, str(_repo_root()))


def main() -> int:
    _add_repo_to_syspath()

    # Imports tardios após ajustar sys.path
    try:
        from backend.app.database import SessionLocal, engine
        from backend.app.database import Base as DbBase
        from backend.app import models
        from backend.app.fs_utils import montar_estrutura_unidade
    except Exception as e:
        print(f"[ERRO] Falha ao importar módulos do backend: {e}")
        return 2

    base_dir = Path(os.getenv("BASE_DIR", str(_repo_root() / "cliente")))
    base_dir.mkdir(parents=True, exist_ok=True)

    criadas_total: List[str] = []
    existentes_total: List[str] = []

    # 1) Garante tabelas (SQLite/Postgres)
    try:
        DbBase.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"[WARN] Não foi possível criar/verificar tabelas: {e}")

    # 2) Tenta pelo banco
    db = SessionLocal()
    try:
        empresas = []
        try:
            empresas = db.query(models.Empresa).all()
        except Exception as e:
            print(f"[WARN] Consulta ao banco falhou (talvez não inicializado): {e}")
            empresas = []

        if empresas:
            print(f"[INFO] Encontradas {len(empresas)} empresas no banco. Criando estrutura...")
            for emp in empresas:
                try:
                    unidades = db.query(models.Unidade).filter_by(empresa_id=emp.id).all()
                except Exception as e:
                    print(f"[WARN] Falha ao consultar unidades da empresa {emp.id_empresa}: {e}")
                    unidades = []
                if not unidades:
                    (base_dir / f"{emp.nome} - {emp.id_empresa}").mkdir(parents=True, exist_ok=True)
                for und in unidades:
                    rotulo_emp = f"{emp.nome} - {emp.id_empresa}"
                    rotulo_und = f"{und.nome} - {und.id_unidade}"
                    res = montar_estrutura_unidade(str(base_dir), rotulo_emp, rotulo_und)
                    criadas_total.extend(res["criadas"]) 
                    existentes_total.extend(res["existentes"]) 
        
        # Fallback/Complemento: varre filesystem para qualquer empresa/unidade existente
        print("[INFO] Garantindo estrutura para empresas/unidades já existentes no filesystem...")
        for emp_dir in sorted([p for p in base_dir.iterdir() if p.is_dir()]):
            if emp_dir.name.startswith("_"):
                continue
            for und_dir in sorted([p for p in emp_dir.iterdir() if p.is_dir()]):
                rotulo_emp = emp_dir.name
                rotulo_und = und_dir.name
                res = montar_estrutura_unidade(str(base_dir), rotulo_emp, rotulo_und)
                criadas_total.extend(res["criadas"]) 
                existentes_total.extend(res["existentes"]) 
    finally:
        db.close()

    # Resumo
    print("\n===== RESUMO =====")
    print(f"Criadas: {len(criadas_total)}")
    print(f"Já existiam: {len(existentes_total)}")
    if criadas_total:
        print("- Exemplos criadas:")
        for p in criadas_total[:10]:
            print(f"  + {p}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
