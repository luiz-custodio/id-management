"""
Script de migração SQLite → PostgreSQL
Preserva todos os dados existentes
"""
import sqlite3
import asyncpg
import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv

# Carrega configurações
load_dotenv()

# Configurações
SQLITE_PATH = "backend/ids.db"
POSTGRES_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "database": "id_management",
    "user": "id_user",
    "password": "id_secure_2025"
}

async def migrate_sqlite_to_postgres():
    """
    Migra todos os dados do SQLite para PostgreSQL
    Preserva IDs e relações
    """
    print("🔄 Iniciando migração SQLite → PostgreSQL")
    print("=" * 50)
    
    # Verifica se SQLite existe
    if not Path(SQLITE_PATH).exists():
        print("❌ Arquivo SQLite não encontrado:", SQLITE_PATH)
        return False
    
    try:
        # Conecta ao SQLite
        sqlite_conn = sqlite3.connect(SQLITE_PATH)
        sqlite_conn.row_factory = sqlite3.Row  # Para acessar por nome
        
        # Conecta ao PostgreSQL
        postgres_conn = await asyncpg.connect(**POSTGRES_CONFIG)
        
        print("✅ Conexões estabelecidas")
        
        # Migrar empresas
        print("📊 Migrando empresas...")
        cursor = sqlite_conn.execute("SELECT * FROM empresas ORDER BY id")
        empresas = cursor.fetchall()
        
        # Limpa tabela PostgreSQL (cuidado em produção!)
        await postgres_conn.execute("TRUNCATE TABLE empresas CASCADE")
        
        empresas_migrated = 0
        for empresa in empresas:
            await postgres_conn.execute(
                "INSERT INTO empresas (id, id_empresa, nome) VALUES ($1, $2, $3)",
                empresa["id"], empresa["id_empresa"], empresa["nome"]
            )
            empresas_migrated += 1
        
        # Ajusta sequence do PostgreSQL
        if empresas:
            max_id = max(e["id"] for e in empresas)
            await postgres_conn.execute(
                f"SELECT setval('empresas_id_seq', {max_id})"
            )
        
        print(f"   ✅ {empresas_migrated} empresas migradas")
        
        # Migrar unidades
        print("🏢 Migrando unidades...")
        cursor = sqlite_conn.execute("SELECT * FROM unidades ORDER BY id")
        unidades = cursor.fetchall()
        
        unidades_migrated = 0
        for unidade in unidades:
            await postgres_conn.execute(
                "INSERT INTO unidades (id, id_unidade, nome, empresa_id) VALUES ($1, $2, $3, $4)",
                unidade["id"], unidade["id_unidade"], unidade["nome"], unidade["empresa_id"]
            )
            unidades_migrated += 1
        
        # Ajusta sequence
        if unidades:
            max_id = max(u["id"] for u in unidades)
            await postgres_conn.execute(
                f"SELECT setval('unidades_id_seq', {max_id})"
            )
        
        print(f"   ✅ {unidades_migrated} unidades migradas")
        
        # Migrar itens
        print("📄 Migrando itens...")
        cursor = sqlite_conn.execute("SELECT * FROM itens ORDER BY id")
        itens = cursor.fetchall()
        
        itens_migrated = 0
        for item in itens:
            await postgres_conn.execute(
                """INSERT INTO itens 
                   (id, id_item, tipo, ano_mes, titulo_visivel, caminho_arquivo, 
                    descricao, data_criacao, data_modificacao, unidade_id) 
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)""",
                item["id"], item["id_item"], item["tipo"], item["ano_mes"],
                item["titulo_visivel"], item["caminho_arquivo"], item["descricao"],
                item["data_criacao"], item["data_modificacao"], item["unidade_id"]
            )
            itens_migrated += 1
        
        # Ajusta sequence
        if itens:
            max_id = max(i["id"] for i in itens)
            await postgres_conn.execute(
                f"SELECT setval('itens_id_seq', {max_id})"
            )
        
        print(f"   ✅ {itens_migrated} itens migrados")
        
        # Verifica integridade
        print("🔍 Verificando integridade...")
        
        # Conta registros PostgreSQL
        pg_empresas = await postgres_conn.fetchval("SELECT COUNT(*) FROM empresas")
        pg_unidades = await postgres_conn.fetchval("SELECT COUNT(*) FROM unidades")
        pg_itens = await postgres_conn.fetchval("SELECT COUNT(*) FROM itens")
        
        print(f"   SQLite → PostgreSQL")
        print(f"   Empresas: {len(empresas)} → {pg_empresas}")
        print(f"   Unidades: {len(unidades)} → {pg_unidades}")
        print(f"   Itens: {len(itens)} → {pg_itens}")
        
        # Verifica se tudo migrou
        if (len(empresas) == pg_empresas and 
            len(unidades) == pg_unidades and 
            len(itens) == pg_itens):
            print("✅ Migração concluída com sucesso!")
            
            # Cria backup do SQLite
            backup_path = f"{SQLITE_PATH}.backup"
            import shutil
            shutil.copy2(SQLITE_PATH, backup_path)
            print(f"💾 Backup do SQLite criado: {backup_path}")
            
            return True
        else:
            print("❌ Inconsistência detectada na migração!")
            return False
        
    except Exception as e:
        print(f"❌ Erro durante migração: {e}")
        return False
    finally:
        if 'sqlite_conn' in locals():
            sqlite_conn.close()
        if 'postgres_conn' in locals():
            await postgres_conn.close()

async def main():
    """Função principal de migração"""
    success = await migrate_sqlite_to_postgres()
    
    if success:
        print("\n🎉 MIGRAÇÃO CONCLUÍDA!")
        print("📋 Próximos passos:")
        print("   1. Execute: cp backend/.env.docker backend/.env")
        print("   2. Reinicie a aplicação: uvicorn app.main:app --reload")
        print("   3. Teste todas as funcionalidades")
    else:
        print("\n❌ MIGRAÇÃO FALHOU")
        print("📋 O SQLite original permanece intacto")

if __name__ == "__main__":
    asyncio.run(main())
