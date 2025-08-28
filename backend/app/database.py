import os
from pathlib import Path
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import StaticPool
from dotenv import load_dotenv
import logging

# Carrega variáveis de ambiente
# 1) .env na raiz do repositório (config global)
# 2) backend/.env (sobrepõe a raiz)
try:
    repo_root = Path(__file__).resolve().parents[2]
    load_dotenv(repo_root / ".env", override=False)
    load_dotenv(repo_root / "backend" / ".env", override=True)
except Exception:
    # fallback para comportamento padrão
    load_dotenv()

logger = logging.getLogger(__name__)

# Configuração do banco - PostgreSQL via Docker ou SQLite como fallback
def get_database_url() -> str:
    """
    Retorna URL do banco conforme configuração
    Prioridade: PostgreSQL Docker -> PostgreSQL rede -> SQLite local
    """
    # Tenta PostgreSQL via Docker primeiro (container local)
    postgres_url = os.getenv("DATABASE_URL")
    if postgres_url and postgres_url.startswith("postgresql://"):
        logger.info("🐘 Usando PostgreSQL via Docker (container local)")
        return postgres_url
    
    # Tenta PostgreSQL remoto (via variáveis de rede)
    postgres_host = os.getenv('POSTGRES_HOST')
    if postgres_host:
        postgres_port = os.getenv('POSTGRES_PORT', '5432')
        postgres_db = os.getenv('POSTGRES_DB', 'id_management')
        postgres_user = os.getenv('POSTGRES_USER', 'id_user')
        postgres_password = os.getenv('POSTGRES_PASSWORD', 'id_secure_2025')
        
        network_postgres_url = f"postgresql://{postgres_user}:{postgres_password}@{postgres_host}:{postgres_port}/{postgres_db}"
        logger.info(f"🌐 Usando PostgreSQL remoto em {postgres_host}:{postgres_port}")
        return network_postgres_url
    
    # Fallback para SQLite (mantém compatibilidade)
    sqlite_url = "sqlite:///./ids.db"
    logger.info("📁 Usando SQLite (fallback)")
    return sqlite_url

# URL do banco (dinâmica)
SQLALCHEMY_DATABASE_URL = get_database_url()

# Configurações do engine conforme tipo de banco
if SQLALCHEMY_DATABASE_URL.startswith("postgresql://"):
    # PostgreSQL: configuração para produção
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,  # Verifica conexões antes de usar
        pool_recycle=3600,   # Recicla conexões a cada hora
        echo=False           # Logs SQL (pode ativar para debug)
    )
else:
    # SQLite: configuração original (preservada)
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, 
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )

# Session maker (igual para ambos)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base declarativa (igual para ambos)
Base = declarative_base()

# Função para SQLite - ativa foreign keys (preservada)
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """Ativa foreign keys no SQLite (preserva funcionalidade original)"""
    if SQLALCHEMY_DATABASE_URL.startswith("sqlite:"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

def get_db():
    """Dependency para obter sessão do banco (preservada)"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_database_info() -> dict:
    """Retorna informações sobre o banco em uso"""
    return {
        "type": "postgresql" if SQLALCHEMY_DATABASE_URL.startswith("postgresql://") else "sqlite",
        "url": SQLALCHEMY_DATABASE_URL.replace(
            SQLALCHEMY_DATABASE_URL.split("@")[0].split("://")[1] + "@", "***@"
        ) if "@" in SQLALCHEMY_DATABASE_URL else SQLALCHEMY_DATABASE_URL,
        "engine": str(engine.url.drivername)
    }


