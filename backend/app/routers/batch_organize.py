from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import shutil
from pathlib import Path
from datetime import datetime
import re

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
        if relatorios_re.search(path_norm):
            # Arquivo está na pasta 6_RELATÓRIOS (qualquer variação) ou subpastas: ignorar
            continue
        
        # Detectar tipo (centralizado)
        detected_type, detected_date, _score, _reason = detect_type_and_date(filename, last_modified)

        if detected_type:
            target_folder = top_level_folder(detected_type)
            new_name = suggest_new_name(detected_type, filename, last_modified)

            detected_files.append(BatchFileItem(
                name=filename,
                path=file_path,
                size=file_size,
                is_detected=True,
                detected_type=detected_type,
                target_folder=target_folder,
                new_name=new_name
            ))
        else:
            undetected_files.append(BatchFileItem(
                name=filename,
                path=file_path,
                size=file_size,
                is_detected=False
            ))
    
    # Construir caminho base
    base_path = f"cliente/{empresa.nome} - {empresa.id_empresa}"
    if unidade.id_unidade != "001":
        base_path += f"/{unidade.nome} - {unidade.id_unidade}"
    
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
        }
    ]
    
    return {"folders": folders}
