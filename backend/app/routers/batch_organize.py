from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import shutil
import re
from pathlib import Path
from datetime import datetime

from ..database import get_db
from ..models import Empresa, Unidade
from ..schemas import (
    BatchAnalysisRequest, BatchAnalysisResponse, BatchFileItem,
    BatchProcessRequest, BatchProcessResponse, BatchProcessResult,
    FolderStructure
)

router = APIRouter(prefix="/batch", tags=["batch-organize"])

# Padrões de detecção automática
DETECTION_PATTERNS = {
    "FAT": r"^FAT-\d{4}-(0[1-9]|1[0-2])",
    "NE-CP": r"^NE-CP-\d{4}-(0[1-9]|1[0-2])",
    "NE-LP": r"^NE-LP-\d{4}-(0[1-9]|1[0-2])",
    "NE-VE": r"^NE-VE-\d{4}-(0[1-9]|1[0-2])",
    "NE-CPC": r"^NE-CPC-\d{4}-(0[1-9]|1[0-2])",
    "NE-LPC": r"^NE-LPC-\d{4}-(0[1-9]|1[0-2])",
    "DEVEC": r"^DEVEC-\d{4}-(0[1-9]|1[0-2])",
    "LDO": r"^LDO-\d{4}-(0[1-9]|1[0-2])",
    "REL": r"^REL-\d{4}-(0[1-9]|1[0-2])",
    "RES": r"^RES-\d{4}-(0[1-9]|1[0-2])",
    "EST": r"^EST-\d{4}-(0[1-9]|1[0-2])",
    "DOC": r"^DOC-[A-Z]{3}-",
    "MIN": r"^MIN-[A-Z]{3}-",
    "CCEE": r"^CCEE-(?:CFZ\d{3}|GFN\d{3}|LFN\d{3}|LFRCA\d{3}|LFRES\d{3}|PEN\d{3}|SUM\d{3}|BOLETOCA|ND)-\d{4}-(0[1-9]|1[0-2])"
}

# Mapeamento de tipos para pastas
TYPE_TO_FOLDER = {
    "FAT": "02 Faturas",
    "NE-CP": "03 Notas de Energia",
    "NE-LP": "03 Notas de Energia",
    "NE-VE": "03 Notas de Energia",
    "NE-CPC": "03 Notas de Energia",
    "NE-LPC": "03 Notas de Energia",
    "DEVEC": "11 ICMS",
    "LDO": "11 ICMS",
    "REL": "01 Relatórios e Resultados",
    "RES": "01 Relatórios e Resultados",
    "EST": "12 Estudos e Análises",
    "DOC-CTR": "05 BM Energia",
    "DOC-PRO": "05 BM Energia",
    "DOC-CAD": "06 Documentos do Cliente",
    "DOC-ADT": "06 Documentos do Cliente",
    "DOC-COM": "06 Documentos do Cliente",
    "DOC-LIC": "06 Documentos do Cliente",
    "DOC-CAR": "06 Documentos do Cliente",
    "MIN-CTR": "05 BM Energia",
    "MIN-PRO": "05 BM Energia",
    "MIN-CAR": "05 BM Energia",
    "CCEE": "04 CCEE - DRI",
    "CCEE-BOLETOCA": "04 CCEE - DRI"
}

def detect_file_type(filename: str) -> Optional[str]:
    """Detecta o tipo de arquivo baseado no nome - EXATAS regras da primeira tela"""
    nome = filename.lower()
    nome_norm = nome.encode('ascii', 'ignore').decode('ascii')  # Remove acentos (substituto do normalize NFD)
    
    # REGRA 1: Padrões específicos do sistema (mantidos para compatibilidade)
    for tipo, pattern in DETECTION_PATTERNS.items():
        if re.match(pattern, filename):
            return tipo
    
    # REGRA 2: Faturas - apenas data no nome (ex: "2025-08.pdf")
    # Permite também XML para faturas no formato AAAA-MM.xml
    regex_data_fatura = r'^(\d{4})-(\d{2})\.(pdf|xlsm|xlsx?|docx?|xml)$'
    if re.match(regex_data_fatura, nome, re.IGNORECASE):
        return 'FAT'
    
    # REGRA 3: Notas de Energia - contém "nota", "cp", "lp", "ve", "cpc", "lpc" ou "venda"
    elif 'nota' in nome or 'cpc' in nome or 'lpc' in nome or 'cp' in nome or 'lp' in nome or 've' in nome or 'venda' in nome_norm:
        if 'cpc' in nome:
            return 'NE-CPC'
        elif 'lpc' in nome:
            return 'NE-LPC'
        elif 'cp' in nome:
            return 'NE-CP'
        elif 'lp' in nome:
            return 'NE-LP'
        elif 'venda' in nome_norm or re.search(r"\bve\b", nome):
            return 'NE-VE'
        else:
            return 'NE-CP'  # Padrão se só tem "nota"
    
    # REGRA 4: ICMS - DEVEC/LDO
    elif 'devec' in nome:
        return 'DEVEC'
    elif 'ldo' in nome:
        return 'LDO'
    
    # REGRA 5: Estudo - contém "estudo" no nome
    elif 'estudo' in nome:
        return 'EST'
    
    # REGRA 6: Documentos específicos
    elif ((nome.find('carta') != -1 and (nome.find('denúncia') != -1 or nome_norm.find('denuncia') != -1)) or
          nome.find('aditivo') != -1 or
          nome.find('contrato') != -1 or
          (nome.find('procuração') != -1 or nome_norm.find('procuracao') != -1)):
        
        if nome.find('carta') != -1 and (nome.find('denúncia') != -1 or nome_norm.find('denuncia') != -1):
            return 'DOC-CAR'
        elif nome.find('aditivo') != -1:
            return 'DOC-ADT'
        elif nome.find('contrato') != -1:
            return 'DOC-CTR'
        elif nome.find('procuração') != -1 or nome_norm.find('procuracao') != -1:
            return 'DOC-PRO'
    
    # REGRA 7: Relatórios - contém "relatório"
    elif 'relatorio' in nome or 'relatório' in nome:
        return 'REL'
    
    # REGRA 8: CCEE BOLETOCA - contém "boleto"
    elif 'boleto' in nome:
        return 'CCEE-BOLETOCA'
    
    # Se não detectou nada
    return None

def get_target_folder(file_type: str) -> str:
    """Retorna a pasta de destino baseada no tipo do arquivo"""
    return TYPE_TO_FOLDER.get(file_type, "07 Projetos")

def generate_file_name(detected_type: str, filename: str, last_modified: Optional[float] = None) -> str:
    """Gera novo nome do arquivo baseado no tipo detectado e data de modificação"""
    from datetime import datetime
    from pathlib import Path
    
    if detected_type == 'CCEE-BOLETOCA' and last_modified:
        # Para BOLETOCA, usar data de modificação do arquivo
        if last_modified > 1e12:  # JavaScript timestamp em milissegundos
            mod_date = datetime.fromtimestamp(last_modified / 1000)
        else:  # Timestamp em segundos
            mod_date = datetime.fromtimestamp(last_modified)
            
        year = mod_date.year
        month = f"{mod_date.month:02d}"
        
        # Extrair extensão do arquivo original
        file_path = Path(filename)
        extension = file_path.suffix
        
        # Gerar novo nome baseado na data de modificação
        new_name = f"CCEE-BOLETOCA-{year}-{month}{extension}"
        return new_name
    
    # Para outros tipos, manter nome original por enquanto
    return filename

def generate_new_name(filename: str, detected_type: str, last_modified: Optional[float] = None) -> str:
    """Gera o novo nome do arquivo baseado no tipo e data de modificação"""
    
    # Para CCEE-BOLETOCA, usar a data de modificação do arquivo
    if detected_type == "CCEE-BOLETOCA":
        if last_modified:
            # Converter timestamp para datetime
            mod_date = datetime.fromtimestamp(last_modified / 1000)  # JavaScript envia em ms
            year = mod_date.year
            month = f"{mod_date.month:02d}"
            
            # Extrair extensão do arquivo original
            file_path = Path(filename)
            extension = file_path.suffix
            
            # Gerar novo nome baseado na data de modificação
            new_name = f"CCEE-BOLETOCA-{year}-{month}{extension}"
            return new_name
    
    # Para outros tipos, manter nome original por enquanto
    return filename

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
        path_lower = file_path.lower()
        path_norm = file_path.encode('ascii', 'ignore').decode('ascii').lower()
        
        # Verificar se o caminho contém "6_relatórios" OU "6_relatorios" (incluindo subpastas)
        if ('6_relatórios' in path_lower or '6_relatorios' in path_norm or 
            '6 relatórios' in path_lower or '6 relatorios' in path_norm or
            '/6_relatórios/' in path_lower or '/6_relatorios/' in path_norm or
            '\\6_relatórios\\' in path_lower or '\\6_relatorios\\' in path_norm):
            # Arquivo está na pasta 6_RELATÓRIOS ou suas subpastas - IGNORAR COMPLETAMENTE
            continue
        
        # Detectar tipo
        detected_type = detect_file_type(filename)
        
        if detected_type:
            target_folder = get_target_folder(detected_type)
            # Gerar novo nome baseado no tipo e data de modificação
            new_name = generate_file_name(detected_type, filename, last_modified)
            
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
            "description": "DEVEC e LDO",
            "types": ["DEVEC", "LDO"]
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
