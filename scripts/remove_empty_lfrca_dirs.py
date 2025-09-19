#!/usr/bin/env python3
"""Remove empty LFRCA001 directories under a root tree."""

import argparse
import os
from pathlib import Path

TARGET_NAME = "LFRCA001"
DEFAULT_ROOT = Path(r"B:\00_Nossos_Clientes")

def iter_target_dirs(root: Path):
    for current_root, dirs, _ in os.walk(root):
        for name in dirs:
            if name == TARGET_NAME:
                yield Path(current_root) / name

def remove_if_empty(path: Path, dry_run: bool) -> tuple[bool, bool]:
    try:
        entries = list(path.iterdir())
    except OSError as exc:
        print(f"Não foi possível ler '{path}': {exc}")
        return False, False

    if entries:
        print(f"Pasta '{path}' não removida: contém {len(entries)} item(s).")
        return False, True

    if dry_run:
        print(f"Pasta vazia encontrada (dry-run): '{path}'")
        return False, False

    try:
        path.rmdir()
    except OSError as exc:
        print(f"Falha ao remover '{path}': {exc}")
        return False, False

    print(f"Pasta removida: '{path}'")
    return True, False

def main():
    parser = argparse.ArgumentParser(
        description=(
            "Procura recursivamente por pastas chamadas LFRCA001 e as remove se estiverem vazias."
        )
    )
    parser.add_argument(
        "--root",
        type=Path,
        default=DEFAULT_ROOT,
        help=f"Diretório base para procurar (padrão: {DEFAULT_ROOT}).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Mostra o que seria removido sem tocar nas pastas.",
    )

    args = parser.parse_args()

    root = args.root
    if not root.exists():
        print(f"Diretório raiz '{root}' não encontrado.")
        raise SystemExit(1)

    total = 0
    removed = 0
    non_empty = 0

    for target_dir in iter_target_dirs(root):
        total += 1
        was_removed, not_empty = remove_if_empty(target_dir, args.dry_run)
        removed += int(was_removed)
        non_empty += int(not_empty)

    if total == 0:
        print(f"Nenhuma pasta '{TARGET_NAME}' encontrada em '{root}'.")
    else:
        print(
            f"Processadas {total} pasta(s) '{TARGET_NAME}'. Removidas: {removed}. Com conteúdo: {non_empty}."
        )
        if args.dry_run and removed:
            print("Obs.: nenhuma pasta foi removida porque --dry-run está ativo.")

if __name__ == "__main__":
    main()
