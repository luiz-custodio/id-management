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
