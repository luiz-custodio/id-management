"""Utilities to synchronize newly created empresas/unidades with Planilha Mestre.xlsx."""
from __future__ import annotations

import logging
import os
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator, Optional

from openpyxl import load_workbook
from openpyxl.worksheet.worksheet import Worksheet

logger = logging.getLogger(__name__)

EXCEL_PATH_ENV = "EXCEL_MASTER_PATH"
EMPRESAS_SHEET_ENV = "EXCEL_SHEET_EMPRESAS"
FILIAIS_SHEET_ENV = "EXCEL_SHEET_FILIAIS"

DEFAULT_EMPRESAS_SHEET = "Empresas"
DEFAULT_FILIAIS_SHEET = "Filiais"


class ExcelSyncError(RuntimeError):
    """Base class for spreadsheet sync errors."""


class ExcelSyncConfigError(ExcelSyncError):
    """Raised when the spreadsheet path is not configured."""


class ExcelSyncLockedError(ExcelSyncError):
    """Raised when the spreadsheet is open/locked in Excel."""


def _excel_path() -> Path:
    path_str = os.getenv(EXCEL_PATH_ENV, "").strip()
    if not path_str:
        raise ExcelSyncConfigError(
            "Environment variable EXCEL_MASTER_PATH is not configured."
        )
    path = Path(path_str)
    if not path.exists():
        raise ExcelSyncError(f"Spreadsheet not found: {path}")
    return path


@contextmanager
def _open_workbook() -> Iterator[tuple[Path, "Workbook"]]:
    from openpyxl.workbook import Workbook  # local import to avoid heavy dependency globally

    path = _excel_path()
    try:
        workbook = load_workbook(path)
    except PermissionError as exc:
        raise ExcelSyncLockedError(
            "Não foi possível acessar a planilha. Feche o arquivo no Excel e tente novamente."
        ) from exc
    except OSError as exc:
        raise ExcelSyncError(f"Falha ao abrir a planilha: {exc}") from exc

    try:
        yield path, workbook
        try:
            workbook.save(path)
        except PermissionError as exc:
            raise ExcelSyncLockedError(
                "Não foi possível salvar a planilha. Feche o arquivo no Excel e tente novamente."
            ) from exc
        except OSError as exc:
            raise ExcelSyncError(f"Falha ao salvar a planilha: {exc}") from exc
    finally:
        try:
            workbook.close()
        except Exception:
            pass


def _normalize_id(value: object | None, *, width: int) -> str:
    if value is None:
        return "".zfill(width)
    try:
        text = str(value).strip()
    except Exception:
        text = str(value)
    if text.endswith(".0") and text[:-2].isdigit():
        text = text[:-2]
    digits = "".join(ch for ch in text if ch.isdigit())
    if digits:
        text = digits
    if not text:
        return "".zfill(width)
    try:
        number = int(text)
        return f"{number:0{width}d}"
    except ValueError:
        return text.zfill(width)


def _sheet_name(env_name: str, default: str) -> str:
    return os.getenv(env_name, default)


def _empresa_exists(sheet: Worksheet, id_empresa: str) -> bool:
    for row in sheet.iter_rows(min_row=2, values_only=True):
        if not row:
            continue
        current = _normalize_id(row[2] if len(row) > 2 else None, width=4)
        if current == id_empresa:
            return True
    return False


def _filial_exists(sheet: Worksheet, id_empresa: str, id_unidade: str) -> bool:
    for row in sheet.iter_rows(min_row=2, values_only=True):
        if not row:
            continue
        current_emp = _normalize_id(row[1] if len(row) > 1 else None, width=4)
        current_unit = _normalize_id(row[2] if len(row) > 2 else None, width=3)
        if current_emp == id_empresa and current_unit == id_unidade:
            return True
    return False


def append_empresa(nome: str, id_empresa: str) -> bool:
    """Append a row in the Empresas sheet. Returns True if a new row was added."""
    sheet_name = _sheet_name(EMPRESAS_SHEET_ENV, DEFAULT_EMPRESAS_SHEET)
    try:
        with _open_workbook() as (path, workbook):
            if sheet_name not in workbook.sheetnames:
                raise ExcelSyncError(
                    f"Spreadsheet '{path}' does not have sheet '{sheet_name}'"
                )
            sheet = workbook[sheet_name]
            normalized_id = _normalize_id(id_empresa, width=4)
            if _empresa_exists(sheet, normalized_id):
                return False
            sheet.append([nome, None, normalized_id])
            return True
    except ExcelSyncConfigError:
        logger.info("EXCEL_MASTER_PATH not configured; skipping Empresas sync")
        return False


def append_filial(
    nome_empresa: str,
    id_empresa: str,
    nome_unidade: str,
    id_unidade: str,
    *,
    base_dir: Optional[Path] = None,
) -> bool:
    """Append a row in the Filiais sheet. Returns True if a new row was added."""
    sheet_name = _sheet_name(FILIAIS_SHEET_ENV, DEFAULT_FILIAIS_SHEET)
    try:
        with _open_workbook() as (path, workbook):
            if sheet_name not in workbook.sheetnames:
                raise ExcelSyncError(
                    f"Spreadsheet '{path}' does not have sheet '{sheet_name}'"
                )

            sheet = workbook[sheet_name]
            normalized_emp = _normalize_id(id_empresa, width=4)
            normalized_unit = _normalize_id(id_unidade, width=3)
            if _filial_exists(sheet, normalized_emp, normalized_unit):
                return False

            code = f"E-{normalized_emp}-F-{normalized_unit}"
            path_value = ""
            if base_dir is not None:
                try:
                    full_path = (
                        Path(base_dir)
                        / f"{nome_empresa} - {normalized_emp}"
                        / f"{nome_unidade} - {normalized_unit}"
                    )
                    path_value = os.path.normpath(str(full_path))
                except Exception as exc:
                    logger.warning("Failed to build PATH for filial entry: %s", exc)
                    path_value = ""

            sheet.append([
                code,
                normalized_emp,
                normalized_unit,
                nome_empresa,
                nome_unidade,
                path_value,
            ])
            return True
    except ExcelSyncConfigError:
        logger.info("EXCEL_MASTER_PATH not configured; skipping Filiais sync")
        return False
