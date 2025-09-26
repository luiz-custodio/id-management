#!/usr/bin/env python
"""Ensure every unidade has the LFRCAP001 folder under 04 CCEE - DRI."""
from __future__ import annotations

import argparse
from pathlib import Path
from typing import Iterable, Tuple, List


TARGET_SUBPATH = Path('04 CCEE - DRI') / 'LFRCAP001'


def iter_unidades(root: Path) -> Iterable[Tuple[Path, Path]]:
    """Yield (empresa_dir, unidade_dir) pairs under the root."""
    for empresa_dir in sorted((p for p in root.iterdir() if p.is_dir())):
        if empresa_dir.name.startswith('_'):
            continue
        for unidade_dir in sorted((p for p in empresa_dir.iterdir() if p.is_dir())):
            yield empresa_dir, unidade_dir


def ensure_folders(root: Path, *, dry_run: bool = False) -> dict:
    created: List[Path] = []
    already_ok: List[Path] = []
    parents_created: List[Path] = []

    for _, unidade_dir in iter_unidades(root):
        target = unidade_dir / TARGET_SUBPATH
        parent = target.parent

        if target.exists():
            already_ok.append(target)
            continue

        if not parent.exists():
            if not dry_run:
                parent.mkdir(parents=True, exist_ok=True)
            parents_created.append(parent)

        if not dry_run:
            target.mkdir(parents=True, exist_ok=True)
        created.append(target)

    return {
        'created': created,
        'parents_created': parents_created,
        'already_ok': already_ok,
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description='Guarantees 04 CCEE - DRI/LFRCAP001 for each unidade directory under ROOT.'
    )
    parser.add_argument(
        'root',
        nargs='?',
        default='B:/00_Nossos_Clientes',
        help='Base directory that contains the empresas (default: B:/00_Nossos_Clientes)'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Only report missing folders without creating them'
    )
    args = parser.parse_args()

    root = Path(args.root).expanduser()
    if not root.exists():
        parser.error(f'Base path does not exist: {root}')

    result = ensure_folders(root, dry_run=args.dry_run)

    created = result['created']
    parents_created = result['parents_created']
    already_ok = result['already_ok']

    print(f'Root: {root}')
    print(f'Unidades com LFRCAP001: {len(already_ok)}')
    if args.dry_run:
        print(f'Missing LFRCAP001 (would create): {len(created)}')
    else:
        print(f'LFRCAP001 criadas: {len(created)}')
    if parents_created:
        label = 'Pais criados (04 CCEE - DRI)' if not args.dry_run else '04 CCEE - DRI ausentes'
        print(f'{label}: {len(parents_created)}')

    if created:
        header = 'Pastas criadas' if not args.dry_run else 'Pastas ausentes'
        print(f'\n{header}:')
        for target in created:
            print(f'  - {target}')

    return 0


if __name__ == '__main__':
    raise SystemExit(main())
