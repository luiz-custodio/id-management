from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, func
from .database import Base, engine, SessionLocal
from . import models, schemas
from .id_utils import next_id_empresa, next_id_unidade, build_item_id, validar_nome_arquivo
from .fs_utils import montar_estrutura_unidade
from .organizer import preview_moves, apply_moves
import os
import re
from pathlib import Path
from typing import List
from pydantic import BaseModel

app = FastAPI(title="IDS Manager API", version="0.3.0")

# Caminho base para todas as operações de pastas de clientes
BASE_CLIENTES_PATH = Path("C:/Users/User/Documents/PROJETOS/id-management/cliente")

# Estrutura padrão de subpastas para cada unidade (baseado em ABASTECEDORA MIRELA)
SUBPASTAS_PADRAO = [
    "Faturas",
    "Notas de Energia",  # CP e LP juntos aqui
    "Relatórios e Resultados",
    "Estudos e Análises",
    "Documentos do Cliente",
    "CCEE - DRI",  # Dentro desta, criar subpastas por tipo de CCEE
]

# CORS liberado para desenvolvimento
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"]
)

# cria tabelas se não existirem
Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# =====================
# EMPRESAS
# =====================

@app.post("/empresas", response_model=schemas.EmpresaOut)
async def criar_empresa(payload: schemas.EmpresaCreate, db: Session = Depends(get_db)):
    """
    Cria Empresa com id_empresa sequencial (0001, 0002, ...).
    Também cria automaticamente a Unidade '001' com o nome informado em `unidade_001_nome`.
    """
    novo_id = next_id_empresa(db)
    emp = models.Empresa(id_empresa=novo_id, nome=payload.nome.strip())
    db.add(emp)
    db.flush()  # garante emp.id para a FK da unidade antes do commit

    und = models.Unidade(
        id_unidade="001",
        nome=payload.unidade_001_nome.strip(),
        empresa_id=emp.id
    )
    db.add(und)
    db.commit()
    db.refresh(emp)

    # Cria estrutura de pastas usando o caminho da pasta cliente
    empresa_folder = BASE_CLIENTES_PATH / f"{emp.nome} - {novo_id}"
    
    # Garante que a pasta base cliente existe
    BASE_CLIENTES_PATH.mkdir(parents=True, exist_ok=True)
    
    # Cria pasta da empresa
    empresa_folder.mkdir(exist_ok=True)
    
    # Cria pasta da unidade
    unidade_folder = empresa_folder / f"{und.nome} - {und.id_unidade}"
    unidade_folder.mkdir(exist_ok=True)
    
    # Cria todas as subpastas padrão
    for subpasta in SUBPASTAS_PADRAO:
        subpasta_path = unidade_folder / subpasta
        subpasta_path.mkdir(exist_ok=True)
        
        # Se for CCEE - DRI, cria subpastas dos tipos
        if "CCEE" in subpasta:
            tipos_ccee = ["CFZ003", "GFN001", "LFN001", "LFRCA001", "LFRES001", "PEN001", "SUM001"]
            for tipo in tipos_ccee:
                tipo_folder = subpasta_path / tipo
                tipo_folder.mkdir(exist_ok=True)
    
    return emp

@app.get("/empresas", response_model=list[schemas.EmpresaOut])
def listar_empresas(db: Session = Depends(get_db)):
    return db.query(models.Empresa).order_by(models.Empresa.id_empresa).all()

@app.delete("/empresas/{empresa_pk}", status_code=204)
def excluir_empresa(empresa_pk: int, db: Session = Depends(get_db)):
    """
    DELETE /empresas/{empresa_pk}
    - Busca empresa por PK.
    - Se não existe → 404.
    - db.delete(emp) remove a empresa e, por CASCADE, remove as unidades/itens associados.
      (Definido nos relacionamentos e ForeignKeys com ondelete='CASCADE')
    OBS: Em produção, é recomendado um fluxo de confirmação (ex.: 'confirm=true').
    """
    emp = db.get(models.Empresa, empresa_pk)
    if not emp:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    db.delete(emp)
    db.commit()
    return  # 204 No Content

# =====================
# UNIDADES
# =====================

@app.post("/unidades", response_model=schemas.UnidadeOut)
def criar_unidade(payload: schemas.UnidadeCreate, db: Session = Depends(get_db)):
    """
    Cria unidade para a empresa.
    - Se for a primeira unidade da empresa → força id_unidade = '001'
    - Senão → usa sequencial (002, 003, ...)
    """
    emp = db.get(models.Empresa, payload.empresa_id)
    if not emp:
        raise HTTPException(400, "empresa_id inválido")

    existe_alguma = db.query(models.Unidade).filter_by(empresa_id=payload.empresa_id).first()
    if not existe_alguma:
        novo_id_unidade = "001"
    else:
        novo_id_unidade = next_id_unidade(db, payload.empresa_id)

    und = models.Unidade(
        id_unidade=novo_id_unidade,
        nome=payload.nome.strip(),
        empresa_id=payload.empresa_id
    )
    db.add(und); db.commit(); db.refresh(und)
    return und

@app.get("/unidades", response_model=list[schemas.UnidadeOut])
def listar_unidades(
    empresa_id: int | None = Query(None),
    db: Session = Depends(get_db)
):
    q = db.query(models.Unidade)
    if empresa_id is not None:
        q = q.filter(models.Unidade.empresa_id == empresa_id)
    return q.order_by(models.Unidade.empresa_id, models.Unidade.id_unidade).all()

# =====================
# ITENS
# =====================

@app.post("/itens", response_model=schemas.ItemOut)
def criar_item(payload: schemas.ItemCreate, db: Session = Depends(get_db)):
    if not db.get(models.Unidade, payload.unidade_id):
        raise HTTPException(400, "unidade_id inválido")
    try:
        id_item = build_item_id(payload.tipo, payload.ano_mes)
    except ValueError as e:
        raise HTTPException(400, str(e))
    existe = db.query(models.Item).filter_by(unidade_id=payload.unidade_id, id_item=id_item).first()
    if existe:
        raise HTTPException(409, "Já existe item com esse id_item nessa unidade")

    item = models.Item(
        id_item=id_item,
        tipo=payload.tipo,
        ano_mes=payload.ano_mes,
        titulo_visivel=payload.titulo_visivel,
        caminho_arquivo=payload.caminho_arquivo,
        unidade_id=payload.unidade_id
    )
    db.add(item); db.commit(); db.refresh(item)
    return item

@app.get("/itens", response_model=list[schemas.ItemOut])
def listar_itens(
    empresa_id: int | None = Query(None),
    unidade_id: int | None = Query(None),
    tipo: str | None = Query(None),
    ano_mes: str | None = Query(None),
    q: str | None = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(models.Item).options(joinedload(models.Item.unidade))
    if unidade_id is not None:
        query = query.filter(models.Item.unidade_id == unidade_id)
    if empresa_id is not None:
        query = query.join(models.Unidade).filter(models.Unidade.empresa_id == empresa_id)
    if tipo is not None:
        query = query.filter(models.Item.tipo == tipo)
    if ano_mes is not None:
        query = query.filter(models.Item.ano_mes == ano_mes)
    if q:
        query = query.filter(models.Item.titulo_visivel.ilike(f"%{q}%"))
    return query.order_by(models.Item.unidade_id, models.Item.id_item).all()

# =====================
# UTILITÁRIOS & ORGANIZADOR
# =====================

@app.post("/validar-nome-arquivo")
def validar_nome(payload: dict):
    nome = payload.get("nome_arquivo")
    if not nome:
        raise HTTPException(400, "Informe 'nome_arquivo'")
    return validar_nome_arquivo(nome)

@app.post("/unidades/{unidade_pk}/montar-pastas")
def montar_pastas_unidade(unidade_pk: int, payload: dict, db: Session = Depends(get_db)):
    base_dir = payload.get("base_dir")
    if not base_dir:
        raise HTTPException(400, "Informe 'base_dir'")
    und = db.get(models.Unidade, unidade_pk)
    if not und:
        raise HTTPException(404, "Unidade não encontrada")
    emp = db.get(models.Empresa, und.empresa_id)
    empresa_rotulo = f"{emp.nome} - {emp.id_empresa}"
    unidade_rotulo = f"{und.nome} - {und.id_unidade}"
    return montar_estrutura_unidade(base_dir, empresa_rotulo, unidade_rotulo)

@app.post("/organizador/preview", response_model=list[schemas.OrganizadorPreviewOut])
def organizador_preview(payload: schemas.OrganizadorPreviewIn, db: Session = Depends(get_db)):
    return preview_moves(db, payload.base_dir, payload.unidade_id, payload.arquivos)

@app.post("/organizador/aplicar")
def organizador_aplicar(payload: schemas.OrganizadorAplicarIn):
    return apply_moves([p.dict() for p in payload.plano])

class SyncRequest(BaseModel):
    base_path: str

@app.post("/empresas/sync")
async def sincronizar_empresas(request: SyncRequest, db: Session = Depends(get_db)):
    """
    Sincroniza empresas a partir das pastas existentes no filesystem.
    Sempre usa a pasta cliente como base, ignorando o parâmetro recebido.
    """
    # Sempre usa a pasta cliente definida como constante
    base_path = BASE_CLIENTES_PATH
    
    # Garante que a pasta cliente existe antes de sincronizar
    base_path.mkdir(parents=True, exist_ok=True)
    
    synced_count = 0
    updated_count = 0
    
    try:
        # Lista todas as pastas no diretório base (pasta cliente)
        for folder in base_path.iterdir():
            if not folder.is_dir():
                continue
                
            folder_name = folder.name
            
            # Tenta extrair nome e ID do padrão "NOME - 0001"
            match = re.match(r'^(.+?)\s*-\s*(\d{4})$', folder_name)
            if match:
                nome_empresa = match.group(1).strip()
                id_empresa = match.group(2)
                
                # Verifica se a empresa já existe
                existing = db.query(models.Empresa).filter_by(id_empresa=id_empresa).first()
                
                if not existing:
                    # Cria a empresa no banco
                    emp = models.Empresa(nome=nome_empresa, id_empresa=id_empresa)
                    db.add(emp)
                    db.flush()
                    synced_count += 1
                    empresa_id = emp.id
                else:
                    updated_count += 1
                    empresa_id = existing.id
                
                # Verifica subpastas (unidades) e sincroniza
                for unidade_folder in folder.iterdir():
                    if not unidade_folder.is_dir():
                        continue
                        
                    unidade_match = re.match(r'^(.+?)\s*-\s*(\d{3})$', unidade_folder.name)
                    if unidade_match:
                        nome_unidade = unidade_match.group(1).strip()
                        id_unidade = unidade_match.group(2)
                        
                        # Verifica se a unidade já existe
                        existing_unidade = db.query(models.Unidade).filter_by(
                            id_unidade=id_unidade, 
                            empresa_id=empresa_id
                        ).first()
                        
                        if not existing_unidade:
                            # Cria a unidade se não existir
                            und = models.Unidade(
                                nome=nome_unidade,
                                id_unidade=id_unidade,
                                empresa_id=empresa_id
                            )
                            db.add(und)
                        
                        # Garante que todas as subpastas padrão existem
                        for subpasta in SUBPASTAS_PADRAO:
                            subpasta_path = unidade_folder / subpasta
                            if not subpasta_path.exists():
                                subpasta_path.mkdir(exist_ok=True)
                                
                                # Se for CCEE - DRI, cria subpastas dos tipos
                                if "CCEE" in subpasta:
                                    tipos_ccee = ["CFZ003", "GFN001", "LFN001", "LFRCA001", "LFRES001", "PEN001", "SUM001"]
                                    for tipo in tipos_ccee:
                                        (subpasta_path / tipo).mkdir(exist_ok=True)
        
        db.commit()
    
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao sincronizar: {str(e)}"
        )
    
    return {
        "synced": synced_count,
        "updated": updated_count,
        "message": f"{synced_count} empresa(s) nova(s), {updated_count} já existente(s)",
        "base_path": str(base_path)
    }

# Endpoint auxiliar para ler estrutura de uma pasta exemplo
@app.get("/debug/ler-estrutura")
async def ler_estrutura_pasta():
    """
    Endpoint de debug para ler estrutura da pasta ABASTECEDORA MIRELA
    e identificar as subpastas padrão.
    """
    exemplo_path = Path("B:/NOVO00_Nossos_Clientes/ABASTECEDORA MIRELA - 0167")
    
    if not exemplo_path.exists():
        return {"erro": "Pasta exemplo não encontrada", "caminho": str(exemplo_path)}
    
    estrutura = []
    
    # Lê primeiro nível (unidades)
    for unidade_folder in exemplo_path.iterdir():
        if unidade_folder.is_dir():
            subpastas = []
            # Lê segundo nível (subpastas da unidade)
            for subfolder in unidade_folder.iterdir():
                if subfolder.is_dir():
                    subpastas.append(subfolder.name)
                    # Se for CCEE - DRI, lê o terceiro nível
                    if "CCEE" in subfolder.name:
                        ccee_tipos = []
                        for ccee_folder in subfolder.iterdir():
                            if ccee_folder.is_dir():
                                ccee_tipos.append(ccee_folder.name)
                        if ccee_tipos:
                            subpastas[-1] = f"{subfolder.name} -> {ccee_tipos}"
            
            estrutura.append({
                "unidade": unidade_folder.name,
                "subpastas": subpastas
            })
    
    return {
        "caminho_base": str(exemplo_path),
        "estrutura": estrutura,
        "subpastas_identificadas": list(set(
            pasta for item in estrutura 
            for pasta in item["subpastas"] 
            if " -> " not in pasta  # Ignora detalhes de CCEE
        ))
    }

# Endpoint para resetar banco (APENAS DESENVOLVIMENTO!)
@app.delete("/debug/reset-database")
async def reset_database(confirm: str = Query(...), db: Session = Depends(get_db)):
    """
    ⚠️ CUIDADO: Apaga TODOS os dados do banco!
    Usar apenas em desenvolvimento.
    Requer confirmação: ?confirm=APAGAR_TUDO
    """
    if confirm != "APAGAR_TUDO":
        raise HTTPException(
            status_code=400,
            detail="Para confirmar, use: /debug/reset-database?confirm=APAGAR_TUDO"
        )
    
    try:
        # Deleta todos os registros em ordem (respeitando FKs)
        db.query(models.Item).delete()
        db.query(models.Unidade).delete()
        db.query(models.Empresa).delete()
        db.commit()
        
        return {
            "status": "sucesso",
            "message": "Banco resetado com sucesso!",
            "avisos": [
                "Todos os dados foram apagados",
                "Use o botão 'Atualizar' para sincronizar com as pastas existentes"
            ]
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao resetar banco: {str(e)}"
        )