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
  criarEmpresa(nome: string, unidade_001_nome: string) {
    return http<Empresa>("/empresas", {
      method: "POST",
      body: JSON.stringify({ nome, unidade_001_nome }),
    });
  },
  listarUnidades(empresaId: number) {
    return http<Unidade[]>(`/unidades?empresa_id=${empresaId}`);
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
    const response = await fetch(`${API_URL}/empresas/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base_path: basePath }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Erro ao sincronizar empresas");
    }
    return response.json();
  },
};
