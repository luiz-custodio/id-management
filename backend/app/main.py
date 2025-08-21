from fastapi import FastAPI, Depends, HTTPException, Query, Body, UploadFile, File, Form
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
import shutil
from pathlib import Path
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

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

# Mapeamento de tipos de arquivo para pastas baseado no dicionário de TAGs
TIPO_PARA_PASTA = {
    "FAT": "Faturas",
    "NE-CP": "Notas de Energia",
    "NE-LP": "Notas de Energia", 
    "REL": "Relatórios e Resultados",
    "EST": "Estudos e Análises",
    "DOC-CTR": "Documentos do Cliente",
    "DOC-ADT": "Documentos do Cliente",
    "DOC-CAD": "Documentos do Cliente",
    "DOC-PRO": "Documentos do Cliente",
    "DOC-CAR": "Documentos do Cliente",
    "DOC-COM": "Documentos do Cliente",
    "DOC-LIC": "Documentos do Cliente",
    "CCEE": "CCEE - DRI"  # Será refinado depois baseado no subcódigo
}

# Subpastas específicas para CCEE (cada tipo tem sua pasta)
CCEE_SUBPASTAS = [
    "CFZ003", "CFZ004", "GFN001", "LFN001", "LFRCA001", 
    "LFRES001", "PEN001", "SUM001"
]

# CORS liberado para desenvolvimento
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"]
)

# cria tabelas se não existirem
Base.metadata.create_all(bind=engine)

def gerar_nome_arquivo(tipo: str, ano_mes: Optional[str], descricao: Optional[str], extensao: str) -> str:
    """
    Gera nome de arquivo baseado no dicionário de TAGs
    """
    agora = datetime.now()
    
    # Para tipos que requerem data
    if tipo in ["FAT", "NE-CP", "NE-LP", "REL", "EST", "CCEE"]:
        if not ano_mes:
            # Se não fornecido, usa o mês atual
            ano_mes = agora.strftime("%Y-%m")
        nome_base = f"{tipo}-{ano_mes}"
    
    # Para documentos (DOC-*)
    elif tipo.startswith("DOC-"):
        # DOC usa formato: DOC-SUBTIPO-AAAA[-MM[-DD]]
        ano = agora.strftime("%Y")
        nome_base = f"{tipo}-{ano}"
    
    else:
        # Tipo não reconhecido, usa formato básico
        nome_base = tipo
    
    # Adiciona descrição se fornecida
    if descricao and descricao.strip():
        nome_base += f" - {descricao.strip()}"
    
    return f"{nome_base}.{extensao}"

def obter_pasta_destino(tipo: str, empresa_nome: str, empresa_id: str, unidade_nome: str, unidade_id: str) -> Path:
    """
    Determina a pasta de destino baseada no tipo de arquivo
    """
    # Pasta base da empresa e unidade
    empresa_folder = BASE_CLIENTES_PATH / f"{empresa_nome} - {empresa_id}"
    unidade_folder = empresa_folder / f"{unidade_nome} - {unidade_id}"
    
    # Determina subpasta baseada no tipo
    if tipo == "CCEE":
        # Para CCEE, precisa determinar o subcódigo
        # Por enquanto, coloca na pasta base do CCEE
        return unidade_folder / "CCEE - DRI"
    
    elif tipo in TIPO_PARA_PASTA:
        return unidade_folder / TIPO_PARA_PASTA[tipo]
    
    else:
        # Se não encontrar mapeamento, coloca em Documentos do Cliente
        return unidade_folder / "Documentos do Cliente"

def validar_extensao(filename: str) -> str:
    """
    Valida e extrai a extensão do arquivo
    """
    extensoes_permitidas = ['pdf', 'xlsx', 'csv', 'docx']
    extensao = filename.split('.')[-1].lower()
    
    if extensao not in extensoes_permitidas:
        raise HTTPException(400, f"Extensão não permitida. Use: {', '.join(extensoes_permitidas)}")
    
    return extensao

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
    Também cria automaticamente todas as unidades informadas na lista.
    """
    novo_id = next_id_empresa(db)
    emp = models.Empresa(id_empresa=novo_id, nome=payload.nome.strip())
    db.add(emp)
    db.flush()  # garante emp.id para a FK das unidades antes do commit

    # Cria todas as unidades sequencialmente
    for i, nome_unidade in enumerate(payload.unidades, 1):
        id_unidade = f"{i:03d}"  # 001, 002, 003, etc.
        und = models.Unidade(
            id_unidade=id_unidade,
            nome=nome_unidade.strip(),
            empresa_id=emp.id
        )
        db.add(und)
        db.flush()  # Para garantir que a unidade foi criada antes de criar as pastas

        # Cria estrutura de pastas para esta unidade
        empresa_folder = BASE_CLIENTES_PATH / f"{emp.nome} - {novo_id}"
        
        # Garante que a pasta base cliente existe
        BASE_CLIENTES_PATH.mkdir(parents=True, exist_ok=True)
        
        # Cria pasta da empresa se não existe
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
    
    db.commit()
    db.refresh(emp)
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
    """
    emp = db.get(models.Empresa, empresa_pk)
    if not emp:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    # Move pasta para backup antes de excluir do banco
    try:
        empresa_folder = BASE_CLIENTES_PATH / f"{emp.nome} - {emp.id_empresa}"
        if empresa_folder.exists():
            backup_folder = BASE_CLIENTES_PATH / "_BACKUP_EXCLUIDAS"
            backup_folder.mkdir(exist_ok=True)
            
            from datetime import datetime
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            pasta_destino = backup_folder / f"{empresa_folder.name}_{timestamp}"
            
            import shutil
            shutil.move(str(empresa_folder), str(pasta_destino))
    except Exception as e:
        print(f"Erro ao mover pasta para backup: {e}")
    
    db.delete(emp)
    db.commit()
    return

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
    
    # Cria pasta da unidade no filesystem
    try:
        empresa_folder = BASE_CLIENTES_PATH / f"{emp.nome} - {emp.id_empresa}"
        unidade_folder = empresa_folder / f"{und.nome} - {und.id_unidade}"
        unidade_folder.mkdir(exist_ok=True)
        
        # Cria subpastas padrão
        for subpasta in SUBPASTAS_PADRAO:
            subpasta_path = unidade_folder / subpasta
            subpasta_path.mkdir(exist_ok=True)
            
            if "CCEE" in subpasta:
                tipos_ccee = ["CFZ003", "GFN001", "LFN001", "LFRCA001", "LFRES001", "PEN001", "SUM001"]
                for tipo in tipos_ccee:
                    (subpasta_path / tipo).mkdir(exist_ok=True)
    except Exception as e:
        print(f"Erro ao criar pastas da unidade: {e}")
    
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

@app.delete("/unidades/{unidade_pk}", status_code=204)
def excluir_unidade(unidade_pk: int, db: Session = Depends(get_db)):
    """
    DELETE /unidades/{unidade_pk}
    - Busca unidade por PK.
    - Se não existe → 404.
    - PROTEÇÃO: Não permite excluir a unidade 001 (Matriz).
    - db.delete(und) remove a unidade e, por CASCADE, remove os itens associados.
    """
    und = db.get(models.Unidade, unidade_pk)
    if not und:
        raise HTTPException(status_code=404, detail="Unidade não encontrada")
    
    # PROTEÇÃO: Não permite excluir a unidade 001 (Matriz)
    if und.id_unidade == "001":
        raise HTTPException(
            status_code=400, 
            detail="Não é permitido excluir a unidade 001 (Matriz). Esta é a unidade principal da empresa."
        )
    
    # Busca a empresa para montar o caminho da pasta
    emp = db.get(models.Empresa, und.empresa_id)
    
    # Move pasta para backup antes de excluir do banco
    try:
        empresa_folder = BASE_CLIENTES_PATH / f"{emp.nome} - {emp.id_empresa}"
        unidade_folder = empresa_folder / f"{und.nome} - {und.id_unidade}"
        
        if unidade_folder.exists():
            backup_folder = BASE_CLIENTES_PATH / "_BACKUP_EXCLUIDAS"
            backup_folder.mkdir(exist_ok=True)
            
            from datetime import datetime
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            pasta_destino = backup_folder / f"{unidade_folder.name}_{timestamp}"
            
            import shutil
            shutil.move(str(unidade_folder), str(pasta_destino))
    except Exception as e:
        print(f"Erro ao mover pasta da unidade para backup: {e}")
    
    db.delete(und)
    db.commit()
    return

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
# UPLOAD DE ARQUIVOS
# =====================

@app.post("/upload/preview")
async def preview_upload(
    unidade_id: int = Form(...),
    tipo_arquivo: str = Form(...),
    mes_ano: Optional[str] = Form(None),
    descricao: Optional[str] = Form(None),
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    """
    Preview do upload: mostra onde cada arquivo será salvo e como será renomeado
    """
    # Busca dados da unidade e empresa
    unidade = db.get(models.Unidade, unidade_id)
    if not unidade:
        raise HTTPException(404, "Unidade não encontrada")
    
    empresa = db.get(models.Empresa, unidade.empresa_id)
    if not empresa:
        raise HTTPException(404, "Empresa não encontrada")
    
    preview_list = []
    
    for file in files:
        try:
            # Valida extensão
            extensao = validar_extensao(file.filename)
            
            # Gera nome do arquivo baseado no tipo
            novo_nome = gerar_nome_arquivo(tipo_arquivo, mes_ano, descricao, extensao)
            
            # Determina pasta de destino
            pasta_destino = obter_pasta_destino(
                tipo_arquivo, empresa.nome, empresa.id_empresa, 
                unidade.nome, unidade.id_unidade
            )
            
            # Caminho completo do arquivo
            caminho_completo = pasta_destino / novo_nome
            
            preview_list.append({
                "arquivo_original": file.filename,
                "novo_nome": novo_nome,
                "pasta_destino": str(pasta_destino.relative_to(BASE_CLIENTES_PATH)),
                "caminho_completo": str(caminho_completo.relative_to(BASE_CLIENTES_PATH)),
                "tipo": tipo_arquivo,
                "empresa": f"{empresa.nome} - {empresa.id_empresa}",
                "unidade": f"{unidade.nome} - {unidade.id_unidade}",
                "valido": True,
                "erro": None
            })
            
        except Exception as e:
            preview_list.append({
                "arquivo_original": file.filename,
                "novo_nome": None,
                "pasta_destino": None,
                "caminho_completo": None,
                "tipo": tipo_arquivo,
                "empresa": f"{empresa.nome} - {empresa.id_empresa}",
                "unidade": f"{unidade.nome} - {unidade.id_unidade}",
                "valido": False,
                "erro": str(e)
            })
    
    return {
        "preview": preview_list,
        "total_arquivos": len(files),
        "validos": len([p for p in preview_list if p["valido"]]),
        "empresa_info": f"{empresa.nome} - {empresa.id_empresa}",
        "unidade_info": f"{unidade.nome} - {unidade.id_unidade}"
    }

@app.post("/upload/executar")
async def executar_upload(
    unidade_id: int = Form(...),
    tipo_arquivo: str = Form(...),
    mes_ano: Optional[str] = Form(None),
    descricao: Optional[str] = Form(None),
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    """
    Executa o upload dos arquivos, salvando-os nas pastas corretas com nomes padronizados
    """
    # Busca dados da unidade e empresa
    unidade = db.get(models.Unidade, unidade_id)
    if not unidade:
        raise HTTPException(404, "Unidade não encontrada")
    
    empresa = db.get(models.Empresa, unidade.empresa_id)
    if not empresa:
        raise HTTPException(404, "Empresa não encontrada")
    
    resultados = []
    arquivos_salvos = 0
    
    for file in files:
        try:
            # Valida extensão
            extensao = validar_extensao(file.filename)
            
            # Gera nome do arquivo baseado no tipo
            novo_nome = gerar_nome_arquivo(tipo_arquivo, mes_ano, descricao, extensao)
            
            # Determina pasta de destino
            pasta_destino = obter_pasta_destino(
                tipo_arquivo, empresa.nome, empresa.id_empresa, 
                unidade.nome, unidade.id_unidade
            )
            
            # Garante que a pasta existe
            pasta_destino.mkdir(parents=True, exist_ok=True)
            
            # Para CCEE, cria subpastas se necessário
            if tipo_arquivo == "CCEE":
                for subpasta in CCEE_SUBPASTAS:
                    (pasta_destino / subpasta).mkdir(exist_ok=True)
            
            # Caminho completo do arquivo
            caminho_completo = pasta_destino / novo_nome
            
            # Verifica se arquivo já existe
            if caminho_completo.exists():
                # Adiciona timestamp para evitar conflito
                timestamp = datetime.now().strftime("_%H%M%S")
                nome_sem_ext = novo_nome.rsplit('.', 1)[0]
                novo_nome = f"{nome_sem_ext}{timestamp}.{extensao}"
                caminho_completo = pasta_destino / novo_nome
            
            # Salva o arquivo
            with open(caminho_completo, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            # Cria registro no banco (Item)
            try:
                id_item = build_item_id(tipo_arquivo, mes_ano)
                titulo_visivel = descricao or novo_nome
                
                item = models.Item(
                    id_item=id_item,
                    tipo=tipo_arquivo,
                    ano_mes=mes_ano,
                    titulo_visivel=titulo_visivel,
                    caminho_arquivo=str(caminho_completo),
                    unidade_id=unidade_id
                )
                db.add(item)
                db.flush()
                
            except Exception as e:
                print(f"Erro ao criar item no banco: {e}")
                # Continua mesmo se não conseguir criar o item
            
            resultados.append({
                "arquivo_original": file.filename,
                "novo_nome": novo_nome,
                "caminho_salvo": str(caminho_completo.relative_to(BASE_CLIENTES_PATH)),
                "sucesso": True,
                "erro": None
            })
            
            arquivos_salvos += 1
            
        except Exception as e:
            resultados.append({
                "arquivo_original": file.filename,
                "novo_nome": None,
                "caminho_salvo": None,
                "sucesso": False,
                "erro": str(e)
            })
    
    # Commit das mudanças no banco
    try:
        db.commit()
    except Exception as e:
        print(f"Erro ao salvar no banco: {e}")
        db.rollback()
    
    return {
        "resultados": resultados,
        "total_arquivos": len(files),
        "arquivos_salvos": arquivos_salvos,
        "empresa_info": f"{empresa.nome} - {empresa.id_empresa}",
        "unidade_info": f"{unidade.nome} - {unidade.id_unidade}",
        "message": f"Upload concluído: {arquivos_salvos}/{len(files)} arquivos salvos"
    }

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

# =====================
# SINCRONIZAÇÃO
# =====================

class SyncRequest(BaseModel):
    base_path: str

@app.post("/empresas/sync-bidirectional")
async def sincronizar_empresas_bidirectional(request: SyncRequest, db: Session = Depends(get_db)):
    """
    Sincronização bidirecional completa:
    1. Remove do banco empresas/unidades que não existem mais no filesystem
    2. Adiciona ao banco empresas/unidades que existem no filesystem mas não no banco
    3. Cria pastas para empresas/unidades do banco que não existem no filesystem
    """
    base_path = BASE_CLIENTES_PATH
    base_path.mkdir(parents=True, exist_ok=True)
    
    removed_empresas = 0
    removed_unidades = 0
    added_empresas = 0
    added_unidades = 0
    created_folders = 0
    
    try:
        print(f"Sincronização bidirecional iniciada: {base_path}")
        
        # ========================================
        # FASE 1: COLETA DADOS DO FILESYSTEM
        # ========================================
        filesystem_empresas = {}  # {id_empresa: {nome, unidades: {id_unidade: nome}}}
        
        if base_path.exists():
            for folder in base_path.iterdir():
                if not folder.is_dir() or folder.name.startswith('_BACKUP'):
                    continue
                    
                # Tenta extrair nome e ID do padrão "NOME - 0001"
                match = re.match(r'^(.+?)\s*-\s*(\d{4})$', folder.name)
                if match:
                    nome_empresa = match.group(1).strip()
                    id_empresa = match.group(2)
                    
                    filesystem_empresas[id_empresa] = {
                        'nome': nome_empresa,
                        'unidades': {}
                    }
                    
                    # Verifica unidades desta empresa
                    for unidade_folder in folder.iterdir():
                        if not unidade_folder.is_dir():
                            continue
                            
                        unidade_match = re.match(r'^(.+?)\s*-\s*(\d{3})$', unidade_folder.name)
                        if unidade_match:
                            nome_unidade = unidade_match.group(1).strip()
                            id_unidade = unidade_match.group(2)
                            
                            filesystem_empresas[id_empresa]['unidades'][id_unidade] = nome_unidade
        
        # ========================================
        # FASE 2: COLETA DADOS DO BANCO
        # ========================================
        db_empresas = db.query(models.Empresa).options(joinedload(models.Empresa.unidades)).all()
        db_empresas_dict = {emp.id_empresa: emp for emp in db_empresas}
        
        # ========================================
        # FASE 3: REMOVE DO BANCO O QUE NÃO EXISTE NO FILESYSTEM
        # ========================================
        for db_empresa in db_empresas:
            if db_empresa.id_empresa not in filesystem_empresas:
                print(f"Removendo empresa do banco (não existe no filesystem): {db_empresa.nome}")
                
                # Move pasta para backup se existir
                empresa_folder = base_path / f"{db_empresa.nome} - {db_empresa.id_empresa}"
                if empresa_folder.exists():
                    backup_folder = base_path / "_BACKUP_SYNC"
                    backup_folder.mkdir(exist_ok=True)
                    from datetime import datetime
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    import shutil
                    shutil.move(str(empresa_folder), str(backup_folder / f"{empresa_folder.name}_{timestamp}"))
                
                db.delete(db_empresa)
                removed_empresas += 1
            else:
                # Empresa existe, verifica unidades
                fs_unidades = filesystem_empresas[db_empresa.id_empresa]['unidades']
                
                for db_unidade in db_empresa.unidades:
                    if db_unidade.id_unidade not in fs_unidades:
                        print(f"  Removendo unidade do banco (não existe no filesystem): {db_unidade.nome}")
                        
                        # Move pasta para backup se existir
                        empresa_folder = base_path / f"{db_empresa.nome} - {db_empresa.id_empresa}"
                        unidade_folder = empresa_folder / f"{db_unidade.nome} - {db_unidade.id_unidade}"
                        if unidade_folder.exists():
                            backup_folder = base_path / "_BACKUP_SYNC"
                            backup_folder.mkdir(exist_ok=True)
                            from datetime import datetime
                            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                            import shutil
                            shutil.move(str(unidade_folder), str(backup_folder / f"{unidade_folder.name}_{timestamp}"))
                        
                        db.delete(db_unidade)
                        removed_unidades += 1
        
        # ========================================
        # FASE 4: ADICIONA AO BANCO O QUE EXISTE NO FILESYSTEM
        # ========================================
        for id_empresa, fs_empresa_data in filesystem_empresas.items():
            db_empresa = db_empresas_dict.get(id_empresa)
            
            if not db_empresa:
                print(f"Adicionando empresa ao banco: {fs_empresa_data['nome']}")
                db_empresa = models.Empresa(nome=fs_empresa_data['nome'], id_empresa=id_empresa)
                db.add(db_empresa)
                db.flush()
                added_empresas += 1
            
            # Verifica unidades
            for id_unidade, nome_unidade in fs_empresa_data['unidades'].items():
                existing_unidade = db.query(models.Unidade).filter_by(
                    id_unidade=id_unidade, 
                    empresa_id=db_empresa.id
                ).first()
                
                if not existing_unidade:
                    print(f"  Adicionando unidade ao banco: {nome_unidade}")
                    unidade = models.Unidade(
                        nome=nome_unidade,
                        id_unidade=id_unidade,
                        empresa_id=db_empresa.id
                    )
                    db.add(unidade)
                    added_unidades += 1
        
        # ========================================
        # FASE 5: CRIA PASTAS PARA DADOS DO BANCO QUE NÃO EXISTEM NO FILESYSTEM
        # ========================================
        db.flush()  # Garante que as mudanças anteriores estão aplicadas
        db_empresas_updated = db.query(models.Empresa).options(joinedload(models.Empresa.unidades)).all()
        
        for empresa in db_empresas_updated:
            empresa_folder = base_path / f"{empresa.nome} - {empresa.id_empresa}"
            
            if not empresa_folder.exists():
                print(f"Criando pasta da empresa: {empresa.nome}")
                empresa_folder.mkdir(exist_ok=True)
                created_folders += 1
            
            for unidade in empresa.unidades:
                unidade_folder = empresa_folder / f"{unidade.nome} - {unidade.id_unidade}"
                
                if not unidade_folder.exists():
                    print(f"  Criando pasta da unidade: {unidade.nome}")
                    unidade_folder.mkdir(exist_ok=True)
                    created_folders += 1
                
                # Cria subpastas padrão
                for subpasta in SUBPASTAS_PADRAO:
                    subpasta_path = unidade_folder / subpasta
                    if not subpasta_path.exists():
                        subpasta_path.mkdir(exist_ok=True)
                        created_folders += 1
                        
                        if "CCEE" in subpasta:
                            tipos_ccee = ["CFZ003", "GFN001", "LFN001", "LFRCA001", "LFRES001", "PEN001", "SUM001"]
                            for tipo in tipos_ccee:
                                tipo_folder = subpasta_path / tipo
                                if not tipo_folder.exists():
                                    tipo_folder.mkdir(exist_ok=True)
                                    created_folders += 1
        
        # Commit todas as mudanças
        db.commit()
        
        print(f"Sincronização bidirecional concluída:")
        print(f"  - Empresas removidas: {removed_empresas}")
        print(f"  - Unidades removidas: {removed_unidades}")
        print(f"  - Empresas adicionadas: {added_empresas}")
        print(f"  - Unidades adicionadas: {added_unidades}")
        print(f"  - Pastas criadas: {created_folders}")
    
    except Exception as e:
        print(f"Erro na sincronização bidirecional: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Erro na sincronização bidirecional: {str(e)}"
        )
    
    return {
        "removed_empresas": removed_empresas,
        "removed_unidades": removed_unidades,
        "added_empresas": added_empresas,
        "added_unidades": added_unidades,
        "created_folders": created_folders,
        "message": f"Sincronização completa: -{removed_empresas-removed_unidades} removidos, +{added_empresas+added_unidades} adicionados, {created_folders} pastas criadas",
        "base_path": str(base_path)
    }

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
        print(f"Sincronizando pasta: {base_path}")
        
        # Verifica se a pasta existe e é acessível
        if not base_path.exists():
            raise HTTPException(500, f"Pasta base não existe: {base_path}")
        
        # Lista todas as pastas no diretório base (pasta cliente)
        folders_found = list(base_path.iterdir())
        print(f"Pastas encontradas: {len(folders_found)}")
        
        for folder in folders_found:
            print(f"Processando: {folder.name}")
            
            if not folder.is_dir():
                print(f"  Ignorando arquivo: {folder.name}")
                continue
                
            folder_name = folder.name
            
            # Tenta extrair nome e ID do padrão "NOME - 0001"
            match = re.match(r'^(.+?)\s*-\s*(\d{4})$', folder_name)
            if match:
                nome_empresa = match.group(1).strip()
                id_empresa = match.group(2)
                
                print(f"  Empresa encontrada: {nome_empresa} - {id_empresa}")
                
                # Verifica se a empresa já existe
                existing = db.query(models.Empresa).filter_by(id_empresa=id_empresa).first()
                
                if not existing:
                    print(f"  Criando nova empresa: {nome_empresa}")
                    # Cria a empresa no banco
                    emp = models.Empresa(nome=nome_empresa, id_empresa=id_empresa)
                    db.add(emp)
                    db.flush()
                    synced_count += 1
                    empresa_id = emp.id
                else:
                    print(f"  Empresa já existe: {nome_empresa}")
                    updated_count += 1
                    empresa_id = existing.id
                
                # Verifica subpastas (unidades) e sincroniza
                unidades_folders = list(folder.iterdir())
                print(f"  Unidades encontradas: {len(unidades_folders)}")
                
                for unidade_folder in unidades_folders:
                    if not unidade_folder.is_dir():
                        continue
                        
                    unidade_match = re.match(r'^(.+?)\s*-\s*(\d{3})$', unidade_folder.name)
                    if unidade_match:
                        nome_unidade = unidade_match.group(1).strip()
                        id_unidade = unidade_match.group(2)
                        
                        print(f"    Unidade: {nome_unidade} - {id_unidade}")
                        
                        # Verifica se a unidade já existe
                        existing_unidade = db.query(models.Unidade).filter_by(
                            id_unidade=id_unidade, 
                            empresa_id=empresa_id
                        ).first()
                        
                        if not existing_unidade:
                            print(f"    Criando nova unidade: {nome_unidade}")
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
                                print(f"      Criando subpasta: {subpasta}")
                                subpasta_path.mkdir(exist_ok=True)
                                
                                # Se for CCEE - DRI, cria subpastas dos tipos
                                if "CCEE" in subpasta:
                                    tipos_ccee = ["CFZ003", "GFN001", "LFN001", "LFRCA001", "LFRES001", "PEN001", "SUM001"]
                                    for tipo in tipos_ccee:
                                        (subpasta_path / tipo).mkdir(exist_ok=True)
            else:
                print(f"  Pasta ignorada (formato inválido): {folder_name}")
        
        # Commit todas as mudanças
        db.commit()
        print(f"Sincronização concluída: {synced_count} novas, {updated_count} existentes")
    
    except Exception as e:
        print(f"Erro na sincronização: {str(e)}")
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

@app.post("/empresas/criar-pastas")
async def criar_pastas_do_banco(db: Session = Depends(get_db)):
    """
    Cria pastas no filesystem baseado nas empresas e unidades que existem no banco.
    Útil quando o banco tem dados mas as pastas não existem.
    """
    base_path = BASE_CLIENTES_PATH
    base_path.mkdir(parents=True, exist_ok=True)
    
    pastas_criadas = 0
    
    try:
        # Busca todas as empresas com suas unidades
        empresas = db.query(models.Empresa).options(joinedload(models.Empresa.unidades)).all()
        
        for empresa in empresas:
            empresa_folder = base_path / f"{empresa.nome} - {empresa.id_empresa}"
            
            if not empresa_folder.exists():
                print(f"Criando pasta da empresa: {empresa.nome}")
                empresa_folder.mkdir(exist_ok=True)
                pastas_criadas += 1
            
            for unidade in empresa.unidades:
                unidade_folder = empresa_folder / f"{unidade.nome} - {unidade.id_unidade}"
                
                if not unidade_folder.exists():
                    print(f"  Criando pasta da unidade: {unidade.nome}")
                    unidade_folder.mkdir(exist_ok=True)
                    pastas_criadas += 1
                
                # Cria todas as subpastas padrão
                for subpasta in SUBPASTAS_PADRAO:
                    subpasta_path = unidade_folder / subpasta
                    if not subpasta_path.exists():
                        print(f"    Criando subpasta: {subpasta}")
                        subpasta_path.mkdir(exist_ok=True)
                        pastas_criadas += 1
                        
                        # Se for CCEE - DRI, cria subpastas dos tipos
                        if "CCEE" in subpasta:
                            tipos_ccee = ["CFZ003", "GFN001", "LFN001", "LFRCA001", "LFRES001", "PEN001", "SUM001"]
                            for tipo in tipos_ccee:
                                tipo_folder = subpasta_path / tipo
                                if not tipo_folder.exists():
                                    tipo_folder.mkdir(exist_ok=True)
                                    pastas_criadas += 1
        
        print(f"Criação de pastas concluída: {pastas_criadas} pasta(s) criada(s)")
    
    except Exception as e:
        print(f"Erro ao criar pastas: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao criar pastas: {str(e)}"
        )
    
    return {
        "pastas_criadas": pastas_criadas,
        "message": f"{pastas_criadas} pasta(s) criada(s) com sucesso",
        "base_path": str(base_path)
    }