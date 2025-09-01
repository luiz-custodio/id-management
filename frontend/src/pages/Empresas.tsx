import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Search, MapPin, Plus, RefreshCw, Loader2, AlertCircle, X, Upload, FileText, Trash2, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { api } from '../lib/api';
import type { Empresa, Unidade } from '../lib/api';

// Importar função de criar unidade
const { criarUnidade } = api;

// Hook para buscar configuração do sistema
const useSystemConfig = () => {
  const [basePath, setBasePath] = useState<string>("");
  const [configLoading, setConfigLoading] = useState(true);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await api.getConfig();
        setBasePath(config.basePath);
      } catch (error) {
        console.error('Erro ao carregar configuração:', error);
        // Fallback para valor padrão
        setBasePath("C:/Users/User/Documents/PROJETOS/id-management/cliente");
      } finally {
        setConfigLoading(false);
      }
    };

    loadConfig();
  }, []);

  return { basePath, configLoading };
};

const EmpresasPage: React.FC = () => {
  // Configuração do sistema
  const { basePath } = useSystemConfig();
  
  // Estado para detectar tamanho da janela
  const [windowSize, setWindowSize] = useState('medium');
  
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.windowGetSizes().then(({ current }) => {
        setWindowSize(current);
      });
    }
  }, []);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [unidadesPorEmpresa, setUnidadesPorEmpresa] = useState<Record<number, Unidade[]>>({});
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formNome, setFormNome] = useState('');
  const [formUnidades, setFormUnidades] = useState<string[]>(['Matriz']);
  
  // Estados para exclusão
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [empresaToDelete, setEmpresaToDelete] = useState<{id: number, nome: string} | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  
  // Estados para exclusão de unidades
  const [showDeleteUnidadeModal, setShowDeleteUnidadeModal] = useState(false);
  const [unidadeToDelete, setUnidadeToDelete] = useState<{id: number, nome: string, empresa_nome: string, empresa_id: number} | null>(null);
  const [deleteUnidadeConfirmation, setDeleteUnidadeConfirmation] = useState('');
  const [deletingUnidade, setDeletingUnidade] = useState(false);
  
  // Estados para criação de unidades
  const [showCreateUnidadeModal, setShowCreateUnidadeModal] = useState(false);
  const [empresaToCreateUnidade, setEmpresaToCreateUnidade] = useState<{id: number, nome: string} | null>(null);
  const [newUnidadeNome, setNewUnidadeNome] = useState('');
  const [creatingUnidade, setCreatingUnidade] = useState(false);
  
  // Estados para upload
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>('');
  const [selectedUnidade, setSelectedUnidade] = useState<string>('');
  const [selectedEmpresaNome, setSelectedEmpresaNome] = useState<string>('');
  const [selectedUnidadeNome, setSelectedUnidadeNome] = useState<string>('');
  const [tipoArquivo, setTipoArquivo] = useState<string>('');
  const [cceeSubtipo, setCceeSubtipo] = useState<string>(''); // Novo estado para subtipo CCEE
  const [mesAno, setMesAno] = useState<string>('');
  const [descricao, setDescricao] = useState<string>('');
  const [mostrarDataOpcional, setMostrarDataOpcional] = useState<boolean>(false);
  const [autoDeteccao, setAutoDeteccao] = useState<boolean>(false);
  const [arquivosAnalisados, setArquivosAnalisados] = useState<Array<{
    file: File;
    tipoDetectado: string;
    dataDetectada: string;
    confianca: number;
    motivo: string;
  }>>([]);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [expandedEmpresas, setExpandedEmpresas] = useState<Set<number>>(new Set());
  const [uploadPreview, setUploadPreview] = useState<any>(null);
  const [showUploadPreview, setShowUploadPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ordenação
  const [sortBy, setSortBy] = useState<'id' | 'nome'>('id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const toggleSort = (key: 'id' | 'nome') => {
    setSortBy(prev => {
      if (prev === key) {
        setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDir('asc');
      return key;
    });
  };

  // Função para obter mês/ano atual no formato YYYY-MM
  const getCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  // Tipos de arquivo disponíveis - data obrigatória exceto Estudo e todos os DOC-*
  const tiposArquivo = [
    { value: 'FAT', label: 'Fatura', requireDate: true },
    { value: 'NE-CP', label: 'Nota de Energia - CP', requireDate: true },
    { value: 'NE-LP', label: 'Nota de Energia - LP', requireDate: true },
    { value: 'REL', label: 'Relatório', requireDate: true },
    { value: 'RES', label: 'Resumo', requireDate: true },
    { value: 'EST', label: 'Estudo', requireDate: false },
    { value: 'DOC-CTR', label: 'Documento - Contrato', requireDate: false },
    { value: 'DOC-ADT', label: 'Documento - Aditivo', requireDate: false },
    { value: 'DOC-CAD', label: 'Documento - Cadastro', requireDate: false },
    { value: 'DOC-PRO', label: 'Documento - Procuração', requireDate: false },
    { value: 'DOC-CAR', label: 'Documento - Carta Denúncia', requireDate: false },
    { value: 'DOC-COM', label: 'Documento - Comunicado', requireDate: false },
    { value: 'DOC-LIC', label: 'Documento - Licença', requireDate: false },
    { value: 'CCEE', label: 'CCEE - DRI', requireDate: true },
  ];

  // Subtipos CCEE disponíveis
  const cceeSubtipos = [
    { value: 'CFZ003', label: 'CFZ003' },
    { value: 'CFZ004', label: 'CFZ004' },
    { value: 'GFN001', label: 'GFN001' },
    { value: 'LFN001', label: 'LFN001' },
    { value: 'LFRCA001', label: 'LFRCA001' },
    { value: 'LFRES001', label: 'LFRES001' },
    { value: 'PEN001', label: 'PEN001' },
    { value: 'SUM001', label: 'SUM001' },
    { value: 'BOLETOCA', label: 'BOLETOCA' },
    { value: 'ND', label: 'ND' },
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

  // Handler para mudança de tipo de arquivo
  const handleTipoArquivoChange = (valor: string) => {
    setTipoArquivo(valor);
    setCceeSubtipo(''); // Limpa subtipo CCEE quando muda tipo
    setMostrarDataOpcional(false); // Reset do campo opcional
    setArquivosAnalisados([]); // Reset da análise automática
    
    // Se o tipo requer data e não há data definida, define para o mês atual
    const tipoSelecionado = tiposArquivo.find(t => t.value === valor);
    if (tipoSelecionado?.requireDate && !mesAno) {
      setMesAno(getCurrentMonth());
    }
    // Se o tipo não requer data, limpa o campo
    else if (tipoSelecionado && !tipoSelecionado.requireDate) {
      setMesAno('');
    }
  };

  // Função para lidar com mudança do checkbox de auto-detecção
  const handleAutoDeteccaoChange = (ativado: boolean) => {
    setAutoDeteccao(ativado);
    
    if (ativado) {
      // Se ativou auto-detecção, limpa tipo manual e analisa arquivos
      setTipoArquivo('');
      setCceeSubtipo('');
      setMesAno('');
      setMostrarDataOpcional(false);
      
      // Se há arquivos, analisa automaticamente
      if (selectedFiles.length > 0) {
        const analises = selectedFiles.map(analisarArquivoAutomaticamente);
        setArquivosAnalisados(analises);
      }
    } else {
      // Se desativou auto-detecção, limpa análises
      setArquivosAnalisados([]);
    }
  };

  // Função para detectar tipo e data automaticamente
  const analisarArquivoAutomaticamente = (file: File) => {
    const nome = file.name.toLowerCase();
    const nomeNorm = nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    let tipoDetectado = '';
    let dataDetectada = '';
    let confianca = 0;
    let motivo = '';

    // REGRA 1: Faturas - apenas data no nome (ex: "2025-08.pdf")
    const regexDataFatura = /^(\d{4})-(\d{2})\.(pdf|xlsm|xlsx?|docx?)$/i;
    const matchFatura = nome.match(regexDataFatura);
    if (matchFatura) {
      tipoDetectado = 'FAT';
      dataDetectada = `${matchFatura[1]}-${matchFatura[2]}`;
      confianca = 95;
      motivo = `Fatura detectada: nome contém apenas data (${dataDetectada})`;
    }
    
    // REGRA 2: Notas de Energia - contém "nota", "cp" ou "lp"
    else if (nome.includes('nota') || nome.includes('cp') || nome.includes('lp')) {
      if (nome.includes('cp')) {
        tipoDetectado = 'NE-CP';
        motivo = 'Nota de Energia CP detectada: nome contém "CP"';
      } else if (nome.includes('lp')) {
        tipoDetectado = 'NE-LP';
        motivo = 'Nota de Energia LP detectada: nome contém "LP"';
      } else {
        tipoDetectado = 'NE-CP'; // Padrão se só tem "nota"
        motivo = 'Nota de Energia detectada: nome contém "nota"';
      }
      
      // Data = data de modificação menos 1 mês
      const dataModificacao = new Date(file.lastModified);
      dataModificacao.setMonth(dataModificacao.getMonth() - 1);
      const ano = dataModificacao.getFullYear();
      const mes = String(dataModificacao.getMonth() + 1).padStart(2, '0');
      dataDetectada = `${ano}-${mes}`;
      confianca = 85;
      motivo += ` - Data: modificação menos 1 mês (${dataDetectada})`;
    }
    
    // REGRA 3: Estudo - contém "estudo" no nome → usa data de modificação
    else if (nome.includes('estudo')) {
      tipoDetectado = 'EST';
      const dataMod = new Date(file.lastModified);
      const ano = dataMod.getFullYear();
      const mes = String(dataMod.getMonth() + 1).padStart(2, '0');
      dataDetectada = `${ano}-${mes}`;
      confianca = 90;
      motivo = 'Estudo detectado: nome contém "estudo" - usando data de modificação';
    }

    // REGRA 4: Documentos específicos (data = modificação): Carta Denúncia, Contrato, Procuração, Aditivo
    else if (
      nome.includes('carta') && (nome.includes('denúncia') || nomeNorm.includes('denuncia'))
      || nome.includes('aditivo')
      || nome.includes('contrato')
      || nome.includes('procuração') || nomeNorm.includes('procuracao')
    ) {
      const dataMod = new Date(file.lastModified);
      const ano = dataMod.getFullYear();
      const mes = String(dataMod.getMonth() + 1).padStart(2, '0');
      // Para todos os DOC-* usamos apenas AAAA-MM
      dataDetectada = `${ano}-${mes}`;
      confianca = 90;

      if (nome.includes('carta') && (nome.includes('denúncia') || nomeNorm.includes('denuncia'))) {
        tipoDetectado = 'DOC-CAR';
        motivo = 'Documento detectado: "Carta denúncia" - usando mês/ano da modificação';
      } else if (nome.includes('aditivo')) {
        tipoDetectado = 'DOC-ADT';
        motivo = 'Documento detectado: "Aditivo" - usando mês/ano da modificação';
      } else if (nome.includes('contrato')) {
        tipoDetectado = 'DOC-CTR';
        motivo = 'Documento detectado: "Contrato" - usando mês/ano da modificação';
      } else if (nome.includes('procuração') || nomeNorm.includes('procuracao')) {
        tipoDetectado = 'DOC-PRO';
        motivo = 'Documento detectado: "Procuração" - usando mês/ano da modificação';
      }
    }

    // REGRA 5: Relatórios - contém "relatório" e data "JUL-25"
    else if (nome.includes('relatorio') || nome.includes('relatório')) {
      tipoDetectado = 'REL';
      
      // Buscar padrão de data no nome (ex: "JUL-25", "AGO-25")
      const regexDataRelatorio = /(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)-(\d{2})/i;
      const matchRelatorio = nome.match(regexDataRelatorio);
      
      if (matchRelatorio) {
        const mesNome = matchRelatorio[1].toLowerCase();
        const ano20 = matchRelatorio[2];
        
        // Converter mês para número
        const meses: { [key: string]: string } = {
          'jan': '01', 'fev': '02', 'mar': '03', 'abr': '04',
          'mai': '05', 'jun': '06', 'jul': '07', 'ago': '08',
          'set': '09', 'out': '10', 'nov': '11', 'dez': '12'
        };
        
        const mesNum = meses[mesNome];
        const anoCompleto = `20${ano20}`;
        dataDetectada = `${anoCompleto}-${mesNum}`;
        confianca = 90;
        motivo = `Relatório detectado: nome contém "relatório" e data ${matchRelatorio[0].toUpperCase()}`;
      } else {
        // Se não encontrou data no nome, usar data atual
        dataDetectada = getCurrentMonth();
        confianca = 70;
        motivo = 'Relatório detectado: nome contém "relatório" - usando data atual';
      }
    }
    
    // Se não detectou nada, deixar vazio para seleção manual
    else {
      tipoDetectado = ''; // Vazio - usuário deve escolher manualmente
      dataDetectada = '';
      confianca = 0;
      motivo = 'Tipo não identificado - seleção manual necessária';
    }

    return {
      file,
      tipoDetectado,
      dataDetectada,
      confianca,
      motivo
    };
  };

  // Nova função: sincroniza PASTA → BANCO (importa empresas/unidades a partir do filesystem)
  const handleSync = async () => {
    if (!basePath) {
      setError('Configuração do sistema não carregada');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // PASTA → BANCO: importa empresas/unidades existentes nas pastas para o banco
      const result = await api.sincronizarEmpresas(basePath);
      
      // Recarrega a lista atualizada
      await fetchEmpresas();
      
      // Limpa cache de unidades expandidas para forçar recarregamento
      setUnidadesPorEmpresa({});
      setExpandedEmpresas(new Set());
      
      // Mostra mensagem de sucesso detalhada (PASTA → BANCO)
      const totalChanges = (result.synced || 0) + (result.updated || 0);
      if (totalChanges > 0) {
        const details: string[] = [];
        if (result.synced > 0) details.push(`${result.synced} empresa(s) nova(s)`);
        if (result.updated > 0) details.push(`${result.updated} empresa(s) já existente(s)`);
        setError(`✅ Sincronização (pastas → banco) concluída: ${details.join(', ')}`);
        setTimeout(() => setError(null), 6000);
      } else {
        setError(`✅ Nada para importar. Banco já reflete as pastas.`);
        setTimeout(() => setError(null), 2000);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao sincronizar empresas';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

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
      
      // Envia todas as unidades válidas
      await api.criarEmpresa(formNome.trim(), unidadesValidas);
      
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

  // Função para criar unidade
  const handleCreateUnidade = async () => {
    if (!empresaToCreateUnidade || !newUnidadeNome.trim()) return;
    
    setCreatingUnidade(true);
    try {
      await criarUnidade(empresaToCreateUnidade.id, newUnidadeNome.trim());
      
      // Atualizar a lista de unidades para a empresa
      await loadUnidadesEmpresa(empresaToCreateUnidade.id);
      
      // Limpar estados
      setShowCreateUnidadeModal(false);
      setEmpresaToCreateUnidade(null);
      setNewUnidadeNome('');
      
      // Notificar sucesso
      alert(`Unidade "${newUnidadeNome.trim()}" criada com sucesso!`);
      
    } catch (error) {
      console.error('Erro ao criar unidade:', error);
      alert('Erro ao criar unidade. Tente novamente.');
    } finally {
      setCreatingUnidade(false);
    }
  };

  // Função para abrir modal de exclusão
  const handleOpenDeleteModal = (empresa: Empresa) => {
    setEmpresaToDelete({ id: empresa.id, nome: empresa.nome });
    setShowDeleteModal(true);
    setDeleteConfirmation('');
  };

  // Função para confirmar exclusão
  const handleConfirmDelete = async () => {
    if (!empresaToDelete || deleteConfirmation !== empresaToDelete.nome) {
      setError('Digite o nome da empresa corretamente para confirmar');
      return;
    }

    try {
      setDeleting(true);
      setError(null);
      
      await api.excluirEmpresa(empresaToDelete.id);
      
      // Fecha modal e limpa estados
      setShowDeleteModal(false);
      setEmpresaToDelete(null);
      setDeleteConfirmation('');
      
      // Se a empresa excluída estava selecionada, limpa a seleção
      if (selectedEmpresa === String(empresaToDelete.id)) {
        setSelectedEmpresa('');
        setSelectedUnidade('');
        setSelectedEmpresaNome('');
        setSelectedUnidadeNome('');
      }
      
      // Recarrega lista
      await fetchEmpresas();
      
      // Mensagem de sucesso
      setError(`✅ Empresa ${empresaToDelete.nome} excluída com sucesso`);
      setTimeout(() => setError(null), 3000);
      
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir empresa';
      setError(msg);
    } finally {
      setDeleting(false);
    }
  };

  // Função para abrir modal de exclusão de unidade
  const handleOpenDeleteUnidadeModal = (unidadeId: number, unidadeNome: string, empresaNome: string, empresaId: number) => {
    setUnidadeToDelete({ id: unidadeId, nome: unidadeNome, empresa_nome: empresaNome, empresa_id: empresaId });
    setShowDeleteUnidadeModal(true);
    setDeleteUnidadeConfirmation('');
  };

  // Função para confirmar exclusão de unidade
  const handleConfirmDeleteUnidade = async () => {
    if (!unidadeToDelete || deleteUnidadeConfirmation !== unidadeToDelete.nome) {
      setError('Digite o nome da unidade corretamente para confirmar');
      return;
    }

    try {
      setDeletingUnidade(true);
      setError(null);
      
      await api.excluirUnidade(unidadeToDelete.id);
      
      // Fecha modal e limpa estados
      setShowDeleteUnidadeModal(false);
      setUnidadeToDelete(null);
      setDeleteUnidadeConfirmation('');
      
      // Se a unidade excluída estava selecionada, limpa a seleção
      if (selectedUnidade === String(unidadeToDelete.id)) {
        setSelectedEmpresa('');
        setSelectedUnidade('');
        setSelectedEmpresaNome('');
        setSelectedUnidadeNome('');
      }
      
      // Recarrega lista de empresas
      await fetchEmpresas();
      
      // Recarrega as unidades da empresa específica se ela estiver expandida
      if (unidadeToDelete && expandedEmpresas.has(unidadeToDelete.empresa_id)) {
        console.log(`Recarregando unidades da empresa ${unidadeToDelete.empresa_id}`);
        await loadUnidadesEmpresa(unidadeToDelete.empresa_id);
      }
      
      // Mensagem de sucesso
      setError(`✅ Unidade ${unidadeToDelete.nome} excluída com sucesso`);
      setTimeout(() => setError(null), 3000);
      
    } catch (err) {
      console.error('Erro ao excluir unidade:', err);
      
      // Se for erro 400 (proteção da unidade 001), fecha o modal e mostra a mensagem
      if (err instanceof Error && err.message.includes('Não é permitido excluir a unidade 001')) {
        setShowDeleteUnidadeModal(false);
        setUnidadeToDelete(null);
        setDeleteUnidadeConfirmation('');
        setError('❌ Não é permitido excluir a unidade 001 (Matriz). Esta é a unidade principal da empresa.');
        setTimeout(() => setError(null), 5000);
      } else {
        const msg = err instanceof Error ? err.message : 'Erro ao excluir unidade';
        setError(msg);
      }
    } finally {
      setDeletingUnidade(false);
    }
  };

  useEffect(() => { fetchEmpresas(); }, []);

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

  const sortedEmpresas = useMemo(() => {
    const arr = [...filteredEmpresas];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'id') {
        const ai = parseInt(String((a as any).id_empresa ?? a.id ?? 0));
        const bi = parseInt(String((b as any).id_empresa ?? b.id ?? 0));
        cmp = (ai || 0) - (bi || 0);
      } else {
        cmp = a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [filteredEmpresas, sortBy, sortDir]);

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
      adicionarArquivos(files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      adicionarArquivos(files);
    }
  };

  // Função unificada para adicionar arquivos com análise automática
  const adicionarArquivos = (files: File[]) => {
    setSelectedFiles(prev => [...prev, ...files]);
    
    // Se auto-detecção estiver ativada, analisar arquivos
    if (autoDeteccao) {
      const analises = files.map(analisarArquivoAutomaticamente);
      setArquivosAnalisados(prev => [...prev, ...analises]);
      
      // Log das detecções para debug
      analises.forEach(analise => {
        console.log(`🤖 ${analise.file.name}:`);
        console.log(`   Tipo: ${analise.tipoDetectado} (${analise.confianca}%)`);
        console.log(`   Data: ${analise.dataDetectada}`);
        console.log(`   Motivo: ${analise.motivo}`);
      });
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    
    // Se estiver no modo AUTO, remover também da análise
    if (autoDeteccao) {
      setArquivosAnalisados(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleUpload = async () => {
    if (!selectedUnidade || selectedFiles.length === 0) {
      setError('Selecione uma unidade e adicione arquivos');
      return;
    }

    // Verificar se precisa de tipo manual ou auto-detecção
    if (!autoDeteccao && !tipoArquivo) {
      setError('Selecione um tipo de arquivo ou ative a detecção automática');
      return;
    }

    // Se auto-detecção ativa, verificar se há arquivos não identificados
    if (autoDeteccao && arquivosAnalisados.some(analise => !analise.tipoDetectado)) {
      setError('Alguns arquivos não foram identificados automaticamente. Desative a detecção automática e selecione os tipos manualmente.');
      return;
    }

    // Verificar se CCEE precisa de subtipo
    if (!autoDeteccao && tipoArquivo === 'CCEE' && !cceeSubtipo) {
      setError('Selecione um subtipo CCEE');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      
      const fileList = new DataTransfer();
      selectedFiles.forEach(file => fileList.items.add(file));
      
      let preview;
      
      // Se estiver com auto-detecção ativada, usar endpoint específico
      if (autoDeteccao) {
        // Converte arquivosAnalisados para o formato esperado pela API
        const filesWithAnalysis = arquivosAnalisados.map(analise => ({
          file: analise.file,
          tipoDetectado: analise.tipoDetectado,
          dataDetectada: analise.dataDetectada
        }));
        
        preview = await api.previewUploadAuto(
          parseInt(selectedUnidade),
          filesWithAnalysis,
          descricao || null
        );
      } else {
        // Verifica se data é obrigatória para o tipo selecionado
        const tipoSelecionado = tiposArquivo.find(t => t.value === tipoArquivo);
        if (tipoSelecionado?.requireDate && !mesAno) {
          setError('Data (Mês/Ano) é obrigatória para este tipo de arquivo');
          return;
        }
        
        // Para CCEE, combina tipo e subtipo
        const tipoFinal = tipoArquivo === 'CCEE' ? `CCEE-${cceeSubtipo}` : tipoArquivo;
        
        // Modo manual normal
        preview = await api.previewUpload(
          parseInt(selectedUnidade), 
          tipoFinal, 
          mesAno || null, 
          descricao || null, 
          fileList.files
        );
      }
      
      setUploadPreview(preview);
      setShowUploadPreview(true);
      
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao fazer preview do upload';
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  const executarUpload = async (conflictStrategy?: 'overwrite'|'version'|'skip') => {
    if (!selectedUnidade || selectedFiles.length === 0) {
      return;
    }

    // Verificar se precisa de tipo manual ou auto-detecção
    if (!autoDeteccao && !tipoArquivo) {
      setError('Selecione um tipo de arquivo ou ative a detecção automática');
      return;
    }

    // Se auto-detecção ativa, verificar se há arquivos não identificados
    if (autoDeteccao && arquivosAnalisados.some(analise => !analise.tipoDetectado)) {
      setError('Alguns arquivos não foram identificados automaticamente. Desative a detecção automática e selecione os tipos manualmente.');
      return;
    }

    // Verificar se CCEE precisa de subtipo
    if (!autoDeteccao && tipoArquivo === 'CCEE' && !cceeSubtipo) {
      setError('Selecione um subtipo CCEE');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      
      let result;
      
      // Se estiver com auto-detecção ativada, usar endpoint específico
      if (autoDeteccao) {
        // Converte arquivosAnalisados para o formato esperado pela API
        const filesWithAnalysis = arquivosAnalisados.map(analise => ({
          file: analise.file,
          tipoDetectado: analise.tipoDetectado,
          dataDetectada: analise.dataDetectada
        }));
        
        result = await api.executarUploadAuto(
          parseInt(selectedUnidade),
          filesWithAnalysis,
          descricao || null,
          conflictStrategy
        );
      } else {
        // Verifica se data é obrigatória para o tipo selecionado
        const tipoSelecionado = tiposArquivo.find(t => t.value === tipoArquivo);
        if (tipoSelecionado?.requireDate && !mesAno) {
          setError('Data (Mês/Ano) é obrigatória para este tipo de arquivo');
          return;
        }
        
        // Para CCEE, combina tipo e subtipo
        const tipoFinal = tipoArquivo === 'CCEE' ? `CCEE-${cceeSubtipo}` : tipoArquivo;
        
        // Executa o upload manual normal
        const fileList = new DataTransfer();
        selectedFiles.forEach(file => fileList.items.add(file));
        
        result = await api.executarUpload(
          parseInt(selectedUnidade), 
          tipoFinal, 
          mesAno || null, 
          descricao || null, 
          fileList.files,
          conflictStrategy
        );
      }
      
      // Limpa formulário
      setSelectedFiles([]);
      setArquivosAnalisados([]);
      setTipoArquivo('');
      setCceeSubtipo('');
      setMesAno('');
      setDescricao('');
      setMostrarDataOpcional(false);
      setShowUploadPreview(false);
      setUploadPreview(null);
      
      // Mostra resultado
      setError(`✅ ${result.message}`);
      setTimeout(() => setError(null), 5000);
      
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao fazer upload';
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  // Toggle expansão de empresa - permite apenas uma por vez
  const toggleEmpresaExpansion = async (empresaId: number) => {
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
        
        // Carrega as unidades desta empresa se ainda não foram carregadas
        if (!unidadesPorEmpresa[empresaId]) {
          loadUnidadesEmpresa(empresaId);
        }
        
        return newSet;
      }
    });
  };

  // Função para carregar unidades de uma empresa
  const loadUnidadesEmpresa = async (empresaId: number) => {
    try {
      const unidades = await api.listarUnidades(empresaId);
      setUnidadesPorEmpresa(prev => ({
        ...prev,
        [empresaId]: unidades
      }));
    } catch (err) {
      console.error('Erro ao carregar unidades:', err);
    }
  };

  // Seleciona unidade ao dar duplo clique
  const handleUnidadeDoubleClick = (empresaId: number, unidadeDbId: number, empresaNome: string, unidadeNome: string) => {
    // Se já está selecionada, desseleciona
    if (selectedEmpresa === String(empresaId) && selectedUnidade === String(unidadeDbId)) {
      setSelectedEmpresa('');
      setSelectedUnidade('');
      setSelectedEmpresaNome('');
      setSelectedUnidadeNome('');
    } else {
      // Senão, seleciona
      setSelectedEmpresa(String(empresaId));
      setSelectedUnidade(String(unidadeDbId));
      setSelectedEmpresaNome(empresaNome);
      setSelectedUnidadeNome(unidadeNome);
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-blue-900 text-white flex overflow-hidden">
      {/* Sidebar com upload */}
      <div className={`${windowSize === 'small' ? 'w-64' : windowSize === 'medium' ? 'w-72' : 'w-80'} bg-gradient-to-b from-slate-900/95 to-blue-950/95 backdrop-blur-sm ${windowSize === 'small' ? 'p-4' : 'p-6'} flex flex-col h-full border-r border-blue-800/30`}>
        {/* Logo - Fixo no topo */}
        <div className={`${windowSize === 'small' ? 'mb-3' : 'mb-6'} flex-shrink-0`}>
          {/* Logo BM Energia oficial */}
          <div className="flex items-center justify-center">
            <img 
              src="/logo-bm-energia.png" 
              alt="BM Energia" 
              className="h-12 w-auto transition-transform duration-300 hover:scale-105"
              onError={(e) => {
                // Fallback para quando a imagem não carregar
                e.currentTarget.style.display = 'none';
                const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                if (nextElement) {
                  nextElement.style.display = 'flex';
                }
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
        
        {/* Área de conteúdo principal com scroll */}
        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Título e Unidade selecionada */}
          <div className="space-y-4">
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

          {/* Checkbox de Auto-Detecção */}
          <div className="mb-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs">
              <input 
                type="checkbox" 
                checked={autoDeteccao}
                onChange={(e) => handleAutoDeteccaoChange(e.target.checked)}
                className="w-3 h-3 text-blue-500 bg-slate-700 border-slate-600 rounded focus:ring-blue-500 focus:ring-1"
              />
              <span className="text-slate-400 hover:text-slate-300 transition-colors">
                Detecção automática
              </span>
            </label>
            
            {/* Regras de detecção automática (aparece quando ativada) */}
            {autoDeteccao && (
              <div className="mt-2 ml-5 text-xs text-slate-500 leading-relaxed">
                <div className="opacity-75">
                  <strong className="text-slate-400">Regras de detecção:</strong><br/>
                  • <span className="text-blue-400">Faturas:</span> data no nome (YYYY-MM). Ex.: 2025-08.pdf/xlsx/xlsm<br/>
                  • <span className="text-green-400">Notas:</span> contém "nota", "CP" ou "LP" (data = modificação menos 1 mês)<br/>
                  • <span className="text-amber-400">Estudos:</span> contém "estudo" (data = mês/ano da modificação)<br/>
                  • <span className="text-yellow-400">Relatórios:</span> contém "relatório" + mês abreviado, ex.: JUL-25<br/>
                  • <span className="text-cyan-400">Docs:</span> "Carta denúncia", "Contrato", "Procuração", "Aditivo" (data = mês/ano da modificação)
                  • <span className="text-slate-400">Não identificado:</span> seleção manual necessária
                </div>
              </div>
            )}
          </div>

          {/* Tipo de Arquivo - desabilitado quando auto-detecção ativa */}
          <div>
            <label className="block text-xs text-blue-300 mb-2 font-medium">
              Tipo de Arquivo {autoDeteccao && <span className="text-slate-500 font-normal">(automático)</span>}
            </label>
            <select 
              value={tipoArquivo}
              onChange={(e) => handleTipoArquivoChange(e.target.value)}
              disabled={autoDeteccao}
              className={`w-full bg-slate-800/70 border border-blue-800/40 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-500 transition-all duration-200 hover:border-blue-700/60 cursor-pointer appearance-none bg-right bg-no-repeat backdrop-blur-sm ${
                autoDeteccao ? 'opacity-50 cursor-not-allowed' : ''
              }`}
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

          {/* Subtipo CCEE - aparece apenas quando CCEE é selecionado */}
          {tipoArquivo === 'CCEE' && (
            <div className="animate-fade-in-down">
              <label className="block text-xs text-blue-300 mb-2 font-medium">
                Subtipo CCEE {autoDeteccao && <span className="text-slate-500 font-normal">(automático)</span>}
              </label>
              <select 
                value={cceeSubtipo}
                onChange={(e) => setCceeSubtipo(e.target.value)}
                disabled={autoDeteccao}
                className={`w-full bg-slate-800/70 border border-blue-800/40 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-500 transition-all duration-200 hover:border-blue-700/60 cursor-pointer appearance-none bg-right bg-no-repeat backdrop-blur-sm ${
                  autoDeteccao ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2360a5fa' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundSize: '1.5em 1.5em',
                  paddingRight: '2.5rem'
                }}
              >
                <option value="">Selecione o subtipo...</option>
                {cceeSubtipos.map(subtipo => (
                  <option key={subtipo.value} value={subtipo.value} className="py-2">
                    {subtipo.label}
                  </option>
                ))}
              </select>
              {!cceeSubtipo && (
                <p className="text-xs text-amber-400 mt-1">* Subtipo obrigatório para CCEE</p>
              )}
            </div>
          )}

          {/* Campo de Mês/Ano condicional */}
          {tipoArquivo && (
            <div className="animate-fade-in-down">
              {(() => {
                const tipoSelecionado = tiposArquivo.find(t => t.value === tipoArquivo);
                const isRequired = tipoSelecionado?.requireDate || false;
                
                // Para tipos obrigatórios, sempre mostra o campo
                if (isRequired) {
                  return (
                    <>
                      <label className="block text-xs text-blue-300 mb-2 font-medium">
                        Mês/Ano {autoDeteccao && <span className="text-slate-500 font-normal">(automático)</span>}
                      </label>
                      <input
                        type="month"
                        value={mesAno}
                        onChange={(e) => setMesAno(e.target.value)}
                        disabled={autoDeteccao}
                        className={`w-full bg-slate-800/70 border border-blue-800/40 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-500 transition-all duration-200 hover:border-blue-700/60 backdrop-blur-sm ${
                          autoDeteccao ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      />
                      {!mesAno && (
                        <p className="text-xs text-amber-400 mt-1">* Campo obrigatório</p>
                      )}
                    </>
                  );
                }
                
                // Para tipos opcionais, mostra botão ou campo conforme estado
                return (
                  <>
                    {!mostrarDataOpcional ? (
                      <button
                        type="button"
                        onClick={() => setMostrarDataOpcional(true)}
                        className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors duration-200 border border-blue-800/40 rounded px-3 py-2 hover:border-blue-600/60 hover:bg-blue-900/20"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Adicionar Data
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs text-blue-300 font-medium">
                            Mês/Ano (Opcional)
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setMostrarDataOpcional(false);
                              setMesAno('');
                            }}
                            className="text-xs text-red-400 hover:text-red-300 transition-colors duration-200"
                          >
                            Remover
                          </button>
                        </div>
                        <input
                          type="month"
                          value={mesAno}
                          onChange={(e) => setMesAno(e.target.value)}
                          className="w-full bg-slate-800/70 border border-blue-800/40 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-500 transition-all duration-200 hover:border-blue-700/60 backdrop-blur-sm"
                          placeholder="Opcional"
                        />
                      </div>
                    )}
                  </>
                );
              })()}
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
            accept=".pdf,.xlsx,.xlsm,.csv,.docx,.xml"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-blue-700/90 hover:bg-blue-700 px-3 py-1 rounded text-sm transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-blue-700/25 border border-blue-600/50"
          >
            Selecionar Arquivos
          </button>
          <p className="text-xs text-blue-400 mt-3">PDF, XLSX, XLSM, CSV, DOCX</p>
        </div>
        </div>

        {/* Lista de arquivos selecionados - fora da área de scroll */}
        {selectedFiles.length > 0 && (
          <div className="mt-4 space-y-2 animate-fade-in-down flex-shrink-0">
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
            
            {/* Análise Automática */}
            {tipoArquivo === 'AUTO' && arquivosAnalisados.length > 0 && (
              <div className="mt-3 p-3 bg-blue-900/20 border border-blue-800/40 rounded animate-fade-in-down">
                <h4 className="text-xs font-medium text-blue-300 mb-2 flex items-center gap-1">
                  <span>🤖</span> Análise Automática
                </h4>
                <div className="space-y-2 text-xs">
                  {arquivosAnalisados.map((analise, index) => (
                    <div key={index} className="bg-slate-800/30 p-2 rounded border border-blue-800/20">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-blue-200 truncate flex-1">
                          {analise.file.name}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          analise.confianca >= 90 ? 'bg-green-900/50 text-green-300' :
                          analise.confianca >= 70 ? 'bg-yellow-900/50 text-yellow-300' :
                          'bg-red-900/50 text-red-300'
                        }`}>
                          {analise.confianca}%
                        </span>
                      </div>
                      <div className="text-blue-300">
                        <span className="font-medium">
                          {analise.tipoDetectado || 'Não identificado'}
                        </span> - {analise.dataDetectada || 'Data não detectada'}
                      </div>
                      <div className="text-slate-400 text-xs mt-1">
                        {analise.motivo}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Área de ação fixa - fora da área de scroll */}
        {selectedFiles.length > 0 && (
          <div className="flex-shrink-0 pt-4 border-t border-blue-800/30">
            <button
              onClick={handleUpload}
              disabled={!selectedUnidade || (!autoDeteccao && !tipoArquivo) || selectedFiles.length === 0 || uploading}
              className="w-full bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 rounded text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-700/30 border border-blue-600/30"
            >
              {uploading ? 'Processando...' : `Visualizar Upload (${selectedFiles.length} arquivo${selectedFiles.length !== 1 ? 's' : ''})`}
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className={`flex-1 ${windowSize === 'small' ? 'p-2' : 'p-4'} h-full overflow-y-auto`}>
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
              title="Sincroniza banco com pastas locais - cria pastas faltantes"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin text-blue-400" /> : <RefreshCw className="w-4 h-4 transition-transform duration-300 hover:rotate-180 text-blue-400" />}
              Sincronizar
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
          <div className={`mb-4 flex items-start gap-2 ${error.startsWith('✅') ? 'text-green-400 bg-green-950/30 border-green-800' : 'text-red-400 bg-red-950/30 border-red-800'} border rounded p-3 text-sm animate-fade-in-down`}>
            <AlertCircle className="w-4 h-4 mt-0.5" />
            <span>{error.replace('✅ ', '')}</span>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative mb-3">
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
                <th className="text-left px-6 py-3 font-semibold text-blue-300 w-24">
                  <button onClick={() => toggleSort('id')} className="inline-flex items-center gap-1 hover:text-white transition-colors">
                    ID
                    {sortBy !== 'id' ? (
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    ) : sortDir === 'asc' ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                </th>
                <th className="text-left px-6 py-3 font-semibold text-blue-300">
                  <button onClick={() => toggleSort('nome')} className="inline-flex items-center gap-1 hover:text-white transition-colors">
                    Nome
                    {sortBy !== 'nome' ? (
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    ) : sortDir === 'asc' ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                </th>
                <th className="text-right px-6 py-3 font-semibold text-blue-300 w-20">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {sortedEmpresas.map((empresa) => {
                const isExpanded = expandedEmpresas.has(empresa.id);
                return (
                  <React.Fragment key={empresa.id}>
                    <tr 
                      className={`border-b border-blue-800/30 hover:bg-blue-800/15 transition-all duration-200 cursor-pointer ${
                        isExpanded ? 'bg-blue-800/10' : ''
                      }`}
                    >
                      <td 
                        className={`${windowSize === 'small' ? 'px-3 py-2' : 'px-6 py-3'} text-blue-200 font-mono tracking-wider`}
                        onClick={() => toggleEmpresaExpansion(empresa.id)}
                      >
                        {empresa.id_empresa}
                      </td>
                      <td 
                        className={`${windowSize === 'small' ? 'px-3 py-2' : 'px-6 py-3'} text-white`}
                        onClick={() => toggleEmpresaExpansion(empresa.id)}
                      >
                        {empresa.nome}
                        {isExpanded && (
                          <span className="ml-2 text-xs text-blue-400 animate-fade-in">(expandido)</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEmpresaToCreateUnidade({ id: empresa.id, nome: empresa.nome });
                              setShowCreateUnidadeModal(true);
                            }}
                            className="p-1.5 text-green-400 hover:text-green-300 hover:bg-green-950/30 rounded transition-all duration-200 hover:scale-110"
                            title="Criar nova unidade"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDeleteModal(empresa);
                            }}
                            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded transition-all duration-200 hover:scale-110"
                            title="Excluir empresa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Unidades expandidas com animação */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={3} className="p-0 bg-slate-900/50">
                          <div className="animate-slide-down">
                            {/* Linha conectora visual */}
                            <div className="px-6 py-1">
                              <div className="border-l-2 border-blue-600/50 ml-4 h-2"></div>
                            </div>
                            
                            {/* Renderização dinâmica das unidades */}
                            {unidadesPorEmpresa[empresa.id]?.map((unidade) => (
                              <div 
                                key={unidade.id}
                                className={`px-6 py-3 hover:bg-blue-800/15 transition-colors cursor-pointer border-b border-blue-800/30 ${
                                  selectedUnidade === String(unidade.id) && selectedEmpresa === String(empresa.id)
                                    ? 'bg-blue-700/10 border-blue-600/40' 
                                    : ''
                                }`}
                                onClick={(e) => e.stopPropagation()}
                                onDoubleClick={() => handleUnidadeDoubleClick(empresa.id, unidade.id, empresa.nome, unidade.nome)}
                                title="Duplo clique para selecionar"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    <div className="flex items-center text-blue-400 font-mono text-xs">
                                      <div className="w-4 border-b border-l-2 border-blue-600/50 h-4 mr-2 ml-4"></div>
                                      {unidade.id_unidade}
                                    </div>
                                    <div className="text-blue-200">
                                      <MapPin className="w-3 h-3 inline mr-2 text-blue-400" />
                                      {unidade.nome}
                                      {unidade.id_unidade === "001" && (
                                        <span className="ml-2 text-xs bg-blue-700/30 text-blue-300 px-2 py-0.5 rounded border border-blue-600/50">
                                          Matriz
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {selectedUnidade === unidade.id_unidade && selectedEmpresa === String(empresa.id) && (
                                      <span className="text-xs bg-blue-700/25 text-blue-300 px-2 py-1 rounded animate-pulse border border-blue-600/50">
                                        Selecionada
                                      </span>
                                    )}
                                    {unidade.id_unidade === "001" ? (
                                      <div className="p-1 text-gray-500 cursor-not-allowed" title="Matriz não pode ser excluída">
                                        <Trash2 className="w-3 h-3 opacity-30" />
                                      </div>
                                    ) : (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenDeleteUnidadeModal(unidade.id, unidade.nome, empresa.nome, empresa.id);
                                        }}
                                        className="p-1 text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded transition-all duration-200 hover:scale-110"
                                        title="Excluir unidade"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                            
                            {/* Loading das unidades */}
                            {!unidadesPorEmpresa[empresa.id] && (
                              <div className="px-6 py-3 text-blue-400 text-sm">
                                <div className="flex items-center gap-2">
                                  <div className="w-4 border-b border-l-2 border-blue-600/50 h-4 mr-2 ml-4"></div>
                                  Carregando unidades...
                                </div>
                              </div>
                            )}
                            
                            {/* Nenhuma unidade encontrada */}
                            {unidadesPorEmpresa[empresa.id]?.length === 0 && (
                              <div className="px-6 py-3 text-blue-400 text-sm">
                                <div className="flex items-center gap-2">
                                  <div className="w-4 border-b border-l-2 border-blue-600/50 h-4 mr-2 ml-4"></div>
                                  Nenhuma unidade encontrada
                                </div>
                              </div>
                            )}
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

      {/* Modal de Exclusão */}
      {showDeleteModal && empresaToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-slate-900/95 border border-red-800/40 rounded-lg p-6 max-w-md w-full mx-4 animate-slide-up shadow-2xl">
            <h2 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Confirmar Exclusão
            </h2>
            
            <div className="space-y-4">
              <p className="text-blue-200">
                Você está prestes a excluir a empresa <strong className="text-white">{empresaToDelete.nome}</strong>.
              </p>
              
              <div className="bg-red-950/30 border border-red-800/40 rounded p-3 text-sm">
                <p className="text-red-300 font-medium mb-2">⚠️ Atenção:</p>
                <ul className="text-red-200 space-y-1 text-xs list-disc list-inside">
                  <li>Todas as unidades serão excluídas</li>
                  <li>Todos os documentos serão removidos</li>
                  <li>A pasta será movida para backup</li>
                  <li>Esta ação não pode ser desfeita</li>
                </ul>
              </div>
              
              <div>
                <label className="block text-sm text-blue-300 mb-2">
                  Digite <strong className="text-white">{empresaToDelete.nome}</strong> para confirmar:
                </label>
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  className="w-full bg-slate-800/70 border border-red-800/40 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-500"
                  placeholder="Digite o nome da empresa"
                  autoFocus
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setEmpresaToDelete(null);
                  setDeleteConfirmation('');
                }}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-slate-800/70 hover:bg-slate-800/90 rounded transition-all duration-200 hover:scale-105 active:scale-95 border border-blue-800/40"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting || deleteConfirmation !== empresaToDelete.nome}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Excluir Empresa
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Exclusão de Unidade */}
      {showDeleteUnidadeModal && unidadeToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-slate-900/95 border border-red-800/40 rounded-lg p-6 max-w-md w-full mx-4 animate-slide-up shadow-2xl">
            <h2 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Confirmar Exclusão de Unidade
            </h2>
            
            <div className="space-y-4">
              <p className="text-blue-200">
                Você está prestes a excluir a unidade <strong>{unidadeToDelete.nome}</strong> da empresa <strong>{unidadeToDelete.empresa_nome}</strong>.
              </p>
              
              <div className="bg-red-950/30 border border-red-800/40 rounded p-3 text-sm">
                <p className="text-red-300 font-medium">⚠️ Atenção:</p>
                <p className="text-red-200">Esta ação irá excluir permanentemente a unidade e todos os itens associados a ela. A pasta será movida para backup.</p>
              </div>
              
              <div>
                <label className="block text-sm mb-2 text-red-200">Digite o nome da unidade para confirmar:</label>
                <input
                  type="text"
                  value={deleteUnidadeConfirmation}
                  onChange={(e) => setDeleteUnidadeConfirmation(e.target.value)}
                  className="w-full bg-slate-800/70 border border-red-800/40 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-500"
                  placeholder="Digite o nome da unidade"
                  autoFocus
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowDeleteUnidadeModal(false);
                  setUnidadeToDelete(null);
                  setDeleteUnidadeConfirmation('');
                }}
                disabled={deletingUnidade}
                className="flex-1 px-4 py-2 bg-slate-800/70 hover:bg-slate-800/90 rounded transition-all duration-200 hover:scale-105 active:scale-95 border border-blue-800/40"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDeleteUnidade}
                disabled={deletingUnidade || deleteUnidadeConfirmation !== unidadeToDelete.nome}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
              >
                {deletingUnidade ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Excluir Unidade
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criação de Unidade */}
      {showCreateUnidadeModal && empresaToCreateUnidade && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-slate-900/95 border border-green-800/40 rounded-lg p-6 max-w-md w-full mx-4 animate-slide-up shadow-2xl">
            <h2 className="text-xl font-bold text-green-400 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Criar Nova Unidade
            </h2>
            
            <div className="space-y-4">
              <p className="text-blue-200">
                Criando nova unidade para a empresa <strong className="text-white">{empresaToCreateUnidade.nome}</strong>.
              </p>
              
              <div>
                <label className="block text-sm font-medium text-blue-300 mb-2">
                  Nome da Unidade:
                </label>
                <input
                  type="text"
                  value={newUnidadeNome}
                  onChange={(e) => setNewUnidadeNome(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Ex: Filial São Paulo"
                  disabled={creatingUnidade}
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowCreateUnidadeModal(false);
                    setEmpresaToCreateUnidade(null);
                    setNewUnidadeNome('');
                  }}
                  disabled={creatingUnidade}
                  className="flex-1 px-4 py-2 bg-slate-700 text-slate-300 rounded-md hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateUnidade}
                  disabled={creatingUnidade || !newUnidadeNome.trim()}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {creatingUnidade ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Criar Unidade
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Preview do Upload */}
      {showUploadPreview && uploadPreview && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-slate-900/95 border border-blue-800/40 rounded-lg p-6 max-w-4xl w-full mx-4 animate-slide-up shadow-2xl max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Preview do Upload
            </h2>
            
            <div className="space-y-4">
              <div className="bg-blue-900/20 rounded p-3 border border-blue-700/30">
                <p className="text-blue-200"><strong>Destino:</strong> {uploadPreview.empresa_info} → {uploadPreview.unidade_info}</p>
                <p className="text-blue-200"><strong>Arquivos:</strong> {uploadPreview.total_arquivos} total, {uploadPreview.validos} válidos</p>
              </div>
              
            <div className="space-y-2 max-h-96 overflow-y-auto">
                {uploadPreview.preview.map((item: any, index: number) => (
                  <div 
                    key={index} 
                    className={`p-3 rounded border ${
                      item.valido 
                        ? 'bg-green-900/20 border-green-700/30' 
                        : 'bg-red-900/20 border-red-700/30'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-mono text-sm text-blue-200">
                          <span className="text-gray-400">Arquivo:</span> {item.arquivo_original}
                        </p>
                        {item.valido ? (
                          <>
                            <p className="font-mono text-sm text-green-400">
                              <span className="text-gray-400">Novo nome:</span> {item.novo_nome}
                            </p>
                            <p className="text-xs text-gray-400">
                              <span>Pasta:</span> {item.pasta_destino}
                              {item.exists && (
                                <span className="ml-2 text-amber-400">• já existe</span>
                              )}
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-red-400">
                            <span className="text-gray-400">Erro:</span> {item.erro}
                          </p>
                        )}
                      </div>
                      <div className={`w-4 h-4 rounded-full ${item.valido ? (item.exists ? 'bg-amber-500' : 'bg-green-500') : 'bg-red-500'}`} />
                    </div>
                  </div>
                ))}
            </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowUploadPreview(false);
                  setUploadPreview(null);
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-white transition-all duration-200"
              >
                Cancelar
              </button>
              
              {(() => {
                const conflicts = (uploadPreview?.preview || []).filter((p: any) => p.valido && p.exists);
                if (conflicts.length === 0) {
                  return (
                    <button
                      onClick={() => executarUpload()}
                      disabled={uploadPreview.validos === 0 || uploading}
                      className="flex-1 bg-green-700 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded text-white transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      {uploading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Confirmar Upload ({uploadPreview.validos} arquivo{uploadPreview.validos !== 1 ? 's' : ''})
                        </>
                      )}
                    </button>
                  );
                }
                return (
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <button
                      onClick={() => executarUpload('overwrite')}
                      disabled={uploading}
                      className="px-3 py-2 rounded text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                      title="Substitui os arquivos existentes"
                    >
                      Sobrescrever ({conflicts.length})
                    </button>
                    <button
                      onClick={() => executarUpload('version')}
                      disabled={uploading}
                      className="px-3 py-2 rounded text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                      title="Salva como nova versão (v2, v3, ...)"
                    >
                      Salvar como v2
                    </button>
                    <button
                      onClick={() => executarUpload('skip')}
                      disabled={uploading}
                      className="px-3 py-2 rounded text-white bg-gray-600 hover:bg-gray-700 disabled:opacity-50"
                      title="Ignora apenas os arquivos em conflito"
                    >
                      Pular Conflitos
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default EmpresasPage;
