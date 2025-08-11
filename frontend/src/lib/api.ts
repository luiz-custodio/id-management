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
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

export const api = {
  listarEmpresas() {
    return http<Empresa[]>("/empresas");
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
    return http<any>("/organizador/aplicar", {
      method: "POST",
      body: JSON.stringify({ plano }),
    });
  },
};
