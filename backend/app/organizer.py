from __future__ import annotations
from pathlib import Path
import shutil
from typing import List, Dict, Any, Tuple
from .id_utils import validar_nome_arquivo
from .fs_utils import subpasta_por_tipo
from . import models

def _unique_name(dest: Path) -> Path:
    if not dest.exists():
        return dest
    stem, suffix = dest.stem, dest.suffix
    i = 1
    while True:
        cand = dest.with_name(f"{stem} ({i}){suffix}")
        if not cand.exists():
            return cand
        i += 1

def _empresa_unidade_rotulos(db, unidade_id: int) -> Tuple[str, str, str]:
    und = db.get(models.Unidade, unidade_id)
    if not und:
        raise ValueError("unidade_id inválido")
    emp = db.get(models.Empresa, und.empresa_id)
    if not emp:
        raise ValueError("Empresa associada não encontrada")
    return f"{emp.nome} - {emp.id_empresa}", f"{und.nome} - {und.id_unidade}", emp.id_empresa

def preview_moves(db, base_dir: str, unidade_id: int, arquivos: List[str]) -> List[Dict[str, Any]]:
    empresa_rotulo, unidade_rotulo, _ = _empresa_unidade_rotulos(db, unidade_id)
    saida: List[Dict[str, Any]] = []

    for src in arquivos:
        src_path = Path(src)
        if not src_path.exists():
            saida.append({"origem": str(src_path), "valido": False, "motivo": "Arquivo não encontrado"})
            continue

        res = validar_nome_arquivo(src_path.name)
        if res["valido"]:
            tipo = res["tipo"]
            pasta_rel = subpasta_por_tipo(tipo)
            dest_dir = Path(base_dir) / empresa_rotulo / unidade_rotulo / pasta_rel
            dest = dest_dir / src_path.name
            saida.append({"origem": str(src_path), "destino": str(dest), "pasta_relativa": pasta_rel, "tipo_detectado": tipo, "valido": True})
        else:
            pasta_rel = "06 Documentos do Cliente"
            dest_dir = Path(base_dir) / empresa_rotulo / unidade_rotulo / pasta_rel
            dest = dest_dir / src_path.name
            saida.append({"origem": str(src_path), "destino": str(dest), "pasta_relativa": pasta_rel, "tipo_detectado": None, "valido": False, "motivo": "Nome fora do padrão"})

    return saida

def apply_moves(plan: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    resultados = []
    for p in plan:
        src = Path(p["origem"])
        dest = Path(p["destino"])
        dest.parent.mkdir(parents=True, exist_ok=True)
        final = _unique_name(dest)
        try:
            shutil.move(str(src), str(final))
            resultados.append({**p, "status": "OK", "destino_final": str(final)})
        except Exception as e:
            resultados.append({**p, "status": "ERRO", "erro": str(e)})
    return resultados
