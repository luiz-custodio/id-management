import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Search, MapPin, Plus, RefreshCw, Loader2, AlertCircle, X, Upload, FileText, Trash2, ArrowUpDown, ChevronUp, ChevronDown, Edit2 } from 'lucide-react';
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
  // Mês/Ano com persistência na sessão (até reabrir o app)
  const [mesAno, setMesAnoState] = useState<string>(() => {
    try {
      return sessionStorage.getItem('idms.mesAno') || '';
    } catch {
      return '';
    }
  });
  const setMesAno = (value: string) => {
    setMesAnoState(value);
    try {
      if (value) {
        sessionStorage.setItem('idms.mesAno', value);
      } else {
        sessionStorage.removeItem('idms.mesAno');
      }
    } catch {
      // Ignora erros de acesso ao sessionStorage
    }
  };
  const [descricao, setDescricao] = useState<string>('');
  const [mostrarDataOpcional, setMostrarDataOpcional] = useState<boolean>(false);
  // Nova: Data automática (baseada nos arquivos selecionados)
  const [autoData, setAutoData] = useState<boolean>(false);
  const [autoDataMode, setAutoDataMode] = useState<'mod' | 'mod-1' | 'folder'>('mod');
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
  // UI compacto: controlar exibição da lista detalhada de arquivos
  const [mostrarListaArquivos, setMostrarListaArquivos] = useState(false);
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

  // Função para obter mês/ano ANTERIOR no formato YYYY-MM
  const getCurrentMonth = () => {
    const now = new Date();
    // Subtrai 1 mês da data atual
    now.setMonth(now.getMonth() - 1);
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  // Tipos de arquivo disponíveis - data obrigatória exceto Estudo e todos os DOC-*
  const tiposArquivo = [
    { value: 'FAT', label: 'Fatura', requireDate: true },
    { value: 'NE-CP', label: 'Nota de Energia - CP', requireDate: true },
    { value: 'NE-LP', label: 'Nota de Energia - LP', requireDate: true },
    { value: 'NE-CPC', label: 'Nota de Energia - CPC', requireDate: true },
    { value: 'NE-LPC', label: 'Nota de Energia - LPC', requireDate: true },
    { value: 'NE-VE', label: 'Nota de Energia - Venda', requireDate: true },
    { value: 'REL', label: 'Relatório', requireDate: true },
    { value: 'RES', label: 'Resumo', requireDate: true },
    { value: 'EST', label: 'Estudo', requireDate: false },
    // ICMS (novos)
    { value: 'ICMS-DEVEC', label: 'ICMS - DEVEC', requireDate: true },
    { value: 'ICMS-LDO', label: 'ICMS - LDO', requireDate: true },
    { value: 'ICMS-REC', label: 'ICMS - REC', requireDate: true },
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
    { value: 'LFRCAP001', label: 'LFRCAP001' },
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

  // Helper: computa AAAA-MM a partir dos arquivos selecionados
  const computeAutoMesAnoFromFiles = (files: File[], mode: 'mod'|'mod-1'|'folder'): string => {
    try {
      if (!files || files.length === 0) return '';
      if (mode === 'folder') {
        const folderPattern = /^\s*(\d{4})\s*[-_\s]?\s*(\d{2})\s*$/;
        const extractFromPath = (file: File): string => {
          const anyFile: any = file as any;
          const pRaw: string = (anyFile.webkitRelativePath || anyFile.path || '').toString();
          if (!pRaw) return '';
          const p = pRaw.replace(/\\/g, '/');
          const segs = p.split('/').filter(Boolean);
          for (let i = segs.length - 2; i >= 0; i--) {
            const seg = segs[i];
            const m = seg.match(folderPattern);
            if (m) return `${m[1]}-${m[2]}`;
          }
          return '';
        };
        const values = new Set<string>();
        for (const f of files) {
          const v = extractFromPath(f);
          if (v) values.add(v);
        }
        return values.size === 1 ? Array.from(values)[0] : '';
      } else {
        // Usa o arquivo mais recente (modificação mais nova) do lote
        let latest = files[0].lastModified || Date.now();
        for (const f of files) {
          if ((f.lastModified || 0) > latest) latest = f.lastModified;
        }
        const d = new Date(latest);
        if (mode === 'mod-1') d.setMonth(d.getMonth() - 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        return `${y}-${m}`;
      }
    } catch {
      return '';
    }
  };

  // Data por arquivo, conforme modo
  const computeMesAnoForFile = (file: File, mode: 'mod'|'mod-1'|'folder'): string => {
    try {
      if (mode === 'folder') {
        const anyFile: any = file as any;
        const pRaw: string = (anyFile.webkitRelativePath || anyFile.path || '').toString();
        if (pRaw) {
          const p = pRaw.replace(/\\/g, '/');
          const segs = p.split('/').filter(Boolean);
          const folderPattern = /^\s*(\d{4})\s*[-_\s]?\s*(\d{2})\s*$/;
          for (let i = segs.length - 2; i >= 0; i--) {
            const seg = segs[i];
            const m = seg.match(folderPattern);
            if (m) return `${m[1]}-${m[2]}`;
          }
        }
        return '';
      }
      const d = new Date(file.lastModified || Date.now());
      if (mode === 'mod-1') d.setMonth(d.getMonth() - 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      return `${y}-${m}`;
    } catch {
      return '';
    }
  };

  // Mantém mesAno sincronizado quando data automática está habilitada
  useEffect(() => {
    if (autoData) {
      const computed = computeAutoMesAnoFromFiles(selectedFiles, autoDataMode);
      setMesAno(computed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoData, autoDataMode, selectedFiles]);

  // Quando autoData estiver habilitada para tipos que NÃO exigem data,
  // garante que o campo opcional apareça e seja preenchido automaticamente
  useEffect(() => {
    const tipoSelecionado = tiposArquivo.find(t => t.value === tipoArquivo);
    if (!tipoSelecionado) return;
    if (!tipoSelecionado.requireDate && autoData) {
      setMostrarDataOpcional(true);
      const computed = computeAutoMesAnoFromFiles(selectedFiles, autoDataMode);
      if (computed) setMesAno(computed);
    }
  }, [autoData, autoDataMode, selectedFiles, tipoArquivo]);

  // Handler para mudança de tipo de arquivo
  const handleTipoArquivoChange = (valor: string) => {
    setTipoArquivo(valor);
    setCceeSubtipo(''); // Limpa subtipo CCEE quando muda tipo
    setMostrarDataOpcional(false); // Reset do campo opcional
    setArquivosAnalisados([]); // Reset da análise automática
    
    // Se o tipo requer data
    const tipoSelecionado = tiposArquivo.find(t => t.value === valor);
    if (tipoSelecionado?.requireDate) {
      if (autoData) {
        const computed = computeAutoMesAnoFromFiles(selectedFiles, autoDataMode);
        setMesAno(computed);
      } else if (!mesAno) {
        // Default manual: mês anterior
        setMesAno(getCurrentMonth());
      }
    }
    // Se o tipo não requer data, mantemos o valor atual para persistir a preferência
  };

  // Função para lidar com mudança do checkbox de auto-detecção
  const handleAutoDeteccaoChange = (ativado: boolean) => {
    setAutoDeteccao(ativado);
    
    if (ativado) {
        // Se ativou auto-detecção, limpa tipo manual e analisa arquivos
        setTipoArquivo('');
        setCceeSubtipo('');
        setMostrarDataOpcional(false);
        setAutoData(false); // Data automática não se aplica no modo de detecção automática
      
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
    const tokens = (nomeNorm.match(/[a-z0-9]+/g) || []);
    const tset = new Set(tokens);
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
    
    // REGRA 2: Notas de Energia - tokens (evita falsos positivos)
    else if (tset.has('nota') || tset.has('cpc') || tset.has('lpc') || tset.has('cp') || tset.has('lp') || tset.has('venda') || tset.has('ve')) {
      if (tset.has('cpc')) {
        tipoDetectado = 'NE-CPC';
        motivo = 'Nota de Energia CPC: token "cpc"';
      } else if (tset.has('lpc')) {
        tipoDetectado = 'NE-LPC';
        motivo = 'Nota de Energia LPC: token "lpc"';
      } else if (tset.has('cp')) {
        tipoDetectado = 'NE-CP';
        motivo = 'Nota de Energia CP: token "cp"';
      } else if (tset.has('lp')) {
        tipoDetectado = 'NE-LP';
        motivo = 'Nota de Energia LP: token "lp"';
      } else if (tset.has('venda') || tset.has('ve')) {
        tipoDetectado = 'NE-VE';
        motivo = 'Nota de Energia Venda: token "venda/ve"';
      } else {
        tipoDetectado = 'NE-CP'; // padrão se apenas "nota"
        motivo = 'Nota de Energia: token "nota"';
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
    
    // NOVA REGRA: ICMS (DEVEC/LDO/REC) – contém 'devec', 'ldo' ou 'rec' no nome → usar mês anterior à modificação
    else if (nome.includes('devec') || nome.includes('ldo') || nome.includes('rec')) {
      const dataMod = new Date(file.lastModified);
      dataMod.setMonth(dataMod.getMonth() - 1);
      const ano = dataMod.getFullYear();
      const mes = String(dataMod.getMonth() + 1).padStart(2, '0');
      dataDetectada = `${ano}-${mes}`;
      confianca = 85;
      if (nome.includes('devec')) {
        tipoDetectado = 'ICMS-DEVEC';
        motivo = 'ICMS-DEVEC detectado no nome - usando mês anterior';
      } else {
        if (nome.includes('ldo')) {
          tipoDetectado = 'ICMS-LDO';
          motivo = 'ICMS-LDO detectado no nome - usando mês anterior';
        } else {
          tipoDetectado = 'ICMS-REC';
          motivo = 'ICMS-REC detectado no nome - usando mês anterior';
        }
      }
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

    // REGRA 4: Documentos/Minutas (data = modificação): Carta Denúncia, Contrato, Procuração, Aditivo (+ cadastro/comunicado/licença)
    else if (
      (tset.has('carta') && (tset.has('denuncia')))
      || tset.has('aditivo')
      || tset.has('contrato')
      || tset.has('procuracao') || nome.includes('procuração')
      || tset.has('cadastro')
      || tset.has('comunicado')
      || tset.has('licenca') || nome.includes('licença')
    ) {
      const dataMod = new Date(file.lastModified);
      const ano = dataMod.getFullYear();
      const mes = String(dataMod.getMonth() + 1).padStart(2, '0');
      // Para todos os DOC-* usamos apenas AAAA-MM
      dataDetectada = `${ano}-${mes}`;
      confianca = 90;

      const isMinuta = tset.has('minuta') || tset.has('minutas') || tset.has('min');
      const pref = isMinuta ? 'MIN' : 'DOC';

      if (tset.has('carta') && tset.has('denuncia')) {
        tipoDetectado = `${pref}-CAR`;
        motivo = `${isMinuta ? 'Minuta' : 'Documento'}: "Carta denúncia" - usando mês/ano da modificação`;
      } else if (tset.has('aditivo')) {
        tipoDetectado = `${pref}-ADT`;
        motivo = `${isMinuta ? 'Minuta' : 'Documento'}: "Aditivo" - usando mês/ano da modificação`;
      } else if (tset.has('contrato')) {
        tipoDetectado = `${pref}-CTR`;
        motivo = `${isMinuta ? 'Minuta' : 'Documento'}: "Contrato" - usando mês/ano da modificação`;
      } else if (tset.has('procuracao') || nome.includes('procuração')) {
        tipoDetectado = `${pref}-PRO`;
        motivo = `${isMinuta ? 'Minuta' : 'Documento'}: "Procuração" - usando mês/ano da modificação`;
      } else if (tset.has('cadastro')) {
        tipoDetectado = `${pref}-CAD`;
        motivo = `${isMinuta ? 'Minuta' : 'Documento'}: "Cadastro" - usando mês/ano da modificação`;
        confianca = 70;
      } else if (tset.has('comunicado')) {
        tipoDetectado = `${pref}-COM`;
        motivo = `${isMinuta ? 'Minuta' : 'Documento'}: "Comunicado" - usando mês/ano da modificação`;
        confianca = 70;
      } else if (tset.has('licenca') || nome.includes('licença')) {
        tipoDetectado = `${pref}-LIC`;
        motivo = `${isMinuta ? 'Minuta' : 'Documento'}: "Licença" - usando mês/ano da modificação`;
        confianca = 70;
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
        // Se não encontrou data no nome, usar mês anterior
        dataDetectada = getCurrentMonth();
        confianca = 70;
        motivo = 'Relatório detectado: nome contém "relatório" - usando mês anterior';
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

  // Renomear empresa
  const handleRenameEmpresa = async (empresa: Empresa) => {
    const atual = empresa.nome;
    const novo = window.prompt('Novo nome da empresa:', atual)?.trim();
    if (!novo || novo === atual) return;
    try {
      await api.renomearEmpresa(empresa.id, novo);
      await fetchEmpresas();
      if (expandedEmpresas.has(empresa.id)) {
        await loadUnidadesEmpresa(empresa.id);
      }
      // Se a empresa renomeada está selecionada, atualiza o nome exibido na sidebar
      if (selectedEmpresa === String(empresa.id)) {
        setSelectedEmpresaNome(novo);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao renomear empresa';
      alert(msg);
    }
  };

  // Renomear unidade
  const handleRenameUnidade = async (unidadeId: number, nomeAtual: string, empresaId: number) => {
    const novo = window.prompt('Novo nome da unidade:', nomeAtual)?.trim();
    if (!novo || novo === nomeAtual) return;
    try {
      await api.renomearUnidade(unidadeId, novo);
      await loadUnidadesEmpresa(empresaId);
      // Se a unidade renomeada está selecionada, atualiza o nome exibido na sidebar
      if (selectedEmpresa === String(empresaId) && selectedUnidade === String(unidadeId)) {
        setSelectedUnidadeNome(novo);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao renomear unidade';
      alert(msg);
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

  // Limpar todos os arquivos selecionados (e análises automáticas)
  const clearAllFiles = () => {
    setSelectedFiles([]);
    setArquivosAnalisados([]);
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
        if (tipoSelecionado?.requireDate) {
          if (autoData) {
            const computed = computeAutoMesAnoFromFiles(selectedFiles, autoDataMode);
            if (computed && computed !== mesAno) setMesAno(computed);
            // Não exigir mesAno quando data automática está ativa; datas serão por arquivo
          } else if (!mesAno) {
            setError('Data (Mês/Ano) é obrigatória para este tipo de arquivo');
            return;
          }
        }
        
        // Para CCEE, combina tipo e subtipo
        const tipoFinal = tipoArquivo === 'CCEE' ? `CCEE-${cceeSubtipo}` : tipoArquivo;
        
        // Modo manual normal
        if (autoData) {
          // Usar caminho AUTO com tipo fixo e data por arquivo
          const filesWithAnalysis = selectedFiles.map((file) => ({
            file,
            tipoDetectado: tipoFinal,
            dataDetectada: computeMesAnoForFile(file, autoDataMode) || computeMesAnoForFile(file, 'mod')
          }));
          // Validação: pelo menos uma data válida
          if (filesWithAnalysis.some(x => !x.dataDetectada)) {
            setError(autoDataMode === 'folder' ? 'Alguns arquivos não têm pasta no formato AAAA-MM. Ajuste a base ou a estrutura.' : 'Falha ao calcular data automática para alguns arquivos.');
            return;
          }
          preview = await api.previewUploadAuto(
            parseInt(selectedUnidade),
            filesWithAnalysis,
            descricao || null
          );
        } else {
          preview = await api.previewUpload(
            parseInt(selectedUnidade), 
            tipoFinal, 
            mesAno || null, 
            descricao || null, 
            fileList.files
          );
        }
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
        if (tipoSelecionado?.requireDate) {
          if (autoData) {
            const computed = computeAutoMesAnoFromFiles(selectedFiles, autoDataMode);
            if (computed && computed !== mesAno) setMesAno(computed);
            // Não exigir mesAno quando data automática está ativa; datas serão por arquivo
          } else if (!mesAno) {
            setError('Data (Mês/Ano) é obrigatória para este tipo de arquivo');
            return;
          }
        }
        
        // Para CCEE, combina tipo e subtipo
        const tipoFinal = tipoArquivo === 'CCEE' ? `CCEE-${cceeSubtipo}` : tipoArquivo;
        
        // Executa o upload manual normal
        const fileList = new DataTransfer();
        selectedFiles.forEach(file => fileList.items.add(file));
        
        if (autoData) {
          // Usar caminho AUTO com tipo fixo e data por arquivo
          const filesWithAnalysis = selectedFiles.map((file) => ({
            file,
            tipoDetectado: tipoFinal,
            dataDetectada: computeMesAnoForFile(file, autoDataMode) || computeMesAnoForFile(file, 'mod')
          }));
          if (filesWithAnalysis.some(x => !x.dataDetectada)) {
            setError(autoDataMode === 'folder' ? 'Alguns arquivos não têm pasta no formato AAAA-MM. Ajuste a base ou a estrutura.' : 'Falha ao calcular data automática para alguns arquivos.');
            return;
          }
          result = await api.executarUploadAuto(
            parseInt(selectedUnidade),
            filesWithAnalysis,
            descricao || null,
            conflictStrategy
          );
        } else {
          result = await api.executarUpload(
            parseInt(selectedUnidade), 
            tipoFinal, 
            mesAno || null, 
            descricao || null, 
            fileList.files,
            conflictStrategy
          );
        }
      }
      
      // Limpa formulário
      setSelectedFiles([]);
      setArquivosAnalisados([]);
      setTipoArquivo('');
      setCceeSubtipo('');
      // Não limpa o mês para manter a escolha durante a sessão
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
    <>
      <div className="h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-blue-900 text-white overflow-hidden flex flex-row layout-side-by-side">
        {/* Sidebar com upload - Sempre visível lado a lado */}
        <aside className="bg-gradient-to-b from-slate-900/95 to-blue-950/95 backdrop-blur-sm p-4 flex flex-col h-full border-r border-blue-800/30 sidebar-fixed">
        {/* Logo - Fixo no topo - Compacto */}
        <div className="flex-shrink-0 mb-3">
          {/* Logo BM Energia oficial - reduzido */}
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
        
        {/* Main scrollable content (compact) */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {/* Título compacto */}
          <h2 className="text-base font-medium text-blue-100 mb-2">Upload de Arquivos</h2>
            
          {/* Mostra a unidade selecionada se houver com animação - Compacta */}
          {selectedUnidade && (
            <div className="animate-fade-in-down bg-blue-800/10 border border-blue-700/30 rounded-md px-2 py-1.5 transition-all duration-300 hover:border-blue-600/50 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <MapPin className="w-3 h-3 text-blue-400 flex-shrink-0" />
                    <span className="text-xs font-medium text-blue-100 truncate">
                      {selectedEmpresaNome} • {selectedUnidadeNome}
                    </span>
                    <span className="text-[10px] text-blue-400 flex-shrink-0">#{selectedUnidade}</span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedEmpresa('');
                      setSelectedUnidade('');
                      setSelectedEmpresaNome('');
                      setSelectedUnidadeNome('');
                    }}
                    className="text-[11px] text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                    title="Limpar seleção"
                  >
                    <X className="w-3 h-3" />
                    Limpar
                  </button>
                </div>
              </div>
            )}

          {/* Checkbox de Auto-Detecção */}
          <div className="mb-2">
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
              <details className="mt-1 ml-5 text-xs text-slate-500">
                <summary className="cursor-pointer text-slate-400 hover:text-slate-300">Ver regras</summary>
                <div className="mt-1 opacity-75 leading-relaxed">
                  • <span className="text-blue-400">Faturas:</span> data no nome (YYYY-MM). Ex.: 2025-08.pdf/xlsx/xlsm<br/>
                  • <span className="text-green-400">Notas:</span> contém "nota", "CP" ou "LP" (data = modificação - 1 mês)<br/>
                  • <span className="text-amber-400">Estudos:</span> contém "estudo" (data = mês/ano da modificação)<br/>
                  • <span className="text-yellow-400">Relatórios:</span> contém "relatório" + mês abreviado, ex.: JUL-25<br/>
                  • <span className="text-cyan-400">Docs:</span> "Carta denúncia", "Contrato", "Procuração", "Aditivo" (data = mês/ano da modificação)
                </div>
              </details>
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
              {!autoDeteccao && (
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 text-xs text-blue-300">
                    <input
                      type="checkbox"
                      className="w-3 h-3 text-blue-500 bg-slate-700 border-slate-600 rounded focus:ring-blue-500 focus:ring-1"
                      checked={autoData}
                      onChange={(e) => setAutoData(e.target.checked)}
                    />
                    Data automatica
                  </label>
                  {autoData && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">Base:</span>
                      <select
                        value={autoDataMode}
                        onChange={(e) => setAutoDataMode((e.target.value as 'mod'|'mod-1'|'folder'))}
                        className="text-xs bg-slate-800/70 border border-blue-800/40 rounded px-2 py-1 text-blue-100 focus:outline-none focus:ring-1 focus:ring-blue-600"
                      >
                        <option value="mod">Modificacao</option>
                        <option value="mod-1">Modificacao - 1 mes</option>
                        <option value="folder">Pasta (AAAA-MM)</option>
                      </select>
                    </div>
                  )}
                </div>
              )}
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
                        disabled={autoDeteccao || autoData}
                        className={`w-full bg-slate-800/70 border border-blue-800/40 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-500 transition-all duration-200 hover:border-blue-700/60 backdrop-blur-sm ${
                          (autoDeteccao || autoData) ? 'opacity-50 cursor-not-allowed' : ''
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
                          disabled={autoData}
                          className={`w-full bg-slate-800/70 border border-blue-800/40 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-500 transition-all duration-200 hover:border-blue-700/60 backdrop-blur-sm ${autoData ? 'opacity-50 cursor-not-allowed' : ''}`}
                          placeholder="Opcional"
                        />
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* Descrição (compacta) */}
          <div>
            <label className="block text-xs text-blue-300 mb-1 font-medium">Descrição (Opcional)</label>
            <input
              type="text"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full bg-slate-800/70 border border-blue-800/40 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-500 transition-all duration-200 hover:border-blue-700/60 backdrop-blur-sm"
              placeholder="Adicione uma descrição..."
            />
          </div>
        </div>

        {/* Drag and drop area */}
        <div
          className={`border-2 border-dashed rounded-lg p-4 text-center transition-all duration-300 min-h-[120px] backdrop-blur-sm ${
            dragActive 
              ? 'border-blue-500 bg-blue-600/10 scale-[1.02] shadow-lg shadow-blue-500/25' 
              : 'border-blue-800/40 hover:border-blue-700/60 bg-slate-800/25'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="w-8 h-8 mx-auto mb-2 text-blue-400 transition-transform duration-300 hover:scale-110" />
          <p className="text-sm mb-1 text-blue-100">Arraste arquivos aqui</p>
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
          <p className="text-[11px] text-blue-400 mt-2">PDF, XLSX, XLSM, CSV, DOCX</p>
        </div>

        {/* Lista de arquivos selecionados - compacta e colapsável */}
        {selectedFiles.length > 0 && (
          <div className="mt-3 animate-fade-in-down flex-shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium text-blue-300">Arquivos ({selectedFiles.length})</h3>
              <div className="flex items-center gap-3">
                <button
                  className="text-[11px] text-blue-400 hover:text-blue-300"
                  onClick={() => setMostrarListaArquivos(v => !v)}
                >
                  {mostrarListaArquivos ? 'Ocultar detalhes' : 'Ver detalhes'}
                </button>
                <button
                  className="text-[11px] text-red-400 hover:text-red-300 disabled:opacity-40"
                  onClick={clearAllFiles}
                  disabled={selectedFiles.length === 0}
                  title="Remover todos os arquivos selecionados"
                >
                  Limpar tudo
                </button>
              </div>
            </div>
            {mostrarListaArquivos && (
              <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
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
            )}
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
        
        {/* Fixed action area */}
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
      </aside>

      <main className="p-4 h-full flex flex-col overflow-hidden flex-1 main-content-flex">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-blue-300 to-blue-200 bg-clip-text text-transparent">
              Empresas
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSync}
              disabled={loading}
              className="bg-slate-800/70 hover:bg-slate-800/90 disabled:opacity-50 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-sm transition-all duration-200 hover:scale-105 active:scale-95 border border-blue-800/40 hover:border-blue-700/60 backdrop-blur-sm"
              title="Sincroniza banco com pastas locais - cria pastas faltantes"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" /> : <RefreshCw className="w-3.5 h-3.5 transition-transform duration-300 hover:rotate-180 text-blue-400" />}
              <span className="hidden sm:inline">Sincronizar</span>
            </button>
            <button
              onClick={() => setShowForm(s => !s)}
              className="bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-blue-700/30 border border-blue-600/30 text-sm"
            >
              <Plus className={`w-4 h-4 transition-transform duration-300 ${showForm ? 'rotate-45' : ''}`} />
              <span className="hidden sm:inline">{showForm ? 'Cancelar' : 'Nova Empresa'}</span>
              <span className="sm:hidden">{showForm ? '✕' : '+'}</span>
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

        {/* Search Bar - Modernizado */}
        <div className="relative mb-4 group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-400 group-hover:text-blue-300 transition-colors duration-300" />
            <input
              type="text"
              placeholder="Pesquisar empresas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900/80 border border-blue-400/30 rounded-xl pl-12 pr-4 py-4 text-white placeholder-blue-400/70 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/60 transition-all duration-300 hover:border-blue-400/50 backdrop-blur-md shadow-lg hover:shadow-blue-900/20"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-blue-400 hover:text-blue-300 transition-colors duration-200"
                title="Limpar busca"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Container da tabela com scroll próprio - Responsivo */}
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Table - Design Ultra Moderno com scroll limitado */}
          <div className="bg-slate-900/80 rounded-2xl overflow-hidden border border-blue-400/20 backdrop-blur-xl shadow-2xl shadow-blue-900/20 hover:shadow-blue-900/30 transition-all duration-300 relative flex-1 flex flex-col">
            {/* Linha de destaque superior animada */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400/60 to-transparent animate-pulse"></div>
            
            <div className="flex flex-col h-full">
              {/* Header fixo */}
              <div className="flex-shrink-0">
                <table className="w-full relative">
                  <thead>
                    <tr className="border-b border-blue-400/30 text-sm bg-slate-900/80 backdrop-blur-sm relative">
                      {/* Fundo com padrão sutil */}
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.03),transparent_50%)]"></div>
                      
                      <th className="text-left px-6 py-4 font-semibold text-blue-300 w-20 relative">
                        <button onClick={() => toggleSort('id')} className="inline-flex items-center gap-1.5 hover:text-blue-200 transition-all duration-300 hover:scale-105 group">
                          <span className="relative">
                            ID
                            <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 group-hover:w-full transition-all duration-300"></div>
                          </span>
                          {sortBy !== 'id' ? (
                            <ArrowUpDown className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                          ) : sortDir === 'asc' ? (
                            <ChevronUp className="w-3.5 h-3.5 text-blue-400" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-blue-400" />
                    )}
                  </button>
                </th>
                <th className="text-left px-6 py-5 font-semibold text-blue-300 min-w-0 relative">
                  <button onClick={() => toggleSort('nome')} className="inline-flex items-center gap-1.5 hover:text-blue-200 transition-all duration-300 hover:scale-105 group">
                    <span className="relative">
                      Nome da Empresa
                      <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 group-hover:w-full transition-all duration-300"></div>
                    </span>
                    {sortBy !== 'nome' ? (
                      <ArrowUpDown className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                    ) : sortDir === 'asc' ? (
                      <ChevronUp className="w-3.5 h-3.5 text-blue-400" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-blue-400" />
                    )}
                  </button>
                </th>
                <th className="text-right px-6 py-5 font-semibold text-blue-300 w-28 relative">
                  <span className="relative">
                    Ações
                    <div className="absolute -bottom-1 right-0 w-8 h-0.5 bg-gradient-to-l from-blue-400 to-transparent opacity-30"></div>
                  </span>
                      </th>
                    </tr>
                  </thead>
                </table>
              </div>
              
              {/* Body com scroll */}
              <div className="flex-1 overflow-y-auto min-h-0">
                <table className="w-full">
                  <tbody className="text-sm">
              {sortedEmpresas.map((empresa) => {
                const isExpanded = expandedEmpresas.has(empresa.id);
                return (
                  <React.Fragment key={empresa.id}>
                    <tr 
                      className={`border-b border-blue-400/15 hover:bg-gradient-to-r hover:from-blue-800/25 hover:to-blue-700/15 transition-all duration-500 cursor-pointer backdrop-blur-sm group relative overflow-hidden ${
                        isExpanded ? 'bg-gradient-to-r from-blue-700/20 to-blue-600/15 shadow-lg shadow-blue-900/15 ring-1 ring-blue-500/20' : ''
                      }`}
                    >
                      {/* Efeito shimmer sutil */}
                      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent skew-x-12"></div>
                      
                      {/* Linha de destaque lateral */}
                      <div className="absolute left-0 top-0 bottom-0 w-0 bg-gradient-to-b from-blue-400 via-purple-400 to-blue-500 group-hover:w-1 transition-all duration-300 rounded-r-full"></div>
                      
                      {/* Glow effect sutil */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-blue-500/[0.02] via-transparent to-purple-500/[0.02]"></div>
                      
                      <td 
                        onClick={() => toggleEmpresaExpansion(empresa.id)}
                        className="px-6 py-5 text-blue-300 font-mono tracking-wider font-semibold group-hover:text-blue-200 transition-all duration-300 text-center w-20 relative cursor-pointer"
                      >
                        <div className="relative inline-flex items-center justify-center">
                          <div className="absolute inset-0 rounded-lg bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100"></div>
                          <span className="relative z-10 px-2 py-1 rounded-md bg-slate-800/50 group-hover:bg-blue-900/30 transition-all duration-300">
                            {empresa.id_empresa}
                          </span>
                        </div>
                      </td>
                      <td 
                        onClick={() => toggleEmpresaExpansion(empresa.id)}
                        className="px-6 py-5 text-white font-medium group-hover:text-blue-100 transition-all duration-300 max-w-0 w-full relative cursor-pointer"
                      >
                        <div className="flex items-center justify-between min-w-0">
                          <div className="relative flex-1 min-w-0">
                            <span className="block truncate pr-2 text-base font-semibold relative z-10" title={empresa.nome}>
                              {empresa.nome}
                            </span>
                            {/* Underline animado */}
                            <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 group-hover:w-full transition-all duration-500 delay-100"></div>
                          </div>
                          {isExpanded && (
                            <div className="flex-shrink-0 relative">
                              <span className="inline-flex items-center text-xs text-blue-400 animate-fade-in bg-gradient-to-r from-blue-800/30 to-blue-700/20 px-3 py-1 rounded-full whitespace-nowrap border border-blue-500/20 shadow-sm">
                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2 animate-pulse"></div>
                                Expandido
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-5 text-right w-28 relative">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botão Renomear */}
                          <div className="relative group/btn">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRenameEmpresa(empresa);
                              }}
                              className="relative p-2 text-yellow-400 hover:text-yellow-300 rounded-xl transition-all duration-300 hover:scale-110 backdrop-blur-sm overflow-hidden group"
                              title="Renomear empresa"
                            >
                              {/* Background animado */}
                              <div className="absolute inset-0 bg-gradient-to-r from-yellow-900/20 to-yellow-800/10 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-xl"></div>
                              {/* Glow effect */}
                              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500 blur-sm bg-yellow-400/20 rounded-xl scale-150"></div>
                              {/* Ícone */}
                              <Edit2 className="w-4 h-4 relative z-10 transition-transform duration-300 group-hover:rotate-12" />
                            </button>
                          </div>

                          {/* Botão Adicionar */}
                          <div className="relative group/btn">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEmpresaToCreateUnidade({ id: empresa.id, nome: empresa.nome });
                                setShowCreateUnidadeModal(true);
                              }}
                              className="relative p-2 text-green-400 hover:text-green-300 rounded-xl transition-all duration-300 hover:scale-110 backdrop-blur-sm overflow-hidden group"
                              title="Criar nova unidade"
                            >
                              {/* Background animado */}
                              <div className="absolute inset-0 bg-gradient-to-r from-green-900/20 to-green-800/10 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-xl"></div>
                              {/* Glow effect */}
                              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500 blur-sm bg-green-400/20 rounded-xl scale-150"></div>
                              {/* Ícone */}
                              <Plus className="w-4 h-4 relative z-10 transition-transform duration-300 group-hover:rotate-90" />
                            </button>
                          </div>

                          {/* Botão Excluir */}
                          <div className="relative group/btn">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDeleteModal(empresa);
                              }}
                              className="relative p-2 text-red-400 hover:text-red-300 rounded-xl transition-all duration-300 hover:scale-110 backdrop-blur-sm overflow-hidden group"
                              title="Excluir empresa"
                            >
                              {/* Background animado */}
                              <div className="absolute inset-0 bg-gradient-to-r from-red-900/20 to-red-800/10 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-xl"></div>
                              {/* Glow effect */}
                              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500 blur-sm bg-red-400/20 rounded-xl scale-150"></div>
                              {/* Ícone */}
                              <Trash2 className="w-4 h-4 relative z-10 transition-transform duration-300 group-hover:scale-110" />
                            </button>
                          </div>
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
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRenameUnidade(unidade.id, unidade.nome, empresa.id);
                                      }}
                                      className="p-1 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/30 rounded transition-all duration-200 hover:scale-110"
                                      title="Renomear unidade"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
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
              </div>
            </div>
            
            {/* Loading e estados vazios fora da área de scroll */}
            {loading && (
              <div className="flex items-center gap-2 px-6 py-4 text-blue-300 text-sm border-t border-blue-400/20">
                <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
              </div>
            )}
            {!loading && filteredEmpresas.length === 0 && (
              <div className="text-center py-8 text-blue-300 text-sm border-t border-blue-400/20">
              Nenhuma empresa encontrada
            </div>
          )}
            </div>
          </div>
      </main>
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
              
              <button
                onClick={() => executarUpload()}
                disabled={uploadPreview?.validos === 0 || uploading}
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
                    Confirmar Upload ({uploadPreview?.validos || 0} arquivo{(uploadPreview?.validos || 0) !== 1 ? 's' : ''})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  ); 
};

export default EmpresasPage;






