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

export type UploadPreview = {
  arquivo_original: string;
  novo_nome: string | null;
  pasta_destino: string | null;
  caminho_completo: string | null;
  tipo: string;
  empresa: string;
  unidade: string;
  valido: boolean;
  erro: string | null;
};

export type UploadPreviewResponse = {
  preview: UploadPreview[];
  total_arquivos: number;
  validos: number;
  empresa_info: string;
  unidade_info: string;
};

export type UploadResult = {
  arquivo_original: string;
  novo_nome: string | null;
  caminho_salvo: string | null;
  sucesso: boolean;
  erro: string | null;
};

export type UploadResponse = {
  resultados: UploadResult[];
  total_arquivos: number;
  arquivos_salvos: number;
  empresa_info: string;
  unidade_info: string;
  message: string;
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
  },
  async previewUpload(unidadeId: number, tipoArquivo: string, mesAno: string | null, descricao: string | null, files: FileList): Promise<UploadPreviewResponse> {
    const formData = new FormData();
    formData.append('unidade_id', unidadeId.toString());
    formData.append('tipo_arquivo', tipoArquivo);
    if (mesAno) formData.append('mes_ano', mesAno);
    if (descricao) formData.append('descricao', descricao);
    
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    const response = await fetch(`${API_BASE}/upload/preview`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Erro ao fazer preview do upload');
    }

    return response.json();
  },
  async previewUploadAuto(unidadeId: number, filesWithAnalysis: Array<{file: File, tipoDetectado: string, dataDetectada: string}>, descricao: string | null): Promise<UploadPreviewResponse> {
    const formData = new FormData();
    formData.append('unidade_id', unidadeId.toString());
    formData.append('modo', 'AUTO');
    if (descricao) formData.append('descricao', descricao);
    
    // Envia arquivo e metadados de análise
    filesWithAnalysis.forEach((item, index) => {
      formData.append('files', item.file);
      formData.append(`tipo_${index}`, item.tipoDetectado);
      formData.append(`data_${index}`, item.dataDetectada);
    });

    const response = await fetch(`${API_BASE}/upload/preview-auto`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Erro ao fazer preview do upload automático');
    }

    return response.json();
  },
  async executarUpload(unidadeId: number, tipoArquivo: string, mesAno: string | null, descricao: string | null, files: FileList): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('unidade_id', unidadeId.toString());
    formData.append('tipo_arquivo', tipoArquivo);
    if (mesAno) formData.append('mes_ano', mesAno);
    if (descricao) formData.append('descricao', descricao);
    
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    const response = await fetch(`${API_BASE}/upload/executar`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Erro ao fazer upload');
    }

    return response.json();
  },
  async executarUploadAuto(unidadeId: number, filesWithAnalysis: Array<{file: File, tipoDetectado: string, dataDetectada: string}>, descricao: string | null): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('unidade_id', unidadeId.toString());
    formData.append('modo', 'AUTO');
    if (descricao) formData.append('descricao', descricao);
    
    // Envia arquivo e metadados de análise
    filesWithAnalysis.forEach((item, index) => {
      formData.append('files', item.file);
      formData.append(`tipo_${index}`, item.tipoDetectado);
      formData.append(`data_${index}`, item.dataDetectada);
    });

    const response = await fetch(`${API_BASE}/upload/executar-auto`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Erro ao executar upload automático');
    }

    return response.json();
  },

  async getConfig(): Promise<{ basePath: string; version: string }> {
    const response = await fetch(`${API_BASE}/config`);
    
    if (!response.ok) {
      throw new Error('Erro ao buscar configuração');
    }

    return response.json();
  }
};
