#!/usr/bin/env python3

import argparse
import os
from pathlib import Path

OLD_NAME = "LFRCA001"
NEW_NAME = "LFRCAP001"
DEFAULT_ROOT = Path(r"B:\00_Nossos_Clientes")

def rename_directories(root: Path, dry_run: bool = False) -> int:
    if not root.exists():
        print(f"Root path '{root}' does not exist.")
        return 1

    found = False
    errors = 0

    for current_root, dirs, _ in os.walk(root, topdown=False):
        for name in dirs:
            if name != OLD_NAME:
                continue
            found = True
            src = Path(current_root) / name
            dst = src.with_name(NEW_NAME)

            if dry_run:
                print(f"Would rename '{src}' -> '{dst}'")
                continue

            if dst.exists():
                errors += 1
                print(f"Skipping '{src}' because '{dst}' already exists.")
                continue

            try:
                src.rename(dst)
            except OSError as exc:
                errors += 1
                print(f"Failed to rename '{src}' -> '{dst}': {exc}")
            else:
                print(f"Renamed '{src}' -> '{dst}'")

    if not found:
        print(f"No directories named '{OLD_NAME}' found under '{root}'.")
    elif errors:
        print(f"Completed with {errors} error(s). Check messages above.")

    return 1 if errors and not dry_run else 0

def main():
    parser = argparse.ArgumentParser(
        description="Rename directories named LFRCA001 to LFRCAP001 recursively."
    )
    parser.add_argument(
        "--root",
        type=Path,
        default=DEFAULT_ROOT,
        help=f"Base path to scan (default: {DEFAULT_ROOT}).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show rename operations without applying them.",
    )
    args = parser.parse_args()
    raise SystemExit(rename_directories(args.root, dry_run=args.dry_run))


if __name__ == "__main__":
    main()
