from fastapi import APIRouter, HTTPException, Depends
from fastapi import UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import shutil
from pathlib import Path
from datetime import datetime
import re
import json

from ..database import get_db
from ..models import Empresa, Unidade
from ..schemas import (
    BatchAnalysisRequest, BatchAnalysisResponse, BatchFileItem,
    BatchProcessRequest, BatchProcessResponse, BatchProcessResult,
    FolderStructure
)
from ..detection import detect_type_and_date, suggest_new_name, top_level_folder

router = APIRouter(prefix="/batch", tags=["batch-organize"])

@router.post("/analyze", response_model=BatchAnalysisResponse)
async def analyze_files(request: BatchAnalysisRequest, db: Session = Depends(get_db)):
    """Analisa uma lista de arquivos e separa em detectados e não detectados"""
    
    # Buscar empresa e unidade
    empresa = db.query(Empresa).filter(Empresa.id == request.empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    unidade = db.query(Unidade).filter(
        Unidade.id == request.unidade_id,
        Unidade.empresa_id == request.empresa_id
    ).first()
    if not unidade:
        raise HTTPException(status_code=404, detail="Unidade não encontrada")
    
    # Processar arquivos
    detected_files = []
    undetected_files = []
    
    for file_data in request.files:
        filename = file_data.name
        file_path = file_data.path
        file_size = file_data.size
        last_modified = file_data.last_modified
        
        # IGNORAR COMPLETAMENTE: Arquivos dentro da pasta "6_RELATÓRIOS" e TODAS suas subpastas
        path_lower = (file_path or "").lower()
        path_norm = (file_path or "").encode('ascii', 'ignore').decode('ascii').lower()
        # Regex robusta: (^|/|\)0*6[_ -]*relatorios(/|\|$)
        relatorios_re = re.compile(r"(^|[\\/])0*6[\s_-]*relatorios([\\/]|$)")
        resultados_re = re.compile(r"(^|[\\/])0+[\s_-]*resultados([\\/]|$)")
        if relatorios_re.search(path_norm) or resultados_re.search(path_norm):
            # Arquivo está na pasta 6_RELATÓRIOS (qualquer variação) ou subpastas: ignorar
            continue

        # Mapeamentos diretos por pasta de origem (sem renomear)
        # Regras solicitadas:
        #  - tudo em 1_BM ENERGIA -> "05 BM Energia"
        #  - tudo em 2_{nome do cliente} -> "06 Documentos do Cliente"
        #  - tudo em 3_ distribuidora -> "10 Distribuidora"
        #  - tudo em 4_CCEE -> "09 CCEE - Modelagem"
        #  - tudo em 5_PROJETOS -> "07 Projetos"
        #  - tudo em 7_COMERCIALIZADORAS -> "08 Comercializadoras"
        # Detecção robusta com normalização ASCII + insensível a maiúsculas e variações com 0 e separadores
        # Extrai primeiro segmento da pasta de origem (para evitar falsos positivos em nomes de arquivo)
        def _first_segment(raw: str) -> str:
            try:
                s = re.split(r"[\\/]+", raw or "")
                for seg in s:
                    if seg:
                        return seg
                return ""
            except Exception:
                return ""

        # Considera como 'pasta de origem' somente se houver pelo menos um separador no caminho
        has_dir_sep = bool(re.search(r"[\\/]", file_path or ""))
        first_seg_raw = _first_segment(file_path or "") if has_dir_sep else ""
        # Normalizado (sem acento/caixa) a partir do caminho normalizado geral
        try:
            parts_norm = [p for p in re.split(r"[\\/]+", path_norm or "") if p]
            first_seg_norm = parts_norm[0] if parts_norm else ""
        except Exception:
            first_seg_norm = ""

        direct_target = None
        try:
            # Helpers de regex por pasta – aplicados SOMENTE ao primeiro segmento
            re_1_bm = re.compile(r"^0*1[\s_-]*bm[\s_-]*energia$")
            # 2_{nome do cliente}: precisa de separador após o '2' para evitar casar com '2019-...'
            re_2_cli = re.compile(r"^0*2[\s_-].+")
            # 3_{distribuidora}: nome livre aps '3_'
            re_3_dist = re.compile(r"^0*3[\s_-].+")
            re_4_ccee = re.compile(r"^0*4[\s_-]*ccee$")
            re_5_proj = re.compile(r"^0*5[\s_-]*projetos?$")
            re_7_com  = re.compile(r"^0*7[\s_-]*comercializadora(s)?$")

            seg = first_seg_norm
            if seg and re_1_bm.match(seg):
                direct_target = "05 BM Energia"
            elif seg and re_2_cli.match(seg):
                direct_target = "06 Documentos do Cliente"
            elif seg and re_3_dist.match(seg):
                direct_target = "10 Distribuidora"
            elif seg and re_4_ccee.match(seg):
                direct_target = "09 CCEE - Modelagem"
            elif seg and re_5_proj.match(seg):
                direct_target = "07 Projetos"
            elif seg and re_7_com.match(seg):
                direct_target = "08 Comercializadoras"
        except Exception:
            direct_target = None

        if direct_target:
            # Sem renomear: mantém o nome original
            detected_files.append(BatchFileItem(
                name=filename,
                path=file_path,
                size=file_size,
                is_detected=True,
                detected_type="DIRECT",
                target_folder=direct_target,
                new_name=filename,
                source_folder=first_seg_raw or None,
            ))
            continue

        # Detectar tipo (centralizado)
        detected_type, detected_date, _score, _reason = detect_type_and_date(filename, last_modified)

        if detected_type:
            # Pasta de destino (como era antes):
            # - Para CCEE com código no nome, envia para "04 CCEE - DRI/<COD>"
            # - Para CCEE-BOLETOCA, envia para "04 CCEE - DRI/BOLETOCA"
            # - Demais: pasta de nível superior conforme mapeamento
            target_folder = top_level_folder(detected_type)

            # Complemento para subpastas CCEE (CFZ003, GFN001, BOLETOCA, ND)
            if detected_type.upper().startswith("CCEE"):
                # BOLETOCA sempre vai para subpasta dedicada
                if detected_type.upper() == "CCEE-BOLETOCA":
                    target_folder = os.path.join(target_folder, "BOLETOCA")
                else:
                    m_code = re.match(r"^CCEE-([A-Z]+\d{3}|ND)-", filename, re.IGNORECASE)
                    if m_code:
                        code = m_code.group(1).upper()
                        target_folder = os.path.join(target_folder, code)

            # Padronização de nomes por tipo com base na data detectada
            ext = os.path.splitext(filename)[1]
            if detected_date and detected_type in {"FAT", "REL", "RES", "EST", "ICMS-DEVEC", "ICMS-LDO", "ICMS-REC", "NE-CP", "NE-LP", "NE-VE", "NE-CPC", "NE-LPC"}:
                new_name = f"{detected_type}-{detected_date}{ext}"
            else:
                # Mantém heurística existente (ex.: CCEE com código permanece como no nome original; BOLETOCA tem regra própria)
                new_name = suggest_new_name(detected_type, filename, last_modified)
            # Força padronização em todos os tipos não-CCEE quando data detectada existir
            if detected_date and detected_type and not detected_type.upper().startswith("CCEE"):
                new_name = f"{detected_type}-{detected_date}{ext}"

            detected_files.append(BatchFileItem(
                name=filename,
                path=file_path,
                size=file_size,
                is_detected=True,
                detected_type=detected_type,
                target_folder=target_folder,
                new_name=new_name,
                source_folder=first_seg_raw or None,
            ))
        else:
            undetected_files.append(BatchFileItem(
                name=filename,
                path=file_path,
                size=file_size,
                is_detected=False,
                source_folder=first_seg_raw or None,
            ))
    
    # Construir caminho base (sempre inclui a unidade, como na estrutura oficial)
    base_path = f"cliente/{empresa.nome} - {empresa.id_empresa}/{unidade.nome} - {unidade.id_unidade}"
    
    return BatchAnalysisResponse(
        detected_files=detected_files,
        undetected_files=undetected_files,
        empresa_info=f"{empresa.nome} ({empresa.id_empresa})",
        unidade_info=f"{unidade.nome} ({unidade.id_unidade})",
        base_path=base_path
    )

@router.post("/process", response_model=BatchProcessResponse)
async def process_files(request: BatchProcessRequest, db: Session = Depends(get_db)):
    """Processa e organiza os arquivos nas pastas corretas"""
    
    # Buscar empresa e unidade
    empresa = db.query(Empresa).filter(Empresa.id == request.empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    unidade = db.query(Unidade).filter(
        Unidade.id == request.unidade_id,
        Unidade.empresa_id == request.empresa_id
    ).first()
    if not unidade:
        raise HTTPException(status_code=404, detail="Unidade não encontrada")
    
    results = []
    successful_count = 0
    
    for operation in request.operations:
        try:
            # Verificar se arquivo de origem existe
            if not os.path.exists(operation.source_path):
                results.append(BatchProcessResult(
                    original_name=operation.original_name,
                    new_name=operation.new_name,
                    target_path=operation.target_path,
                    success=False,
                    error="Arquivo de origem não encontrado"
                ))
                continue
            
            # Criar diretório de destino se não existir
            target_path = Path(operation.target_path)
            target_dir = target_path.parent
            target_dir.mkdir(parents=True, exist_ok=True)

            # Resolver conflito de nome (não sobrescrever arquivos existentes)
            final_path = target_path
            if final_path.exists():
                base = final_path.stem
                ext = final_path.suffix
                i = 1
                while True:
                    candidate = target_dir / f"{base}-{i}{ext}"
                    if not candidate.exists():
                        final_path = candidate
                        break
                    i += 1

            # Copiar arquivo
            shutil.copy2(operation.source_path, final_path)
            
            results.append(BatchProcessResult(
                original_name=operation.original_name,
                new_name=final_path.name,
                target_path=str(final_path),
                success=True
            ))
            successful_count += 1
            
        except Exception as e:
            results.append(BatchProcessResult(
                original_name=operation.original_name,
                new_name=operation.new_name,
                target_path=operation.target_path,
                success=False,
                error=str(e)
            ))
    
    return BatchProcessResponse(
        results=results,
        total_files=len(request.operations),
        successful_files=successful_count,
        empresa_info=f"{empresa.nome} ({empresa.id_empresa})",
        unidade_info=f"{unidade.nome} ({unidade.id_unidade})"
    )

@router.post("/process-upload", response_model=BatchProcessResponse)
async def process_files_upload(
    empresa_id: int = Form(...),
    unidade_id: int = Form(...),
    file_targets_json: str = Form(...),
    files: List[UploadFile] = File(...),
    conflict_strategy: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Variante do processamento que recebe os arquivos via multipart.
    Útil quando o servidor não tem acesso ao path local do cliente.

    Campos:
      - empresa_id, unidade_id: validação de escopo
      - file_targets_json: JSON array com objetos { original_name, new_name, target_path }
      - files: conteúdo binário na mesma ordem do array acima
    """
    # Buscar empresa e unidade
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")

    unidade = db.query(Unidade).filter(
        Unidade.id == unidade_id,
        Unidade.empresa_id == empresa_id
    ).first()
    if not unidade:
        raise HTTPException(status_code=404, detail="Unidade não encontrada")

    # Parse metadata
    try:
        targets = json.loads(file_targets_json or "[]")
        if not isinstance(targets, list):
            raise ValueError("file_targets_json deve ser lista")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"JSON inválido em file_targets_json: {e}")

    if len(targets) != len(files):
        raise HTTPException(status_code=400, detail="Quantidade de arquivos difere da quantidade de alvos")

    results: List[BatchProcessResult] = []
    successful_count = 0

    strategy = (conflict_strategy or 'version').lower()

    for idx, meta in enumerate(targets):
        try:
            original_name = str(meta.get("original_name") or files[idx].filename or f"file_{idx}")
            new_name = str(meta.get("new_name") or original_name)
            target_path = str(meta.get("target_path") or "").strip()
            if not target_path:
                raise ValueError("target_path vazio")

            # Normaliza e garante diretório
            final_path = Path(target_path)
            final_dir = final_path.parent
            final_dir.mkdir(parents=True, exist_ok=True)

            # Resolver conflito de nome (não sobrescrever)
            candidate = final_path
            if candidate.exists():
                if strategy == 'skip':
                    results.append(BatchProcessResult(
                        original_name=original_name,
                        new_name=final_path.name,
                        target_path=str(final_path),
                        success=False,
                        error="Conflito: arquivo já existe (skip)"
                    ))
                    continue
                elif strategy == 'overwrite':
                    pass  # mantém candidate = final_path
                else:  # version (padrão)
                    base = candidate.stem
                    ext = candidate.suffix
                    i = 1
                    while True:
                        alt = final_dir / f"{base}-{i}{ext}"
                        if not alt.exists():
                            candidate = alt
                            break
                        i += 1

            # Escreve conteúdo
            content = await files[idx].read()
            with open(candidate, "wb") as f:
                f.write(content)

            results.append(BatchProcessResult(
                original_name=original_name,
                new_name=candidate.name,
                target_path=str(candidate),
                success=True
            ))
            successful_count += 1
        except Exception as e:
            results.append(BatchProcessResult(
                original_name=str(meta.get("original_name", f"file_{idx}")),
                new_name=str(meta.get("new_name", "")),
                target_path=str(meta.get("target_path", "")),
                success=False,
                error=str(e)
            ))

    return BatchProcessResponse(
        results=results,
        total_files=len(files),
        successful_files=successful_count,
        empresa_info=f"{empresa.nome} ({empresa.id_empresa})",
        unidade_info=f"{unidade.nome} ({unidade.id_unidade})"
    )

@router.get("/folders")
async def get_folder_structure():
    """Retorna a estrutura de pastas disponível"""
    folders = [
        {
            "id": "relatorios",
            "name": "01 Relatórios e Resultados",
            "path": "01 Relatórios e Resultados",
            "description": "REL e RES",
            "types": ["REL", "RES"]
        },
        {
            "id": "faturas",
            "name": "02 Faturas",
            "path": "02 Faturas",
            "description": "FAT",
            "types": ["FAT"]
        },
        {
            "id": "notas-energia",
            "name": "03 Notas de Energia",
            "path": "03 Notas de Energia",
            "description": "NE-CP, NE-LP, NE-CPC, NE-LPC e NE-VE",
            "types": ["NE-CP", "NE-LP", "NE-CPC", "NE-LPC", "NE-VE"]
        },
        {
            "id": "ccee-dri",
            "name": "04 CCEE - DRI",
            "path": "04 CCEE - DRI",
            "description": "CCEE (todos os tipos)",
            "types": ["CCEE"]
        },
        {
            "id": "bm-energia",
            "name": "05 BM Energia",
            "path": "05 BM Energia",
            "description": "DOC-CTR, DOC-PRO, MIN-CTR, MIN-PRO, MIN-CAR",
            "types": ["DOC-CTR", "DOC-PRO", "MIN-CTR", "MIN-PRO", "MIN-CAR"]
        },
        {
            "id": "documentos-cliente",
            "name": "06 Documentos do Cliente",
            "path": "06 Documentos do Cliente",
            "description": "DOC-CAD, DOC-ADT, DOC-COM, DOC-LIC, DOC-CAR",
            "types": ["DOC-CAD", "DOC-ADT", "DOC-COM", "DOC-LIC", "DOC-CAR"]
        },
        {
            "id": "projetos",
            "name": "07 Projetos",
            "path": "07 Projetos",
            "description": "Arquivos de projetos",
            "types": []
        },
        {
            "id": "comercializadoras",
            "name": "08 Comercializadoras",
            "path": "08 Comercializadoras",
            "description": "Documentos de comercializadoras",
            "types": []
        },
        {
            "id": "ccee-modelagem",
            "name": "09 CCEE - Modelagem",
            "path": "09 CCEE - Modelagem",
            "description": "Arquivos de modelagem CCEE",
            "types": []
        },
        {
            "id": "distribuidora",
            "name": "10 Distribuidora",
            "path": "10 Distribuidora",
            "description": "Documentos da distribuidora",
            "types": []
        },
        {
            "id": "icms",
            "name": "11 ICMS",
            "path": "11 ICMS",
            "description": "ICMS-DEVEC, ICMS-LDO, ICMS-REC",
            "types": ["ICMS-DEVEC", "ICMS-LDO", "ICMS-REC", "DEVEC", "LDO"]
        },
        {
            "id": "estudos",
            "name": "12 Estudos e Análises",
            "path": "12 Estudos e Análises",
            "description": "EST",
            "types": ["EST"]
        },
        {
            "id": "miscelanea13",
            "name": "13 Miscelânea",
            "path": "13 Miscelânea",
            "description": "Arquivos diversos (manuais)",
            "types": []
        }
    ]
    
    return {"folders": folders}
