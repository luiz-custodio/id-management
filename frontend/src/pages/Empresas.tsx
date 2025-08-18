import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Search, Home, Building2, MapPin, Settings, Plus, RefreshCw, Loader2, AlertCircle, X, Upload, FileText } from 'lucide-react';
import { api } from '../lib/api';
import type { Empresa } from '../lib/api';

// Caminho base temporário para sincronização de clientes (pastas locais)
const CLIENTE_BASE_PATH = "C:\\Users\\User\\Documents\\PROJETOS\\id-management\\cliente"; // usar \\\\ se vier de .env

const EmpresasPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('empresas');
  const [searchTerm, setSearchTerm] = useState('');
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formNome, setFormNome] = useState('');
  const [formUnidades, setFormUnidades] = useState<string[]>(['Matriz']); // Array de nomes de unidades
  
  // Estados para upload
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>('');
  const [selectedUnidade, setSelectedUnidade] = useState<string>('');
  const [selectedEmpresaNome, setSelectedEmpresaNome] = useState<string>('');
  const [selectedUnidadeNome, setSelectedUnidadeNome] = useState<string>('');
  const [tipoArquivo, setTipoArquivo] = useState<string>('');
  const [mesAno, setMesAno] = useState<string>('');
  const [descricao, setDescricao] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [expandedEmpresas, setExpandedEmpresas] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tipos de arquivo disponíveis
  const tiposArquivo = [
    { value: 'FAT', label: 'Fatura', requireDate: true },
    { value: 'NE-CP', label: 'Nota de Energia - CP', requireDate: true },
    { value: 'NE-LP', label: 'Nota de Energia - LP', requireDate: true },
    { value: 'REL', label: 'Relatório', requireDate: true },
    { value: 'EST', label: 'Estudo', requireDate: true },
    { value: 'DOC-CTR', label: 'Documento - Contrato', requireDate: false },
    { value: 'DOC-ADT', label: 'Documento - Aditivo', requireDate: false },
    { value: 'DOC-CAD', label: 'Documento - Cadastro', requireDate: false },
    { value: 'CCEE', label: 'CCEE - DRI', requireDate: true },
  ];

  const fetchEmpresas = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.listarEmpresas();
      setEmpresas(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar empresas';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Nova função: força sincronização com o filesystem antes de listar
  const handleSync = async () => {
    try {
      setLoading(true);
      setError(null);
      // Backend agora garante que a pasta base existe automaticamente
      await api.sincronizarEmpresas(CLIENTE_BASE_PATH);
      await fetchEmpresas();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao sincronizar empresas';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEmpresas(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim()) return;
    
    // Filtra unidades vazias e remove duplicatas
    const unidadesValidas = formUnidades
      .map(u => u.trim())
      .filter(u => u.length > 0);
    
    if (unidadesValidas.length === 0) {
      setError('Adicione pelo menos uma unidade');
      return;
    }
    
    try {
      setCreating(true);
      setError(null);
      
      // Por enquanto cria com a primeira unidade (backend precisa ser adaptado para múltiplas)
      await api.criarEmpresa(formNome.trim(), unidadesValidas[0]);
      
      // TODO: Criar as unidades adicionais após criar a empresa
      // for (let i = 1; i < unidadesValidas.length; i++) {
      //   await api.criarUnidade(empresaId, unidadesValidas[i]);
      // }
      
      setFormNome('');
      setFormUnidades(['Matriz']);
      setShowForm(false);
      await fetchEmpresas();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar empresa';
      setError(msg);
    } finally {
      setCreating(false);
    }
  };

  // Adiciona nova unidade ao formulário
  const handleAddUnidade = () => {
    setFormUnidades([...formUnidades, '']);
  };

  // Remove unidade do formulário
  const handleRemoveUnidade = (index: number) => {
    if (formUnidades.length > 1) {
      setFormUnidades(formUnidades.filter((_, i) => i !== index));
    }
  };

  // Atualiza nome da unidade
  const handleUpdateUnidade = (index: number, value: string) => {
    const updated = [...formUnidades];
    updated[index] = value;
    setFormUnidades(updated);
  };

  const filteredEmpresas = useMemo(
    () => empresas.filter(e => e.nome.toLowerCase().includes(searchTerm.toLowerCase())),
    [empresas, searchTerm]
  );

  // Handlers para drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files);
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    // TODO: Implementar upload
    console.log({
      empresa: selectedEmpresa,
      unidade: selectedUnidade,
      tipo: tipoArquivo,
      mesAno,
      descricao,
      arquivos: selectedFiles
    });
  };

  // Toggle expansão de empresa - permite apenas uma por vez
  const toggleEmpresaExpansion = (empresaId: number) => {
    setExpandedEmpresas(prev => {
      const newSet = new Set<number>();
      
      // Se a empresa está sendo fechada (já estava expandida)
      if (prev.has(empresaId)) {
        // Desseleciona se a unidade selecionada pertence a esta empresa
        if (selectedEmpresa === String(empresaId)) {
          setSelectedEmpresa('');
          setSelectedUnidade('');
          setSelectedEmpresaNome('');
          setSelectedUnidadeNome('');
        }
        // Retorna set vazio (fecha a empresa)
        return newSet;
      } else {
        // Se está abrindo uma nova empresa
        // Desseleciona qualquer unidade da empresa anterior
        const empresaAnterior = Array.from(prev)[0]; // Pega a empresa que estava aberta
        if (empresaAnterior && selectedEmpresa === String(empresaAnterior)) {
          setSelectedEmpresa('');
          setSelectedUnidade('');
          setSelectedEmpresaNome('');
          setSelectedUnidadeNome('');
        }
        // Expande a nova empresa
        newSet.add(empresaId);
        return newSet;
      }
    });
  };

  // Seleciona unidade ao clicar
  const handleUnidadeSelect = (empresaId: number, unidadeId: string) => {
    setSelectedEmpresa(String(empresaId));
    setSelectedUnidade(unidadeId);
  };

  // Seleciona unidade ao dar duplo clique
  const handleUnidadeDoubleClick = (empresaId: number, unidadeId: string, empresaNome: string, unidadeNome: string) => {
    // Se já está selecionada, desseleciona
    if (selectedEmpresa === String(empresaId) && selectedUnidade === unidadeId) {
      setSelectedEmpresa('');
      setSelectedUnidade('');
      setSelectedEmpresaNome('');
      setSelectedUnidadeNome('');
    } else {
      // Senão, seleciona
      setSelectedEmpresa(String(empresaId));
      setSelectedUnidade(unidadeId);
      setSelectedEmpresaNome(empresaNome);
      setSelectedUnidadeNome(unidadeNome);
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'empresas', label: 'Empresas', icon: Building2 },
    { id: 'unidades', label: 'Unidades', icon: MapPin },
    { id: 'configuracao', label: 'Configuração', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-blue-900 text-white flex">
      {/* Sidebar com upload */}
      <div className="w-80 bg-gradient-to-b from-slate-900/95 to-blue-950/95 backdrop-blur-sm p-6 flex flex-col overflow-y-auto border-r border-blue-800/30">
        <div className="mb-6">
          {/* Logo BM Energia oficial */}
          <div className="flex items-center justify-center">
            <img 
              src="/logo-bm-energia.png" 
              alt="BM Energia" 
              className="h-12 w-auto transition-transform duration-300 hover:scale-105"
              onError={(e) => {
                // Fallback para quando a imagem não carregar
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling.style.display = 'flex';
              }}
            />
            {/* Fallback logo caso a imagem não carregue */}
            <div className="hidden items-center gap-3">
              <div className="bg-gradient-to-br from-blue-700 to-blue-800 rounded-lg p-2.5 shadow-lg shadow-blue-700/25 border border-blue-600/30">
                <span className="text-white font-bold text-xl tracking-tight">BM</span>
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-blue-200 bg-clip-text text-transparent tracking-wide">
                ENERGIA
              </h1>
            </div>
          </div>
        </div>
        
        {/* Formulário de Upload */}
        <div className="space-y-4 mb-6">
          <h2 className="text-lg font-medium text-blue-100">Upload de Arquivos</h2>
          
          {/* Mostra a unidade selecionada se houver com animação */}
          {selectedUnidade && (
            <div className="animate-fade-in-down bg-blue-800/15 border border-blue-700/30 rounded-lg p-4 transition-all duration-300 hover:border-blue-600/50 backdrop-blur-sm shadow-lg shadow-blue-900/20">
              <p className="text-xs text-blue-300 mb-2 uppercase tracking-wider font-medium">Unidade Selecionada</p>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">
                  {selectedEmpresaNome}
                </p>
                <p className="text-xs text-blue-200 flex items-center gap-2">
                  <MapPin className="w-3 h-3 text-blue-400" />
                  {selectedUnidadeNome} 
                  <span className="text-blue-400">• {selectedUnidade}</span>
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedEmpresa('');
                  setSelectedUnidade('');
                  setSelectedEmpresaNome('');
                  setSelectedUnidadeNome('');
                }}
                className="mt-3 text-xs text-red-400 hover:text-red-300 transition-all duration-200 flex items-center gap-1 hover:gap-2"
              >
                <X className="w-3 h-3" />
                Limpar seleção
              </button>
            </div>
          )}

          {/* Tipo de Arquivo */}
          <div>
            <label className="block text-xs text-blue-300 mb-2 font-medium">Tipo de Arquivo</label>
            <select 
              value={tipoArquivo}
              onChange={(e) => setTipoArquivo(e.target.value)}
              className="w-full bg-slate-800/70 border border-blue-800/40 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-500 transition-all duration-200 hover:border-blue-700/60 cursor-pointer appearance-none bg-right bg-no-repeat backdrop-blur-sm"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2360a5fa' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: 'right 0.5rem center',
                backgroundSize: '1.5em 1.5em',
                paddingRight: '2.5rem'
              }}
            >
              <option value="">Selecione...</option>
              {tiposArquivo.map(tipo => (
                <option key={tipo.value} value={tipo.value} className="py-2">
                  {tipo.label}
                </option>
              ))}
            </select>
          </div>

          {/* Campo de Mês/Ano condicional */}
          {tipoArquivo && tiposArquivo.find(t => t.value === tipoArquivo)?.requireDate && (
            <div className="animate-fade-in-down">
              <label className="block text-xs text-blue-300 mb-2 font-medium">Mês/Ano</label>
              <input
                type="month"
                value={mesAno}
                onChange={(e) => setMesAno(e.target.value)}
                className="w-full bg-slate-800/70 border border-blue-800/40 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-500 transition-all duration-200 hover:border-blue-700/60 backdrop-blur-sm"
              />
            </div>
          )}

          {/* Descrição */}
          <div>
            <label className="block text-xs text-blue-300 mb-2 font-medium">Descrição (Opcional)</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={2}
              className="w-full bg-slate-800/70 border border-blue-800/40 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-500 resize-none transition-all duration-200 hover:border-blue-700/60 backdrop-blur-sm"
              placeholder="Adicione uma descrição..."
            />
          </div>
        </div>

        {/* Área de Drag and Drop */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-300 flex-1 backdrop-blur-sm ${
            dragActive 
              ? 'border-blue-500 bg-blue-600/10 scale-[1.02] shadow-lg shadow-blue-500/25' 
              : 'border-blue-800/40 hover:border-blue-700/60 bg-slate-800/25'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="w-10 h-10 mx-auto mb-3 text-blue-400 transition-transform duration-300 hover:scale-110" />
          <p className="text-sm mb-2 text-blue-100">Arraste arquivos aqui</p>
          <p className="text-xs text-blue-400 mb-3">ou</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept=".pdf,.xlsx,.csv,.docx"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-blue-700/90 hover:bg-blue-700 px-3 py-1 rounded text-sm transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-blue-700/25 border border-blue-600/50"
          >
            Selecionar Arquivos
          </button>
          <p className="text-xs text-blue-400 mt-3">PDF, XLSX, CSV, DOCX</p>
        </div>

        {/* Lista de arquivos selecionados */}
        {selectedFiles.length > 0 && (
          <div className="mt-4 space-y-2 animate-fade-in-down">
            <h3 className="text-xs font-medium text-blue-300">
              Arquivos ({selectedFiles.length})
            </h3>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-slate-800/50 p-2 rounded text-xs transition-all duration-200 hover:bg-slate-800/70 backdrop-blur-sm border border-blue-800/20">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="w-3 h-3 text-blue-400 flex-shrink-0" />
                    <span className="truncate text-blue-100">{file.name}</span>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="p-1 hover:bg-slate-600 rounded flex-shrink-0 transition-all duration-200 hover:scale-110"
                  >
                    <X className="w-3 h-3 text-red-400 hover:text-red-300 transition-colors duration-200" />
                  </button>
                </div>
              ))}
            </div>
            
            <button
              onClick={handleUpload}
              disabled={!selectedUnidade || !tipoArquivo || selectedFiles.length === 0}
              className="w-full mt-2 bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 rounded text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-700/30 border border-blue-600/30"
            >
              Fazer Upload ({selectedFiles.length} arquivo{selectedFiles.length !== 1 ? 's' : ''})
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-blue-300 to-blue-200 bg-clip-text text-transparent">
              Empresas
            </h1>
            <button
              onClick={handleSync}
              disabled={loading}
              className="bg-slate-800/70 hover:bg-slate-800/90 disabled:opacity-50 px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-all duration-200 hover:scale-105 active:scale-95 border border-blue-800/40 hover:border-blue-700/60 backdrop-blur-sm"
              title="Sincroniza com as pastas locais e recarrega"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin text-blue-400" /> : <RefreshCw className="w-4 h-4 transition-transform duration-300 hover:rotate-180 text-blue-400" />}
              Atualizar
            </button>
            <button
              onClick={() => setShowForm(s => !s)}
              className="bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 px-4 py-2 rounded-lg flex items-center space-x-2 transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-blue-700/30 border border-blue-600/30"
            >
              <Plus className={`w-5 h-5 transition-transform duration-300 ${showForm ? 'rotate-45' : ''}`} />
              <span>{showForm ? 'Cancelar' : 'Nova Empresa'}</span>
            </button>
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="mb-6 bg-slate-900/70 border border-blue-800/40 rounded-lg p-6 space-y-4 animate-fade-in-down backdrop-blur-sm shadow-lg shadow-blue-900/20">
            <div>
              <label className="block text-sm mb-1 text-blue-200 font-medium">Nome da Empresa</label>
              <input
                className="w-full bg-slate-800/70 border border-blue-800/40 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-500 transition-all duration-200 hover:border-blue-700/60 backdrop-blur-sm"
                value={formNome}
                onChange={e => setFormNome(e.target.value)}
                placeholder="Ex: CEOLIN"
                required
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm text-blue-200 font-medium">Unidades</label>
                <button
                  type="button"
                  onClick={handleAddUnidade}
                  className="text-xs bg-blue-700/30 hover:bg-blue-700/50 px-2 py-1 rounded flex items-center gap-1 transition-all duration-200 hover:scale-105 active:scale-95 border border-blue-600/40"
                >
                  <Plus className="w-3 h-3" />
                  Adicionar Unidade
                </button>
              </div>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {formUnidades.map((unidade, index) => (
                  <div key={index} className="flex items-center gap-2 animate-fade-in">
                    <span className="text-xs text-blue-400 w-8 font-mono">{String(index + 1).padStart(3, '0')}</span>
                    <input
                      className="flex-1 bg-slate-800/70 border border-blue-800/40 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-500 transition-all duration-200 hover:border-blue-700/60 backdrop-blur-sm"
                      value={unidade}
                      onChange={e => handleUpdateUnidade(index, e.target.value)}
                      placeholder={index === 0 ? "Matriz" : `Unidade ${index + 1}`}
                      required
                    />
                    {formUnidades.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveUnidade(index)}
                        className="p-2 text-red-400 hover:bg-red-950/30 rounded transition-all duration-200 hover:scale-110 active:scale-95"
                        title="Remover unidade"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-blue-400 mt-1">
                As unidades serão criadas com IDs sequenciais: 001, 002, 003...
              </p>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormUnidades(['Matriz']); // Reset ao cancelar
                }}
                className="px-4 py-2 rounded-lg bg-slate-800/70 hover:bg-slate-800/90 transition-all duration-200 hover:scale-105 active:scale-95 border border-blue-800/40"
              >Cancelar</button>
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 disabled:opacity-50 flex items-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95 disabled:cursor-not-allowed shadow-lg shadow-blue-700/30 border border-blue-600/30"
              >
                {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                Salvar
              </button>
            </div>
          </form>
        )}

        {error && (
          <div className="mb-4 flex items-start gap-2 text-red-400 bg-red-950/30 border border-red-800 rounded p-3 text-sm animate-fade-in-down">
            <AlertCircle className="w-4 h-4 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-400" />
          <input
            type="text"
            placeholder="Pesquisar"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/70 border border-blue-800/40 rounded-lg pl-10 pr-4 py-3 text-white placeholder-blue-400/70 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-500 transition-all duration-200 hover:border-blue-700/60 backdrop-blur-sm"
          />
        </div>

        {/* Table */}
        <div className="bg-slate-900/70 rounded-lg overflow-hidden border border-blue-800/40 backdrop-blur-sm shadow-lg shadow-blue-900/20">
          <table className="w-full">
            <thead>
              <tr className="border-b border-blue-800/40 text-sm bg-gradient-to-r from-blue-800/25 to-blue-700/25">
                <th className="text-left px-6 py-3 font-semibold text-blue-300 w-24">ID</th>
                <th className="text-left px-6 py-3 font-semibold text-blue-300">Nome</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredEmpresas.map((empresa) => {
                const isExpanded = expandedEmpresas.has(empresa.id);
                return (
                  <React.Fragment key={empresa.id}>
                    <tr 
                      className={`border-b border-blue-800/30 hover:bg-blue-800/15 transition-all duration-200 cursor-pointer ${
                        isExpanded ? 'bg-blue-800/10' : ''
                      }`}
                      onClick={() => toggleEmpresaExpansion(empresa.id)}
                    >
                      <td className="px-6 py-3 text-blue-200 font-mono tracking-wider">
                        {empresa.id_empresa}
                      </td>
                      <td className="px-6 py-3 text-white">
                        {empresa.nome}
                        {isExpanded && (
                          <span className="ml-2 text-xs text-blue-400 animate-fade-in">(expandido)</span>
                        )}
                      </td>
                    </tr>
                    
                    {/* Unidades expandidas com animação */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={2} className="p-0 bg-slate-900/50">
                          <div className="animate-slide-down">
                            {/* Linha conectora visual */}
                            <div className="px-6 py-1">
                              <div className="border-l-2 border-blue-600/50 ml-4 h-2"></div>
                            </div>
                            
                            {/* Unidade - Matriz */}
                            <div 
                              className={`px-6 py-3 hover:bg-blue-800/15 transition-colors cursor-pointer border-b border-blue-800/30 ${
                                selectedUnidade === '001' && selectedEmpresa === String(empresa.id)
                                  ? 'bg-blue-700/10 border-blue-600/40' 
                                  : ''
                              }`}
                              onClick={(e) => e.stopPropagation()}
                              onDoubleClick={() => handleUnidadeDoubleClick(empresa.id, '001', empresa.nome, 'Matriz')}
                              title="Duplo clique para selecionar"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <div className="flex items-center text-blue-400 font-mono text-xs">
                                    <div className="w-4 border-b border-l-2 border-blue-600/50 h-4 mr-2 ml-4"></div>
                                    001
                                  </div>
                                  <div className="text-blue-200">
                                    <MapPin className="w-3 h-3 inline mr-2 text-blue-400" />
                                    Matriz
                                  </div>
                                </div>
                                {selectedUnidade === '001' && selectedEmpresa === String(empresa.id) && (
                                  <span className="text-xs bg-blue-700/25 text-blue-300 px-2 py-1 rounded animate-pulse border border-blue-600/50">
                                    Selecionada
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {/* TODO: Carregar unidades reais da empresa do backend */}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          {loading && (
            <div className="flex items-center gap-2 px-6 py-4 text-blue-300 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
            </div>
          )}
          {!loading && filteredEmpresas.length === 0 && (
            <div className="text-center py-8 text-blue-300 text-sm">
              Nenhuma empresa encontrada
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default EmpresasPage;