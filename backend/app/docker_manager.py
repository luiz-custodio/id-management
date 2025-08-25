"""
Gerenciador Docker para PostgreSQL - ID Management System
Mantém todas as funcionalidades existentes do SQLite
"""
import docker
import subprocess
import time
import os
import psycopg2
from pathlib import Path
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

class DockerPostgreSQLManager:
    """
    Gerencia o ciclo de vida do PostgreSQL via Docker
    Preserva todas as funcionalidades existentes
    """
    
    def __init__(self, project_root: Optional[Path] = None):
        self.project_root = project_root or Path(__file__).parent.parent.parent
        self.compose_file = self.project_root / "docker-compose.yml"
        self.container_name = "id_management_postgres"
        self.docker_client = None
        
        # Configurações do banco
        self.db_config = {
            "host": "localhost",
            "port": 5432,
            "database": "id_management",
            "user": "id_user",
            "password": "id_secure_2025"
        }
        
    def _init_docker_client(self) -> bool:
        """Inicializa cliente Docker"""
        try:
            self.docker_client = docker.from_env()
            self.docker_client.ping()
            return True
        except Exception as e:
            logger.error(f"Erro ao conectar com Docker: {e}")
            return False
    
    def is_docker_running(self) -> bool:
        """Verifica se Docker está rodando"""
        try:
            result = subprocess.run(
                ["docker", "version"], 
                capture_output=True, 
                text=True, 
                timeout=10
            )
            return result.returncode == 0
        except Exception:
            return False
    
    def is_postgres_container_running(self) -> bool:
        """Verifica se container PostgreSQL está rodando"""
        try:
            if not self._init_docker_client():
                return False
                
            container = self.docker_client.containers.get(self.container_name)
            return container.status == "running"
        except docker.errors.NotFound:
            return False
        except Exception as e:
            logger.error(f"Erro ao verificar container: {e}")
            return False
    
    def is_postgres_ready(self) -> bool:
        """Verifica se PostgreSQL está pronto para conexões"""
        try:
            with psycopg2.connect(**self.db_config) as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT 1")
                    return True
        except Exception:
            return False
    
    def start_postgres(self) -> Dict[str, Any]:
        """
        Inicia PostgreSQL via Docker Compose
        Retorna status detalhado da operação
        """
        result = {
            "success": False,
            "message": "",
            "details": {},
            "container_id": None
        }
        
        try:
            # Verifica se Docker está rodando
            if not self.is_docker_running():
                result["message"] = "Docker não está rodando. Instale e inicie o Docker Desktop."
                return result
            
            # Verifica se já está rodando
            if self.is_postgres_container_running():
                if self.is_postgres_ready():
                    result["success"] = True
                    result["message"] = "PostgreSQL já está rodando e pronto!"
                    return result
            
            logger.info("🐳 Iniciando PostgreSQL via Docker...")
            
            # Executa docker-compose up
            cmd = [
                "docker-compose", 
                "-f", str(self.compose_file),
                "up", "-d", "--remove-orphans"
            ]
            
            process = subprocess.run(
                cmd,
                cwd=self.project_root,
                capture_output=True,
                text=True,
                timeout=120  # 2 minutos timeout
            )
            
            if process.returncode != 0:
                result["message"] = f"Erro ao executar docker-compose: {process.stderr}"
                return result
            
            # Aguarda PostgreSQL ficar pronto (máx 60s)
            logger.info("⏳ Aguardando PostgreSQL ficar pronto...")
            for attempt in range(60):
                if self.is_postgres_ready():
                    # Obtém ID do container
                    if self._init_docker_client():
                        try:
                            container = self.docker_client.containers.get(self.container_name)
                            result["container_id"] = container.id[:12]
                        except:
                            pass
                    
                    result["success"] = True
                    result["message"] = f"PostgreSQL iniciado com sucesso! (tempo: {attempt + 1}s)"
                    result["details"] = {
                        "host": self.db_config["host"],
                        "port": self.db_config["port"],
                        "database": self.db_config["database"],
                        "container": self.container_name
                    }
                    
                    logger.info("✅ PostgreSQL pronto para conexões!")
                    return result
                
                time.sleep(1)
            
            result["message"] = "PostgreSQL não ficou pronto em 60 segundos"
            return result
            
        except subprocess.TimeoutExpired:
            result["message"] = "Timeout ao iniciar PostgreSQL (>2min)"
            return result
        except Exception as e:
            result["message"] = f"Erro inesperado: {str(e)}"
            return result
    
    def stop_postgres(self) -> Dict[str, Any]:
        """
        Para PostgreSQL via Docker Compose
        Preserva dados no volume Docker
        """
        result = {
            "success": False,
            "message": "",
            "data_preserved": True
        }
        
        try:
            if not self.is_postgres_container_running():
                result["success"] = True
                result["message"] = "PostgreSQL já está parado"
                return result
            
            logger.info("🛑 Parando PostgreSQL...")
            
            # Para com docker-compose down (preserva volumes)
            cmd = [
                "docker-compose",
                "-f", str(self.compose_file),
                "down"
            ]
            
            process = subprocess.run(
                cmd,
                cwd=self.project_root,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if process.returncode == 0:
                result["success"] = True
                result["message"] = "PostgreSQL parado com sucesso. Dados preservados."
                logger.info("✅ PostgreSQL parado!")
            else:
                result["message"] = f"Erro ao parar PostgreSQL: {process.stderr}"
            
            return result
            
        except Exception as e:
            result["message"] = f"Erro ao parar PostgreSQL: {str(e)}"
            return result
    
    def get_status(self) -> Dict[str, Any]:
        """Retorna status completo do PostgreSQL"""
        return {
            "docker_running": self.is_docker_running(),
            "container_running": self.is_postgres_container_running(),
            "postgres_ready": self.is_postgres_ready(),
            "connection_info": self.db_config if self.is_postgres_ready() else None,
            "container_name": self.container_name
        }
    
    def get_logs(self, lines: int = 50) -> str:
        """Retorna logs do container PostgreSQL"""
        try:
            cmd = ["docker", "logs", "--tail", str(lines), self.container_name]
            result = subprocess.run(cmd, capture_output=True, text=True)
            return result.stdout if result.returncode == 0 else result.stderr
        except Exception as e:
            return f"Erro ao obter logs: {e}"

# Instância global
postgres_manager = DockerPostgreSQLManager()
