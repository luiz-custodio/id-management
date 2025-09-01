from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

# EMPRESA
class EmpresaCreate(BaseModel):
    nome: str = Field(..., examples=["CEOLIN"])
    unidades: List[str] = Field(
        ...,
        description="Lista de nomes das unidades a serem criadas",
        examples=[["Matriz", "Filial SP", "Filial RJ"]],
        min_length=1
    )

class EmpresaOut(BaseModel):
    id: int
    id_empresa: str
    nome: str
    model_config = ConfigDict(from_attributes=True)

# UNIDADE
class UnidadeCreate(BaseModel):
    nome: str
    empresa_id: int

class UnidadeOut(BaseModel):
    id: int
    id_unidade: str
    nome: str
    empresa_id: int
    model_config = ConfigDict(from_attributes=True)

# ITEM
class ItemCreate(BaseModel):
    tipo: str
    ano_mes: Optional[str] = None
    titulo_visivel: str
    caminho_arquivo: str
    unidade_id: int

class ItemOut(BaseModel):
    id: int
    id_item: str
    tipo: str
    ano_mes: Optional[str]
    titulo_visivel: str
    caminho_arquivo: str
    unidade_id: int
    model_config = ConfigDict(from_attributes=True)

# ORGANIZADOR (preview/aplicar)
class OrganizadorPreviewIn(BaseModel):
    base_dir: str
    unidade_id: int
    arquivos: List[str]

class OrganizadorPreviewOut(BaseModel):
    origem: str
    destino: Optional[str] = None
    pasta_relativa: Optional[str] = None
    tipo_detectado: Optional[str] = None
    valido: bool = False
    motivo: Optional[str] = None

class OrganizadorAplicarIn(BaseModel):
    plano: List[OrganizadorPreviewOut]

# SCHEMAS PARA ORGANIZAÇÃO EM LOTE
class BatchFileRequest(BaseModel):
    name: str
    path: str
    size: int
    last_modified: Optional[float] = None  # Timestamp da data de modificação

class BatchAnalysisRequest(BaseModel):
    empresa_id: int
    unidade_id: int
    files: List[BatchFileRequest]

class BatchFileItem(BaseModel):
    name: str
    path: str
    size: int
    is_detected: bool
    detected_type: Optional[str] = None
    target_folder: Optional[str] = None
    new_name: Optional[str] = None

class BatchAnalysisResponse(BaseModel):
    detected_files: List[BatchFileItem]
    undetected_files: List[BatchFileItem]
    empresa_info: str
    unidade_info: str
    base_path: str

class BatchProcessingOperation(BaseModel):
    original_name: str
    new_name: str
    source_path: str
    target_path: str

class BatchProcessRequest(BaseModel):
    empresa_id: int
    unidade_id: int
    operations: List[BatchProcessingOperation]

class BatchProcessResult(BaseModel):
    original_name: str
    new_name: str
    target_path: str
    success: bool
    error: Optional[str] = None

class BatchProcessResponse(BaseModel):
    results: List[BatchProcessResult]
    total_files: int
    successful_files: int
    empresa_info: str
    unidade_info: str

class FolderStructure(BaseModel):
    id: str
    name: str
    path: str
    description: str
    types: List[str]
    count: int
