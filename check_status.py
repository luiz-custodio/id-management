#!/usr/bin/env python3
"""
Script de verificação do status do projeto ID Management
"""
import os
import sys
import sqlite3
import subprocess
from pathlib import Path

def check_python_dependencies():
    """Verifica se as dependências Python estão instaladas"""
    required_packages = [
        'fastapi', 'uvicorn', 'sqlalchemy', 'pydantic', 
        'python-multipart', 'python-dotenv', 'pytest', 'httpx'
    ]
    
    missing = []
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
        except ImportError:
            missing.append(package)
    
    return missing

def check_database():
    """Verifica o banco de dados SQLite"""
    db_path = Path("backend/ids.db")
    if not db_path.exists():
        return False, "Arquivo de banco não encontrado"
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in cursor.fetchall()]
        
        expected_tables = ['empresas', 'unidades', 'itens']
        missing_tables = [t for t in expected_tables if t not in tables]
        
        if missing_tables:
            return False, f"Tabelas faltando: {missing_tables}"
        
        # Verifica se há dados
        cursor = conn.execute("SELECT COUNT(*) FROM empresas")
        empresa_count = cursor.fetchone()[0]
        
        conn.close()
        return True, f"OK - {len(tables)} tabelas, {empresa_count} empresas"
        
    except Exception as e:
        return False, f"Erro ao acessar banco: {e}"

def check_node_npm():
    """Verifica se Node.js e npm estão instalados"""
    try:
        node_result = subprocess.run(['node', '--version'], 
                                   capture_output=True, text=True, check=True)
        npm_result = subprocess.run(['npm', '--version'], 
                                  capture_output=True, text=True, check=True)
        return True, f"Node {node_result.stdout.strip()}, npm {npm_result.stdout.strip()}"
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False, "Node.js/npm não encontrados"

def check_frontend_dependencies():
    """Verifica se as dependências do frontend estão instaladas"""
    node_modules = Path("frontend/node_modules")
    package_lock = Path("frontend/package-lock.json")
    
    if not node_modules.exists():
        return False, "node_modules não encontrado"
    
    if not package_lock.exists():
        return False, "package-lock.json não encontrado"
    
    return True, "node_modules encontrado"

def check_env_files():
    """Verifica arquivos de configuração"""
    backend_env = Path("backend/.env")
    backend_env_example = Path("backend/.env.example")
    
    issues = []
    
    if not backend_env.exists():
        issues.append("backend/.env não encontrado")
    
    if not backend_env_example.exists():
        issues.append("backend/.env.example não encontrado")
    
    return len(issues) == 0, issues if issues else "Arquivos .env OK"

def check_directory_structure():
    """Verifica estrutura de diretórios"""
    required_dirs = [
        "backend/app",
        "frontend/src", 
        "frontend/src/components",
        "frontend/src/pages",
        "cliente"
    ]
    
    missing = []
    for dir_path in required_dirs:
        if not Path(dir_path).exists():
            missing.append(dir_path)
    
    return len(missing) == 0, missing if missing else "Estrutura OK"

def main():
    print("🔍 VERIFICAÇÃO DO STATUS DO PROJETO ID-MANAGEMENT")
    print("=" * 60)
    
    os.chdir(Path(__file__).parent)
    
    checks = [
        ("📁 Estrutura de diretórios", check_directory_structure),
        ("⚙️  Arquivos de configuração", check_env_files),
        ("🐍 Dependências Python", lambda: (not bool(check_python_dependencies()), 
                                           check_python_dependencies() or "Todas instaladas")),
        ("🗄️  Banco de dados SQLite", check_database),
        ("📦 Node.js e npm", check_node_npm),
        ("🎨 Dependências Frontend", check_frontend_dependencies),
    ]
    
    all_ok = True
    
    for name, check_func in checks:
        try:
            status, details = check_func()
            icon = "✅" if status else "❌"
            print(f"{icon} {name}: {details}")
            if not status:
                all_ok = False
        except Exception as e:
            print(f"❌ {name}: Erro - {e}")
            all_ok = False
    
    print("\n" + "=" * 60)
    
    if all_ok:
        print("🎉 PROJETO FUNCIONAL - Pronto para uso!")
        print("\n📋 Para iniciar:")
        print("   Backend:  cd backend && uvicorn app.main:app --reload")
        print("   Frontend: cd frontend && npm run dev")
    else:
        print("⚠️  PROJETO NECESSITA CONFIGURAÇÃO")
        print("\n🔧 Próximos passos recomendados:")
        
        missing_python = check_python_dependencies()
        if missing_python:
            print("   1. Instalar dependências Python:")
            print(f"      pip install {' '.join(missing_python)}")
        
        node_ok, _ = check_node_npm()
        if not node_ok:
            print("   2. Instalar Node.js: https://nodejs.org/")
        
        frontend_ok, _ = check_frontend_dependencies()
        if not frontend_ok:
            print("   3. Instalar dependências frontend:")
            print("      cd frontend && npm install")

if __name__ == "__main__":
    main()
