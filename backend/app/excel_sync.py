"""Utilities to synchronize Empresas/Filiais with Planilha Mestre.xlsx."""
from __future__ import annotations

import logging
import os
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator, Optional, Set

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
    """Raised when EXCEL_MASTER_PATH is not configured."""


class ExcelSyncLockedError(ExcelSyncError):
    """Raised when the spreadsheet is opened/locked in Excel."""


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def _excel_path() -> Path:
    path_str = os.getenv(EXCEL_PATH_ENV, "").strip()
    if not path_str:
        raise ExcelSyncConfigError(
            "Variável EXCEL_MASTER_PATH não configurada."
        )
    path = Path(path_str)
    if not path.exists():
        raise ExcelSyncError(f"Planilha não encontrada: {path}")
    return path


@contextmanager
def _open_workbook() -> Iterator[tuple[Path, "Workbook"]]:
    from openpyxl.workbook import Workbook

    path = _excel_path()
    try:
        wb = load_workbook(path)
    except PermissionError as exc:
        raise ExcelSyncLockedError(
            "Não foi possível acessar a planilha. Feche o arquivo no Excel e tente novamente."
        ) from exc
    except OSError as exc:
        raise ExcelSyncError(f"Falha ao abrir a planilha: {exc}") from exc

    try:
        yield path, wb
        try:
            wb.save(path)
        except PermissionError as exc:
            raise ExcelSyncLockedError(
                "Não foi possível salvar a planilha. Feche o arquivo no Excel e tente novamente."
            ) from exc
        except OSError as exc:
            raise ExcelSyncError(f"Falha ao salvar a planilha: {exc}") from exc
    finally:
        try:
            wb.close()
        except Exception:
            pass


def _open_workbook_values() -> tuple[Path, "Workbook"]:
    path = _excel_path()
    try:
        wb = load_workbook(path, data_only=True)
    except PermissionError as exc:
        raise ExcelSyncLockedError(
            "Não foi possível acessar a planilha. Feche o arquivo no Excel e tente novamente."
        ) from exc
    except OSError as exc:
        raise ExcelSyncError(f"Falha ao abrir a planilha: {exc}") from exc
    return path, wb


def _normalize_id(value: Optional[object], *, width: int) -> str:
    if value is None:
        return "".zfill(width)
    try:
        text = str(value).strip()
    except Exception:
        text = str(value)
    if not text:
        return "".zfill(width)
    if text.endswith(".0") and text[:-2].isdigit():
        text = text[:-2]
    digits = "".join(ch for ch in text if ch.isdigit())
    if digits:
        text = digits
    try:
        number = int(text)
        return f"{number:0{width}d}"
    except ValueError:
        return text.zfill(width)


def _collect_ids(sheet_name: str, *, column: int, width: int) -> Set[str]:
    path, wb = _open_workbook_values()
    try:
        if sheet_name not in wb.sheetnames:
            raise ExcelSyncError(f"Planilha '{path}' não possui aba '{sheet_name}'")
        sheet = wb[sheet_name]
        ids: Set[str] = set()
        for row in sheet.iter_rows(min_row=2, values_only=True):
            if not row or len(row) <= column:
                continue
            normalized = _normalize_id(row[column], width=width)
            if normalized.strip("0"):
                ids.add(normalized)
        return ids
    finally:
        try:
            wb.close()
        except Exception:
            pass



def _sheet_name(env_name: str, default: str) -> str:
    return os.getenv(env_name, default)

def _empresa_exists(sheet: Worksheet, id_empresa: str) -> bool:
    normalized_id = _normalize_id(id_empresa, width=4)
    existing = _collect_ids(sheet.title, column=2, width=4)
    return normalized_id in existing


def _filial_exists(sheet: Worksheet, id_empresa: str, id_unidade: str) -> bool:
    normalized_emp = _normalize_id(id_empresa, width=4)
    normalized_unit = _normalize_id(id_unidade, width=3)
    path, wb = _open_workbook_values()
    try:
        sheet_values = wb[sheet.title]
        for row in sheet_values.iter_rows(min_row=2, values_only=True):
            if not row:
                continue
            emp_id = _normalize_id(row[1] if len(row) > 1 else None, width=4)
            unit_id = _normalize_id(row[2] if len(row) > 2 else None, width=3)
            if emp_id == normalized_emp and unit_id == normalized_unit:
                return True
        return False
    finally:
        try:
            wb.close()
        except Exception:
            pass


# ---------------------------------------------------------------------------
# public API
# ---------------------------------------------------------------------------

def append_empresa(nome: str, id_empresa: str) -> bool:
    sheet_name = _sheet_name(EMPRESAS_SHEET_ENV, DEFAULT_EMPRESAS_SHEET)
    try:
        with _open_workbook() as (path, workbook):
            if sheet_name not in workbook.sheetnames:
                raise ExcelSyncError(f"Planilha '{path}' não possui aba '{sheet_name}'")
            sheet = workbook[sheet_name]
            normalized_id = _normalize_id(id_empresa, width=4)
            if _empresa_exists(sheet, normalized_id):
                return False
            sheet.append([nome, None, normalized_id])
            return True
    except ExcelSyncConfigError:
        logger.info("EXCEL_MASTER_PATH não configurada; ignorando sync de Empresas")
        return False


def append_filial(
    nome_empresa: str,
    id_empresa: str,
    nome_unidade: str,
    id_unidade: str,
    *,
    base_dir: Optional[Path] = None,
) -> bool:
    sheet_name = _sheet_name(FILIAIS_SHEET_ENV, DEFAULT_FILIAIS_SHEET)
    try:
        with _open_workbook() as (path, workbook):
            if sheet_name not in workbook.sheetnames:
                raise ExcelSyncError(f"Planilha '{path}' não possui aba '{sheet_name}'")
            sheet = workbook[sheet_name]
            if _filial_exists(sheet, id_empresa, id_unidade):
                return False

            normalized_emp = _normalize_id(id_empresa, width=4)
            normalized_unit = _normalize_id(id_unidade, width=3)
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
                    logger.warning("Falha ao montar PATH da filial: %s", exc)
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
        logger.info("EXCEL_MASTER_PATH não configurada; ignorando sync de Filiais")
        return False
