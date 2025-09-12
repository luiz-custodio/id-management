#!/usr/bin/env python
"""
Organiza faturas a partir de planilha de referência (CODE, Nome, Caminho).

Fluxo:
- Lê a planilha Excel (única aba) com colunas: CODE, Nome, Caminho
- Para cada linha: CODE no formato E-<id_empresa>-F-<id_unidade>, Nome = subpasta dentro de 0_FATURAS, Caminho = base onde procurar
- Se "Caminho" vier preenchido, a busca é restrita a esse caminho (ou caminhos); se vazio, varre
  B:\\00_Nossos_Clientes (configurável) e, para cada pasta de cliente (ignorando nomes que começam com "0"),
  procura recursivamente por "0_FATURAS/<Nome>" (case-insensitive e ignorando acentos)
- Coletar todos os arquivos (recursivo) dessa pasta-alvo, detectar FAT e copiar para o destino
  B:\\NOVO00_Nossos_Clientes/<Empresa Nome> - <id_emp>/<Unidade Nome> - <id_unidade>/02 Faturas/
  (nomes de empresa/unidade obtidos do banco via backend.app.models)
- Se o arquivo de destino já existir, pular e registrar no log
- Gera um CSV de log com ações realizadas e ocorrências

Observações:
- Detecção FAT usa backend.app.detection.detect_type_and_date, com extensão para permitir imagens
- Não altera planilhas nem banco; apenas lê
"""
from __future__ import annotations

import argparse
import csv
import os
import re
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable, Iterator, Optional, Dict, List, Tuple
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed


# --- Bootstrapping para importar módulos do repositório ---
def _repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _add_repo_to_syspath() -> None:
    sys.path.insert(0, str(_repo_root()))


_add_repo_to_syspath()

# Agora podemos importar backend e dependências
import pandas as pd  # type: ignore
from backend.app.detection import detect_type_and_date
from dotenv import load_dotenv
from sqlalchemy import create_engine, String, Integer
from sqlalchemy.orm import declarative_base, mapped_column, Session

# Carrega variáveis de ambiente priorizando Postgres (.env.docker), sem forçar SQLite
try:
    load_dotenv(_repo_root() / '.env', override=False)
    load_dotenv(_repo_root() / 'backend' / '.env', override=False)
    load_dotenv(_repo_root() / 'backend' / '.env.docker', override=True)
except Exception:
    pass

Base = declarative_base()

class Empresa(Base):
    __tablename__ = 'empresas'
    id = mapped_column(Integer, primary_key=True)
    id_empresa = mapped_column(String(4))
    nome = mapped_column(String)

class Unidade(Base):
    __tablename__ = 'unidades'
    id = mapped_column(Integer, primary_key=True)
    id_unidade = mapped_column(String(3))
    nome = mapped_column(String)
    empresa_id = mapped_column(Integer)

def _sqlite_url_from_path(path_str: str) -> str:
    p = Path(path_str)
    if not p.is_absolute():
        p = (_repo_root() / path_str).resolve()
    return f"sqlite:///{p.as_posix()}"


def _get_db_url(override: str | None = None) -> str:
    import os
    if override:
        if re.match(r"^[a-zA-Z0-9+]+://", override):
            return override
        return _sqlite_url_from_path(override)
    db = os.environ.get('DATABASE_URL')
    if db:
        return db
    host = os.environ.get('POSTGRES_HOST')
    if host:
        port = os.environ.get('POSTGRES_PORT', '5432')
        name = os.environ.get('POSTGRES_DB', 'id_management')
        user = os.environ.get('POSTGRES_USER', 'id_user')
        pwd = os.environ.get('POSTGRES_PASSWORD', 'id_secure_2025')
        return f"postgresql://{user}:{pwd}@{host}:{port}/{name}"
    # Fallback para SQLite local do backend
    sqlite_path = (_repo_root() / 'backend' / 'ids.db').resolve().as_posix()
    return f"sqlite:///{sqlite_path}"

def _open_session(db_url_override: str | None = None) -> Session:
    engine = create_engine(_get_db_url(db_url_override))
    return Session(bind=engine)


IMG_EXTS = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tif', '.tiff'}
EXCLUDE_EXTS = {'.tmp', '.db', '.lnk', '.ds_store', '.ini', '.log', '.bak', '.old'}
PRUNE_DIRS = {'.git', '.idea', 'node_modules', 'venv', '__pycache__'}


def _strip_accents(s: str) -> str:
    try:
        import unicodedata as _ud
        return "".join(c for c in _ud.normalize("NFD", s) if _ud.category(c) != "Mn")
    except Exception:
        return s


def _norm(s: str) -> str:
    """Normaliza para comparação: sem acentos, lowercase, espaços/sep compactados."""
    s2 = _strip_accents(str(s or "")).lower()
    s2 = re.sub(r"[\s_-]+", " ", s2).strip()
    return s2


def _parse_code(code: str) -> tuple[str, str]:
    """Extrai (id_empresa, id_unidade) de 'E-xxxx-F-yyy', aceitando sem zero padding."""
    m = re.match(r"^e\s*-\s*(\d+)\s*-\s*f\s*-\s*(\d+)$", str(code or "").strip(), re.IGNORECASE)
    if not m:
        raise ValueError(f"CODE inválido: {code}")
    id_emp = f"{int(m.group(1)):04d}"
    id_un = f"{int(m.group(2)):03d}"
    return id_emp, id_un


def _iter_client_roots(base: Path) -> Iterator[Path]:
    for entry in base.iterdir():
        if not entry.is_dir():
            continue
        name = entry.name
        if name and name[0] == '0':
            # Ignorar pastas que começam com "0" na RAIZ
            continue
        yield entry


def _find_faturas_named_folder(client_root: Path, wanted_name: str) -> list[Path]:
    """
    Procura recursivamente por pastas '0_FATURAS/<wanted_name>' dentro de client_root,
    com comparação tolerante (case-insensitive e sem acentos).
    Não exige '0_RESULTADOS' no caminho; apenas considera o segmento pai '0_FATURAS'.
    """
    target_norm = _norm(wanted_name)
    found: list[Path] = []
    for root, dirs, _files in os.walk(client_root):
        # Verifica se este nível possui uma pasta "0_FATURAS"
        for d in dirs:
            if _norm(d) == _norm('0_faturas'):
                faturas_dir = Path(root) / d
                try:
                    for sub in faturas_dir.iterdir():
                        if sub.is_dir() and _norm(sub.name) == target_norm:
                            found.append(sub)
                except Exception:
                    pass
        # Pequena otimização: se o caminho atual já é uma pasta 0_FATURAS, também checar direto
        base = Path(root).name
        if _norm(base) == _norm('0_faturas'):
            try:
                for sub in Path(root).iterdir():
                    if sub.is_dir() and _norm(sub.name) == target_norm:
                        p = sub
                        if p not in found:
                            found.append(p)
            except Exception:
                pass
    return found


# Indexador: mapeia nome normalizado (subpasta) -> lista de caminhos sob qualquer '0_FATURAS' na base
_index_cache: Dict[str, Dict[str, List[Path]]] = {}

def _build_index_for_base(base: Path) -> Dict[str, List[Path]]:
    base_key = str(base.resolve())
    if base_key in _index_cache:
        return _index_cache[base_key]
    index: Dict[str, List[Path]] = {}
    # Walk com os.scandir e poda
    stack: List[Path] = [base]
    while stack:
        cur = stack.pop()
        try:
            with os.scandir(cur) as it:
                for entry in it:
                    try:
                        if not entry.is_dir(follow_symlinks=False):
                            continue
                        name = entry.name
                        nname = _norm(name)
                        if nname in PRUNE_DIRS:
                            continue
                        if nname == _norm('0_faturas'):
                            # indexa os filhos imediatos
                            try:
                                with os.scandir(entry.path) as it2:
                                    for sub in it2:
                                        try:
                                            if sub.is_dir(follow_symlinks=False):
                                                key = _norm(sub.name)
                                                index.setdefault(key, []).append(Path(sub.path))
                                        except Exception:
                                            pass
                            except Exception:
                                pass
                            # Não precisa descer dentro de 0_FATURAS (apenas subpastas importam)
                            continue
                        # Descer
                        stack.append(Path(entry.path))
                    except Exception:
                        continue
        except Exception:
            continue
    _index_cache[base_key] = index
    return index


def _iter_files_recursive(folder: Path) -> Iterator[Path]:
    for root, _dirs, files in os.walk(folder):
        for f in files:
            p = Path(root) / f
            if p.is_file():
                yield p


def _is_fat_with_images_aware(p: Path, last_modified_ms: Optional[float]) -> tuple[bool, Optional[str]]:
    """Retorna (is_fat, detected_ym). Permite imagens se nome casar com padrões FAT."""
    dtype, dym, _score, _reason = detect_type_and_date(p.name, last_modified_ms)
    if dtype == 'FAT' and dym:
        return True, dym
    # Extensão imagem? Aceita se nome for 'YYYY-MM' ou 'FAT-YYYY-MM' ou 'YYYY-MM ... (fatura|icms)'
    if p.suffix.lower() in IMG_EXTS:
        name = p.stem  # sem extensão
        name_norm = _strip_accents(name).lower()
        m1 = re.match(r"^(\d{4})-(0[1-9]|1[0-2])($|[^0-9])", name_norm)
        m2 = re.match(r"^fat-(\d{4})-(0[1-9]|1[0-2])($|[^0-9])", name_norm)
        if m2 or m1:
            ym = f"{m2.group(1)}-{m2.group(2)}" if m2 else f"{m1.group(1)}-{m1.group(2)}"
            return True, ym
        # 'YYYY-MM ... fatura|icms'
        m3 = re.match(r"^(\d{4})-(0[1-9]|1[0-2]).*", name_norm)
        if m3 and ("fatura" in name_norm or "icms" in name_norm):
            ym = f"{m3.group(1)}-{m3.group(2)}"
            return True, ym
    return False, None


def _fast_detect_fat(p: Path) -> Tuple[bool, Optional[str]]:
    name = _strip_accents(p.stem).lower()
    # Padrões rápidos
    m = re.match(r"^(?:fat[-_ ]*)?(\d{4})[-_](0[1-9]|1[0-2])($|[^0-9])", name)
    if m:
        return True, f"{m.group(1)}-{m.group(2)}"
    if re.match(r"^(\d{4})[-_](0[1-9]|1[0-2]).*(fatura|icms)", name):
        g = re.match(r"^(\d{4})[-_](0[1-9]|1[0-2])", name)
        if g:
            return True, f"{g.group(1)}-{g.group(2)}"
    return False, None


@dataclass
class LogRow:
    code: str
    cliente_root: str
    source_dir: str
    file: str
    status: str
    message: str
    dest_path: str


def run(orig_root: Path, dest_root: Path, xlsx_path: Path, dry_run: bool = False, quiet: bool = False, db_url_override: str | None = None,
        workers: Optional[int] = None, fast_detect: bool = True) -> int:
    # Preparar logs em tempo real
    logs_dir = _repo_root() / 'scripts' / 'logs'
    logs_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime('%Y%m%d-%H%M%S')
    out_txt = logs_dir / f'organizar_faturas_{ts}.log'

    def _rt(msg: str) -> None:
        if not quiet:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)
        try:
            with open(out_txt, 'a', encoding='utf-8') as f:
                f.write(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}\n")
        except Exception:
            pass

    _rt(f"Início | origem={orig_root} destino={dest_root} planilha={xlsx_path} dry_run={dry_run} db={_get_db_url(db_url_override)}")
    df = pd.read_excel(xlsx_path)
    # Validar colunas
    cols = {c.lower(): c for c in df.columns}
    if 'code' not in cols or 'nome' not in cols:
        print(f"[ERRO] Planilha precisa ter colunas 'CODE' e 'Nome'. Colunas encontradas: {list(df.columns)}")
        _rt("ERRO: Planilha deve conter colunas 'CODE' e 'Nome'")
        return 2
    col_code = cols['code']
    col_nome = cols['nome']
    col_caminho = cols.get('caminho') or cols.get('caminho (opcional)')

    # Abre sessão de banco para mapear nomes (Postgres preferido; fallback SQLite)
    db = _open_session(db_url_override)
    logs: list[LogRow] = []
    # Pré-carregar empresas/unidades em memória (cache)
    emp_by_code: Dict[str, Empresa] = {}
    und_by_key: Dict[Tuple[int, str], Unidade] = {}
    try:
        for e in db.query(Empresa).all():
            emp_by_code[str(e.id_empresa)] = e
        for u in db.query(Unidade).all():
            und_by_key[(int(u.empresa_id), str(u.id_unidade))] = u
    except Exception:
        pass
    try:
        for _, row in df.iterrows():
            code_raw = str(row.get(col_code, '')).strip()
            nome_raw = str(row.get(col_nome, '')).strip()
            if not code_raw or not nome_raw:
                continue
            try:
                id_emp, id_un = _parse_code(code_raw)
            except Exception as e:
                logs.append(LogRow(code_raw, '', '', '', 'ERRO', f'CODE inválido: {e}', ''))
                _rt(f"CODE inválido: {code_raw} -> {e}")
                continue

            # Empresa/Unidade
            emp = emp_by_code.get(id_emp)
            if not emp:
                logs.append(LogRow(code_raw, '', '', '', 'ERRO', f'Empresa {id_emp} não encontrada no banco', ''))
                _rt(f"Empresa não encontrada no banco: {id_emp} (code={code_raw})")
                continue
            und = und_by_key.get((int(emp.id), id_un))
            if not und:
                logs.append(LogRow(code_raw, '', '', '', 'ERRO', f'Unidade {id_un} da empresa {id_emp} não encontrada', ''))
                _rt(f"Unidade não encontrada no banco: {id_un} da empresa {id_emp} (code={code_raw})")
                continue

            # Destino
            unit_base = dest_root / f"{emp.nome} - {emp.id_empresa}" / f"{und.nome} - {und.id_unidade}"
            dest_fat = unit_base / "02 Faturas"
            _rt(f"Processando CODE={code_raw} -> {emp.nome} - {emp.id_empresa} / {und.nome} - {und.id_unidade} | subpasta='0_FATURAS/{nome_raw}'")

            # Determinar bases de busca
            search_bases: list[Path] = []
            caminho_raw = str(row.get(col_caminho, '')).strip() if col_caminho else ''
            if caminho_raw:
                # Suporta múltiplos caminhos separados por ';' ou quebra de linha
                parts = re.split(r"[\r\n;]+", caminho_raw)
                for p_str in parts:
                    p_str = p_str.strip()
                    if not p_str:
                        continue
                    p = Path(p_str)
                    if not p.is_absolute():
                        p = orig_root / p
                    if p.exists() and p.is_dir():
                        search_bases.append(p)
                    else:
                        logs.append(LogRow(code_raw, p_str, '', '', 'CAMINHO_INVALIDO', 'Caminho inexistente ou não é pasta', ''))
                        _rt(f" CAMINHO inválido (ignorado): {p_str}")
            else:
                # Fallback: varrer raiz padrão por cliente
                search_bases = list(_iter_client_roots(orig_root))

            # Percorrer bases de origem (indexa cada base uma vez)
            for client_root in search_bases:
                _rt(f" Cliente/base: {client_root}")
                # Encontrar pastas 0_FATURAS/<Nome> via índice
                index = _build_index_for_base(client_root)
                key = _norm(nome_raw)
                matches = index.get(key, [])
                if not matches:
                    # Apenas anota uma vez por cliente que não possui a subpasta
                    logs.append(LogRow(code_raw, str(client_root), '', '', 'SUBPASTA_NAO_ENCONTRADA', f"0_FATURAS/{nome_raw}", str(dest_fat)))
                    _rt(f"  Subpasta não encontrada: 0_FATURAS/{nome_raw}")
                    continue
                else:
                    _rt(f"  Encontradas {len(matches)} pasta(s) alvo")

                # Preparar tarefas de cópia em paralelo
                tasks: List[Tuple[Path, Path, Path, Path]] = []  # (src_file, dest_file, client_root, src_dir)
                seen_targets: set[str] = set()
                for src_dir in matches:
                    _rt(f"   Pasta-alvo: {src_dir}")
                    any_file = False
                    for file_path in _iter_files_recursive(src_dir):
                        any_file = True
                        ext_lower = file_path.suffix.lower()
                        if ext_lower in EXCLUDE_EXTS:
                            continue
                        try:
                            st = file_path.stat()
                            last_mod_ms = st.st_mtime * 1000.0
                        except Exception:
                            last_mod_ms = None

                        if fast_detect:
                            ok, ym = _fast_detect_fat(file_path)
                            if not ok:
                                ok, ym = _is_fat_with_images_aware(file_path, last_mod_ms)
                        else:
                            ok, ym = _is_fat_with_images_aware(file_path, last_mod_ms)
                        if not ok:
                            logs.append(LogRow(code_raw, str(client_root), str(src_dir), str(file_path), 'IGNORADO', 'Nao é FAT', ''))
                            continue

                        # Nome destino
                        ext = file_path.suffix
                        new_name = f"FAT-{ym}{ext}" if ym else file_path.name
                        dest_file = dest_fat / new_name

                        key = str(dest_file).lower()
                        if key in seen_targets:
                            logs.append(LogRow(code_raw, str(client_root), str(src_dir), str(file_path), 'DUPLICATE_TARGET', 'Mesmo destino em lote', str(dest_file)))
                            continue
                        seen_targets.add(key)

                        if dest_file.exists():
                            logs.append(LogRow(code_raw, str(client_root), str(src_dir), str(file_path), 'PULADO', 'Já existia no destino', str(dest_file)))
                            continue

                        if dry_run:
                            logs.append(LogRow(code_raw, str(client_root), str(src_dir), str(file_path), 'DRY_RUN', 'Copiaria para destino', str(dest_file)))
                        else:
                            tasks.append((file_path, dest_file, client_root, src_dir))

                    if not any_file:
                        logs.append(LogRow(code_raw, str(client_root), str(src_dir), '', 'VAZIO', 'Sem arquivos na subpasta', str(dest_fat)))

                # Execução paralela
                if tasks and not dry_run:
                    max_workers = workers or max(4, min(16, (os.cpu_count() or 4) * 2))
                    lock = threading.Lock()

                    def _copy_one(src: Path, dst: Path) -> Tuple[bool, str]:
                        try:
                            os.makedirs(dst.parent, exist_ok=True)
                            import shutil
                            shutil.copyfile(str(src), str(dst))  # sem metadata
                            return True, ''
                        except Exception as e:
                            return False, str(e)

                    with ThreadPoolExecutor(max_workers=max_workers) as ex:
                        futs = {ex.submit(_copy_one, s, d): (s, d, cr, sd) for (s, d, cr, sd) in tasks}
                        for fut in as_completed(futs):
                            s, d, cr, sd = futs[fut]
                            ok, err = fut.result()
                            if ok:
                                with lock:
                                    logs.append(LogRow(code_raw, str(cr), str(sd), str(s), 'COPIADO', 'OK', str(d)))
                            else:
                                with lock:
                                    logs.append(LogRow(code_raw, str(cr), str(sd), str(s), 'ERRO', f'Falha ao copiar: {err}', str(d)))
    finally:
        db.close()

    # Salvar log CSV
    out_csv = logs_dir / f'organizar_faturas_{ts}.csv'
    with open(out_csv, 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(['code', 'cliente_root', 'source_dir', 'file', 'status', 'message', 'dest_path'])
        for r in logs:
            w.writerow([r.code, r.cliente_root, r.source_dir, r.file, r.status, r.message, r.dest_path])

    # Resumo
    total = len([r for r in logs if r.status in {'COPIADO', 'PULADO', 'DRY_RUN'}])
    cop = len([r for r in logs if r.status == 'COPIADO'])
    pul = len([r for r in logs if r.status == 'PULADO'])
    ign = len([r for r in logs if r.status == 'IGNORADO'])
    _rt(f"Log CSV salvo em: {out_csv}")
    _rt(f"Resumo: total avaliados={total}, copiados={cop}, pulados={pul}, ignorados (não FAT)={ign}")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description='Organiza faturas (FAT) a partir de planilha CODE/Nome/Caminho')
    parser.add_argument('--orig-root', default=r'B:\\00_Nossos_Clientes', help='Raiz de origem (padrão: B:\\00_Nossos_Clientes)')
    parser.add_argument('--dest-root', default=r'B:\\NOVO00_Nossos_Clientes', help='Raiz de destino (padrão: B:\\NOVO00_Nossos_Clientes)')
    parser.add_argument('--xlsx', default=r'C:\\Users\\luiz\\Documents\\projetos\\id-management\\data\\datas.xlsx', help='Caminho da planilha (padrão: data\\datas.xlsx)')
    parser.add_argument('--dry-run', action='store_true', help='Não copia arquivos; apenas registra no log')
    parser.add_argument('--quiet', action='store_true', help='Silencia logs em tempo real (ainda grava .log e CSV)')
    parser.add_argument('--db', default=str((_repo_root() / 'backend' / 'ids.db').resolve()), help='URL do banco (postgresql://...) ou caminho para SQLite (padrão: backend/ids.db)')
    parser.add_argument('--test-db', action='store_true', help='Somente testa conexão com banco e lista exemplos')
    parser.add_argument('--workers', type=int, help='Número de threads para cópia paralela (default: 2x CPUs, máx 16)')
    parser.add_argument('--no-fast-detect', action='store_true', help='Desabilita detecção rápida baseada em regex no nome')
    args = parser.parse_args(argv)

    orig = Path(args.orig_root)
    dest = Path(args.dest_root)
    xlsx = Path(args.xlsx)

    if args.test_db:
        # Testa conexão e imprime algumas linhas
        sess = _open_session(args.db)
        try:
            emps = sess.query(Empresa).limit(5).all()
            unds = sess.query(Unidade).limit(5).all()
            print('[DB] URL:', _get_db_url(args.db))
            print('[DB] empresas:', [(e.id, e.id_empresa, e.nome) for e in emps])
            print('[DB] unidades:', [(u.id, u.id_unidade, u.nome, u.empresa_id) for u in unds])
            return 0
        finally:
            sess.close()

    if not xlsx.exists():
        print(f"[ERRO] Planilha não encontrada: {xlsx}")
        return 2
    if not orig.exists():
        print(f"[ERRO] Origem não encontrada: {orig}")
        return 2
    if not args.dry_run:
        dest.mkdir(parents=True, exist_ok=True)

    return run(orig, dest, xlsx, dry_run=args.dry_run, quiet=args.quiet, db_url_override=args.db,
               workers=args.workers, fast_detect=not args.no_fast_detect)


if __name__ == '__main__':
    raise SystemExit(main())
