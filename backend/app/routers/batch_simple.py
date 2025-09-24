from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
import os

from ..database import get_db
from ..models import Empresa, Unidade
from ..schemas import (
    BatchAnalysisRequest, BatchAnalysisResponse, BatchFileItem
)

router = APIRouter(prefix="/batch", tags=["batch-organize"])

@router.get("/folders")
async def get_folders():
    """Endpoint simples para obter pastas"""
    return {"folders": []}

@router.post("/analyze")
async def analyze_files(request: BatchAnalysisRequest, db: Session = Depends(get_db)):
    """Endpoint para análise de arquivos"""
    try:
        # Validar se empresa e unidade existem
        empresa = db.query(Empresa).filter(Empresa.id == request.empresa_id).first()
        if not empresa:
            raise HTTPException(status_code=404, detail="Empresa não encontrada")
            
        unidade = db.query(Unidade).filter(
            Unidade.empresa_id == request.empresa_id,
            Unidade.id == request.unidade_id
        ).first()
        if not unidade:
            raise HTTPException(status_code=404, detail="Unidade não encontrada")
        
        # Por enquanto, retorna listas vazias
        return BatchAnalysisResponse(
            detected_files=[],
            undetected_files=[BatchFileItem(
                name=file.name,
                path=file.path,
                size=file.size,
                is_detected=False,
                detected_type=None,
                target_folder=None,
                new_name=None
            ) for file in request.files],
            empresa_info=empresa.nome,
            unidade_info=unidade.nome,
            base_path=f"../cliente/{empresa.nome} - {empresa.id_empresa}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
