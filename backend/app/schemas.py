from typing import Optional, List
from pydantic import BaseModel, ConfigDict, EmailStr, Field

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

class EmpresaUpdate(BaseModel):
    nome: str

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

class UnidadeUpdate(BaseModel):
    nome: str

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


# EMAIL SENDER
class EmpresaEmailOut(BaseModel):
    empresa_id: int
    id_empresa: str
    nome: str
    emails: List[EmailStr]
    excel_rows: List[int] = Field(default_factory=list)


class EmailSendRequest(BaseModel):
    empresa_ids: List[int]
    subject: str = Field(..., min_length=1)
    body_html: str = Field(..., min_length=1)
    override_recipients: Optional[List[EmailStr]] = None
    save_to_sent_items: bool = True
    sender_email: Optional[EmailStr] = None


class EmailSendResponse(BaseModel):
    sent: bool
    recipients: List[EmailStr]
    missing: List[EmpresaEmailOut]
    failed_recipients: List[str] = Field(default_factory=list)
    request_id: Optional[str] = None
    sender: EmailStr


class EmailConfigResponse(BaseModel):
    default_sender: EmailStr
    allowed_senders: List[EmailStr]


