const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

export type Empresa = { id: number; id_empresa: string; nome: string };
export type Unidade = { id: number; id_unidade: string; nome: string; empresa_id: number };
export type Preview = {
  origem: string;
  destino?: string;
  pasta_relativa?: string;
  tipo_detectado?: string;
  valido: boolean;
  motivo?: string;
};

async function http<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${API_BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!r.ok) {
    const msg = await r.text().catch(() => "");
    throw new Error(`${r.status} ${r.statusText}${msg ? ` - ${msg}` : ""}`);
  }
  return r.json();
}

const API_URL = "http://localhost:8000";

export const api = {
  listarEmpresas() {
    return http<Empresa[]>("/empresas");
  },
  criarEmpresa(nome: string, unidades: string[]) {
    return http<Empresa>("/empresas", {
      method: "POST",
      body: JSON.stringify({ nome, unidades }),
    });
  },
  listarUnidades(empresaId: number) {
    return http<Unidade[]>(`/unidades?empresa_id=${empresaId}`);
  },
  criarUnidade(empresaId: number, nome: string) {
    return http<Unidade>("/unidades", {
      method: "POST",
      body: JSON.stringify({ empresa_id: empresaId, nome }),
    });
  },
  async excluirUnidade(unidadeId: number): Promise<void> {
    const response = await fetch(`${API_BASE}/unidades/${unidadeId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      // Tenta pegar a mensagem de erro detalhada da API
      let errorMessage = 'Erro ao excluir unidade';
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorMessage;
      } catch {
        // Se não conseguir fazer parse do JSON, usa o texto da resposta
        const errorText = await response.text().catch(() => '');
        if (errorText) {
          errorMessage = errorText;
        }
      }
      throw new Error(errorMessage);
    }

    // A API retorna 204 (No Content), então não precisa fazer .json()
    return;
  },
  preview(base_dir: string, unidade_id: number, arquivos: string[]) {
    return http<Preview[]>("/organizador/preview", {
      method: "POST",
      body: JSON.stringify({ base_dir, unidade_id, arquivos }),
    });
  },
  aplicar(plano: Preview[]) {
    return http<{ moved: number; skipped?: number; errors?: string[] }>("/organizador/aplicar", {
      method: "POST",
      body: JSON.stringify({ plano }),
    });
  },
  async sincronizarEmpresas(basePath: string): Promise<{ synced: number; updated: number; message: string }> {
    const response = await fetch(`${API_BASE}/empresas/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        base_path: basePath
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erro ao sincronizar empresas');
    }

    return response.json();
  },
  async sincronizarEmpresasBidirecional(basePath: string): Promise<{ 
    removed_empresas: number; 
    removed_unidades: number; 
    added_empresas: number; 
    added_unidades: number; 
    created_folders: number; 
    message: string; 
  }> {
    const response = await fetch(`${API_BASE}/empresas/sync-bidirectional`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        base_path: basePath
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erro ao sincronizar empresas');
    }

    return response.json();
  },
  async criarPastasFromBanco(): Promise<{ pastas_criadas: number; message: string }> {
    const response = await fetch(`${API_BASE}/empresas/criar-pastas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erro ao criar pastas');
    }

    return response.json();
  },
  async excluirEmpresa(empresaId: number): Promise<void> {
    const response = await fetch(`${API_BASE}/empresas/${empresaId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.text().catch(() => '');
      throw new Error(error || 'Erro ao excluir empresa');
    }

    // A API retorna 204 (No Content), então não precisa fazer .json()
    return;
  }
};
