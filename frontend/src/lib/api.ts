// Resolve dinamicamente a base da API (Electron ou Web)
async function apiBase(): Promise<string> {
  try {
    if (typeof window !== 'undefined' && window.electronAPI?.getServerConfig) {
      const cfg = await window.electronAPI.getServerConfig();
      if (cfg?.host && cfg?.port && cfg?.protocol) {
        return `${cfg.protocol}://${cfg.host}:${cfg.port}`;
      }
    }
  } catch {}
  // Web (ou fallback): usa VITE_API_BASE ou localhost
  // @ts-ignore
  const envVars = (typeof import.meta !== 'undefined' && (import.meta as any).env) ? (import.meta as any).env : undefined;
  // Suporta VITE_API_BASE (atual) e VITE_API_URL (legacy no .env.example)
  const envBase = (envVars && (envVars.VITE_API_BASE || envVars.VITE_API_URL)) || undefined;
  return envBase || "http://127.0.0.1:8000";
}

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

// Tipos para organização em lote
export type BatchFileItem = {
  name: string;
  path: string;
  size: number;
  is_detected: boolean;
  detected_type?: string;
  target_folder?: string;
  new_name?: string;
};

export type BatchAnalysisRequest = {
  empresa_id: number;
  unidade_id: number;
  files: Array<{
    name: string;
    path: string;
    size: number;
  }>;
};

export type BatchAnalysisResponse = {
  detected_files: BatchFileItem[];
  undetected_files: BatchFileItem[];
  empresa_info: string;
  unidade_info: string;
  base_path: string;
};

export type BatchProcessingOperation = {
  original_name: string;
  new_name: string;
  source_path: string;
  target_path: string;
  folder_name: string;
};

export type BatchProcessRequest = {
  empresa_id: number;
  unidade_id: number;
  operations: BatchProcessingOperation[];
};

export type BatchProcessingResult = {
  original_name: string;
  new_name: string;
  target_path: string;
  success: boolean;
  error?: string;
};

export type BatchProcessResponse = {
  results: BatchProcessingResult[];
  total_files: number;
  successful_files: number;
  empresa_info: string;
  unidade_info: string;
};

export type FolderStructure = {
  id: string;
  name: string;
  path: string;
  description: string;
  types: string[];
};

async function http<T>(url: string, init?: RequestInit): Promise<T> {
  const BASE = await apiBase();
  const r = await fetch(`${BASE}${url}`, {
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
  renomearEmpresa(empresaId: number, nome: string) {
    return http<Empresa>(`/empresas/${empresaId}`, {
      method: "PUT",
      body: JSON.stringify({ nome }),
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
  renomearUnidade(unidadeId: number, nome: string) {
    return http<Unidade>(`/unidades/${unidadeId}`, {
      method: "PUT",
      body: JSON.stringify({ nome }),
    });
  },
  async excluirUnidade(unidadeId: number): Promise<void> {
    const BASE = await apiBase();
    const response = await fetch(`${BASE}/unidades/${unidadeId}`, {
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
    const BASE = await apiBase();
    const response = await fetch(`${BASE}/empresas/sync`, {
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
    const BASE = await apiBase();
    const response = await fetch(`${BASE}/empresas/sync-bidirectional`, {
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
    const BASE = await apiBase();
    const response = await fetch(`${BASE}/empresas/criar-pastas`, {
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
    const BASE = await apiBase();
    const response = await fetch(`${BASE}/empresas/${empresaId}`, {
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

    const BASE = await apiBase();
    const response = await fetch(`${BASE}/upload/preview`, {
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

    const BASE = await apiBase();
    const response = await fetch(`${BASE}/upload/preview-auto`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Erro ao fazer preview do upload automático');
    }

    return response.json();
  },
  async executarUpload(unidadeId: number, tipoArquivo: string, mesAno: string | null, descricao: string | null, files: FileList, conflictStrategy?: 'overwrite'|'version'|'skip'): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('unidade_id', unidadeId.toString());
    formData.append('tipo_arquivo', tipoArquivo);
    if (mesAno) formData.append('mes_ano', mesAno);
    if (descricao) formData.append('descricao', descricao);
    if (conflictStrategy) formData.append('conflict_strategy', conflictStrategy);
    
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    const BASE = await apiBase();
    const response = await fetch(`${BASE}/upload/executar`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Erro ao fazer upload');
    }

    return response.json();
  },
  async executarUploadAuto(unidadeId: number, filesWithAnalysis: Array<{file: File, tipoDetectado: string, dataDetectada: string}>, descricao: string | null, conflictStrategy?: 'overwrite'|'version'|'skip'): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('unidade_id', unidadeId.toString());
    formData.append('modo', 'AUTO');
    if (descricao) formData.append('descricao', descricao);
    if (conflictStrategy) formData.append('conflict_strategy', conflictStrategy);
    
    // Envia arquivo e metadados de análise
    filesWithAnalysis.forEach((item, index) => {
      formData.append('files', item.file);
      formData.append(`tipo_${index}`, item.tipoDetectado);
      formData.append(`data_${index}`, item.dataDetectada);
    });

    const BASE = await apiBase();
    const response = await fetch(`${BASE}/upload/executar-auto`, {
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
    const BASE = await apiBase();
    const response = await fetch(`${BASE}/config`);
    
    if (!response.ok) {
      throw new Error('Erro ao buscar configuração');
    }

    return response.json();
  },

  // ==========================================
  // APIS PARA ORGANIZAÇÃO EM LOTE
  // ==========================================
  async batchAnalyzeFiles(request: BatchAnalysisRequest): Promise<BatchAnalysisResponse> {
    return http<BatchAnalysisResponse>("/batch/analyze", {
      method: "POST",
      body: JSON.stringify(request),
    });
  },
  
  async batchProcessFiles(request: BatchProcessRequest): Promise<BatchProcessResponse> {
    return http<BatchProcessResponse>("/batch/process", {
      method: "POST",
      body: JSON.stringify(request),
    });
  },

  async batchProcessFilesUpload(
    empresaId: number,
    unidadeId: number,
    fileTargets: Array<{ original_name: string; new_name: string; target_path: string }>,
    files: File[],
    opts?: { onProgress?: (percent: number) => void; conflictStrategy?: 'overwrite'|'version'|'skip' }
  ): Promise<BatchProcessResponse> {
    const form = new FormData();
    form.append('empresa_id', String(empresaId));
    form.append('unidade_id', String(unidadeId));
    form.append('file_targets_json', JSON.stringify(fileTargets));
    if (opts?.conflictStrategy) form.append('conflict_strategy', opts.conflictStrategy);
    files.forEach((f) => form.append('files', f));
    const BASE = await apiBase();

    // Se foi pedido progresso, usa XHR para obter upload progress
    if (opts?.onProgress) {
      return new Promise((resolve, reject) => {
        try {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', `${BASE}/batch/process-upload`);
          xhr.onload = () => {
            try {
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve(JSON.parse(xhr.responseText));
              } else {
                reject(new Error(xhr.responseText || `HTTP ${xhr.status}`));
              }
            } catch (e) {
              reject(e);
            }
          };
          xhr.onerror = () => reject(new Error('Falha de rede no upload'));
          xhr.upload.onprogress = (evt) => {
            if (evt.lengthComputable) {
              const percent = Math.round((evt.loaded / evt.total) * 100);
              opts.onProgress?.(percent);
            }
          };
          xhr.send(form);
        } catch (e) {
          reject(e);
        }
      });
    }

    // Sem progresso, usa fetch
    const r = await fetch(`${BASE}/batch/process-upload`, { method: 'POST', body: form });
    if (!r.ok) {
      const msg = await r.text().catch(() => '');
      throw new Error(msg || 'Erro ao processar upload em lote');
    }
    return r.json();
  },
  
  async batchGetFolders(): Promise<{ folders: FolderStructure[] }> {
    return http<{ folders: FolderStructure[] }>("/batch/folders");
  }
};
