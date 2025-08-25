import sqlite3
import os

# Verifica se o banco existe
db_path = "backend/ids.db"
if os.path.exists(db_path):
    print(f"✅ Banco de dados encontrado: {db_path}")
    
    # Conecta e verifica tabelas
    conn = sqlite3.connect(db_path)
    cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [row[0] for row in cursor.fetchall()]
    
    print(f"📊 Tabelas encontradas: {tables}")
    
    # Verifica se as tabelas principais existem
    expected_tables = ['empresas', 'unidades', 'itens']
    missing_tables = [t for t in expected_tables if t not in tables]
    
    if missing_tables:
        print(f"❌ Tabelas faltando: {missing_tables}")
    else:
        print("✅ Todas as tabelas principais encontradas")
    
    conn.close()
else:
    print(f"❌ Banco de dados não encontrado: {db_path}")
