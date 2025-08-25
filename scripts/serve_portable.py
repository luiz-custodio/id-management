# =============================================================================
# 🚀 SOLUÇÃO ALTERNATIVA - SEM FIREWALL
# =============================================================================
# Cria um servidor HTTP simples na porta 8080 que serve o frontend
# E faz proxy para a API na porta 8000

import http.server
import socketserver
import urllib.request
import urllib.parse
import json
from urllib.error import URLError

PORT = 8080
API_BASE = "http://localhost:8000"

class ProxyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith('/api/'):
            # Proxy para API
            api_path = self.path.replace('/api', '')
            try:
                with urllib.request.urlopen(f"{API_BASE}{api_path}") as response:
                    self.send_response(response.getcode())
                    for header, value in response.headers.items():
                        if header.lower() not in ['connection', 'transfer-encoding']:
                            self.send_header(header, value)
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(response.read())
            except URLError as e:
                self.send_error(502, f"API Error: {e}")
        else:
            # Servir arquivos estáticos
            super().do_GET()
    
    def do_POST(self):
        if self.path.startswith('/api/'):
            # Proxy POST para API
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            api_path = self.path.replace('/api', '')
            req = urllib.request.Request(
                f"{API_BASE}{api_path}",
                data=post_data,
                headers={'Content-Type': self.headers['Content-Type']}
            )
            
            try:
                with urllib.request.urlopen(req) as response:
                    self.send_response(response.getcode())
                    for header, value in response.headers.items():
                        if header.lower() not in ['connection', 'transfer-encoding']:
                            self.send_header(header, value)
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(response.read())
            except URLError as e:
                self.send_error(502, f"API Error: {e}")

if __name__ == "__main__":
    import os
    
    # Mudar para diretório do frontend/dist
    frontend_dist = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'dist')
    if os.path.exists(frontend_dist):
        os.chdir(frontend_dist)
    else:
        print("❌ Pasta frontend/dist não encontrada. Execute 'npm run build' primeiro.")
        exit(1)
    
    with socketserver.TCPServer(("0.0.0.0", PORT), ProxyHTTPRequestHandler) as httpd:
        print(f"🚀 Servidor rodando em http://0.0.0.0:{PORT}")
        print(f"🌐 Acesse de outros PCs: http://SEU_IP:{PORT}")
        print("🛑 Pressione Ctrl+C para parar")
        httpd.serve_forever()
