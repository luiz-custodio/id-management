import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertCircle,
  Upload,
  FileText,
  FolderOpen,
  ArrowRight,
  Check,
  Edit,
  RefreshCw,
  Download,
  X,
  MapPin,
  ChevronRight,
  ChevronLeft,
  Search,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { api, type Empresa, type Unidade } from '@/lib/api';

// Tipos específicos para a organização em lote
interface FileItem {
  name: string;
  path: string;
  size: number;
  isDetected: boolean;
  type?: string;
  newName?: string;
  targetFolder?: string;
}

interface DetectedFile extends FileItem {
  isDetected: true;
  type: string;
  newName: string;
  targetFolder: string;
}

interface UndetectedFile extends FileItem {
  isDetected: false;
  assignedFolder?: string;
  customName?: string;
}

interface FolderTarget {
  id: string;
  name: string;
  path: string;
  description: string;
  types: string[];
  count: number;
}

interface ProcessingResult {
  originalName: string;
  newName: string;
  targetPath: string;
  success: boolean;
  error?: string;
}

// Estrutura de pastas conforme especificação
const FOLDER_STRUCTURE: FolderTarget[] = [
  {
    id: 'relatorios',
    name: '01 Relatórios e Resultados',
    path: '01 Relatórios e Resultados',
    description: 'REL e RES',
    types: ['REL', 'RES'],
    count: 0
  },
  {
    id: 'faturas',
    name: '02 Faturas',
    path: '02 Faturas',
    description: 'FAT',
    types: ['FAT'],
    count: 0
  },
  {
    id: 'notas-energia',
    name: '03 Notas de Energia',
    path: '03 Notas de Energia',
    description: 'NE-CP e NE-LP',
    types: ['NE-CP', 'NE-LP'],
    count: 0
  },
  {
    id: 'ccee-dri',
    name: '04 CCEE - DRI',
    path: '04 CCEE - DRI',
    description: 'CCEE (todos os tipos)',
    types: ['CCEE'],
    count: 0
  },
  {
    id: 'bm-energia',
    name: '05 BM Energia',
    path: '05 BM Energia',
    description: 'DOC-CTR, DOC-PRO, MIN-CTR, MIN-PRO, MIN-CAR',
    types: ['DOC-CTR', 'DOC-PRO', 'MIN-CTR', 'MIN-PRO', 'MIN-CAR'],
    count: 0
  },
  {
    id: 'documentos-cliente',
    name: '06 Documentos do Cliente',
    path: '06 Documentos do Cliente',
    description: 'DOC-CAD, DOC-ADT, DOC-COM, DOC-LIC, DOC-CAR',
    types: ['DOC-CAD', 'DOC-ADT', 'DOC-COM', 'DOC-LIC', 'DOC-CAR'],
    count: 0
  },
  {
    id: 'projetos',
    name: '07 Projetos',
    path: '07 Projetos',
    description: 'Arquivos de projetos',
    types: [],
    count: 0
  },
  {
    id: 'comercializadoras',
    name: '08 Comercializadoras',
    path: '08 Comercializadoras',
    description: 'Documentos de comercializadoras',
    types: [],
    count: 0
  },
  {
    id: 'ccee-modelagem',
    name: '09 CCEE - Modelagem',
    path: '09 CCEE - Modelagem',
    description: 'Arquivos de modelagem CCEE',
    types: [],
    count: 0
  },
  {
    id: 'distribuidora',
    name: '10 Distribuidora',
    path: '10 Distribuidora',
    description: 'Documentos da distribuidora',
    types: [],
    count: 0
  },
  {
    id: 'icms',
    name: '11 ICMS',
    path: '11 ICMS',
    description: 'Documentos de ICMS',
    types: [],
    count: 0
  },
  {
    id: 'estudos',
    name: '12 Estudos e Análises',
    path: '12 Estudos e Análises',
    description: 'EST',
    types: ['EST'],
    count: 0
  }
];

const BatchOrganize: React.FC = () => {
  // Estados principais
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>('');
  const [selectedUnidade, setSelectedUnidade] = useState<string>('');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [detectedFiles, setDetectedFiles] = useState<DetectedFile[]>([]);
  const [undetectedFiles, setUndetectedFiles] = useState<UndetectedFile[]>([]);
  const [folders, setFolders] = useState<FolderTarget[]>(FOLDER_STRUCTURE);
  
  // Estados de interface
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [draggedFiles, setDraggedFiles] = useState<UndetectedFile[] | null>(null);
  const [selectedManualPaths, setSelectedManualPaths] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  
  // Estados para pesquisa
  const [searchEmpresa, setSearchEmpresa] = useState('');
  const [searchUnidade, setSearchUnidade] = useState('');
  
  const [renameDialog, setRenameDialog] = useState<{
    isOpen: boolean;
    file: UndetectedFile | null;
    newName: string;
  }>({
    isOpen: false,
    file: null,
    newName: ''
  });
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    results: ProcessingResult[];
  }>({
    isOpen: false,
    results: []
  });

  // Mover um arquivo detectado automaticamente para a aba Manual
  const moveToManual = (file: DetectedFile) => {
    // Evita duplicar se já estiver na lista manual
    const alreadyInManual = undetectedFiles.some((f) => f.path === file.path);
    if (alreadyInManual) return;

    // Remove da lista automática
    const remainingDetected = detectedFiles.filter((f) => f.path !== file.path);
    setDetectedFiles(remainingDetected);

    // Adiciona na lista manual (sem pasta atribuída; mantém sugestão de nome)
    const manualItem: UndetectedFile = {
      name: file.name,
      path: file.path,
      size: file.size,
      isDetected: false,
      assignedFolder: undefined,
      customName: file.newName || file.name,
    };
    setUndetectedFiles([...undetectedFiles, manualItem]);

    // Atualiza contadores das pastas (remove 1 da pasta sugerida automática)
    const updatedFolders = folders.map((folder) => ({
      ...folder,
      count: folder.path === file.targetFolder ? Math.max(0, folder.count - 1) : folder.count,
    }));
    setFolders(updatedFolders);

    toast.success(`${file.name} movido para organização manual`);
  };

  // Carregar empresas
  useEffect(() => {
    const loadEmpresas = async () => {
      try {
        const data = await api.listarEmpresas();
        setEmpresas(data);
      } catch (error) {
        toast.error('Erro ao carregar empresas');
        console.error(error);
      }
    };
    loadEmpresas();
  }, []);

  // Carregar unidades quando empresa é selecionada
  useEffect(() => {
    if (!selectedEmpresa) {
      setUnidades([]);
      setSelectedUnidade('');
      return;
    }

    const loadUnidades = async () => {
      try {
        const empresaId = parseInt(selectedEmpresa);
        const data = await api.listarUnidades(empresaId);
        setUnidades(data);
        setSelectedUnidade('');
      } catch (error) {
        toast.error('Erro ao carregar unidades');
        console.error(error);
      }
    };
    loadUnidades();
  }, [selectedEmpresa]);

  // Filtrar empresas e unidades com base na pesquisa
  const filteredEmpresas = empresas.filter(empresa =>
    empresa.nome.toLowerCase().includes(searchEmpresa.toLowerCase()) ||
    empresa.id_empresa.toLowerCase().includes(searchEmpresa.toLowerCase())
  );

  const filteredUnidades = unidades.filter(unidade =>
    unidade.nome.toLowerCase().includes(searchUnidade.toLowerCase()) ||
    unidade.id_unidade.toLowerCase().includes(searchUnidade.toLowerCase())
  );

  // Processar arquivos após drop
  const processDroppedFiles = useCallback(async (fileList: File[]) => {
    try {
      setLoading(true);
      
      // LIMPAR LISTAS EXISTENTES PRIMEIRO
      setFiles([]);
      setDetectedFiles([]);
      setUndetectedFiles([]);
      
      console.log('🔄 PROCESSANDO ARQUIVOS - Total:', fileList.length);
      
      // ESTRATÉGIA 1: Se temos webkitRelativePath, usar filtragem por path
      const hasRelativePaths = fileList.some(file => file.webkitRelativePath);
      
      let filteredFileList;
      
      if (hasRelativePaths) {
        console.log('✅ Usando filtragem por PATH (webkitRelativePath disponível)');
        filteredFileList = fileList.filter(file => {
          const path = file.webkitRelativePath || file.name;
          const pathLower = path.toLowerCase();
          const pathNorm = path.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
          
          const shouldIgnore = (
            pathLower.includes('6_relatórios') ||
            pathLower.includes('6 relatórios') ||
            pathNorm.includes('6_relatorios') ||
            pathNorm.includes('6 relatorios')
          );
          
          if (shouldIgnore) {
            console.log('🚫 IGNORANDO (path):', file.name, 'path:', path);
            return false;
          }
          
          console.log('✅ ACEITO (path):', file.name, 'path:', path);
          return true;
        });
      } else {
        console.log('⚠️ SEM webkitRelativePath - usando filtragem por NOME DE ARQUIVO');
        // ESTRATÉGIA 2: Filtrar por padrões conhecidos de arquivos CCEE que NÃO queremos
        const cceePatterns = /^(CFZ|GFN|LFN|LFRCA|LFRES|PEN|SUM|BOLETOCA|ND)/i;
        
        filteredFileList = fileList.filter(file => {
          const fileName = file.name.toLowerCase();
          
          // Se é um arquivo CCEE conhecido E não tem path específico, provavelmente está em 6_RELATÓRIOS
          if (cceePatterns.test(file.name)) {
            console.log('🚫 IGNORANDO arquivo CCEE (provavelmente de 6_RELATÓRIOS):', file.name);
            return false;
          }
          
          // Se contém "boleto" no nome, também pode ser da pasta 6_RELATÓRIOS
          if (fileName.includes('boleto')) {
            console.log('🚫 IGNORANDO arquivo BOLETO (provavelmente de 6_RELATÓRIOS):', file.name);
            return false;
          }
          
          console.log('✅ ACEITO (nome):', file.name);
          return true;
        });
      }
      
      if (filteredFileList.length === 0) {
        toast.warning('Todos os arquivos foram filtrados (pasta 6_RELATÓRIOS ou arquivos CCEE detectados).');
        setLoading(false);
        return;
      }
      
      console.log(`📊 FILTRAGEM: ${filteredFileList.length}/${fileList.length} arquivos aceitos`);
      
      // Preparar dados dos arquivos para a API (APÓS FILTRAGEM)
      const files = filteredFileList.map(file => ({
        name: file.name,
        path: file.webkitRelativePath || file.name,
        size: file.size,
        last_modified: file.lastModified || Date.now() // Timestamp da data de modificação
      }));

      console.log('📤 Enviando para API:', files.length, 'arquivos');
      files.forEach((file, index) => {
        console.log(`${index + 1}. ${file.name} - ${file.path}`);
      });

      // Chamar API de análise automática
      const response = await api.batchAnalyzeFiles({
        empresa_id: parseInt(selectedEmpresa),
        unidade_id: parseInt(selectedUnidade),
        files
      });

      // Converter response para os tipos do frontend
      const allFiles: FileItem[] = [];
      const detected: DetectedFile[] = [];
      const undetected: UndetectedFile[] = [];

      response.detected_files.forEach(file => {
        const detectedFile: DetectedFile = {
          name: file.name,
          path: file.path,
          size: file.size,
          isDetected: true,
          type: file.detected_type!,
          newName: file.new_name || file.name,
          targetFolder: file.target_folder!
        };
        detected.push(detectedFile);
        allFiles.push(detectedFile);
      });

      response.undetected_files.forEach(file => {
        const undetectedFile: UndetectedFile = {
          name: file.name,
          path: file.path,
          size: file.size,
          isDetected: false
        };
        undetected.push(undetectedFile);
        allFiles.push(undetectedFile);
      });

      setFiles(allFiles);
      setDetectedFiles(detected);
      setUndetectedFiles(undetected);
      setSelectedManualPaths(new Set());
      setLastSelectedIndex(null);

      // Atualizar contadores das pastas
      const updatedFolders = folders.map(folder => ({
        ...folder,
        count: detected.filter(f => f.targetFolder === folder.path).length
      }));
      setFolders(updatedFolders);

      toast.success(`${filteredFileList.length} arquivos processados: ${detected.length} detectados automaticamente, ${undetected.length} para organizar manualmente${filteredFileList.length < fileList.length ? ` (${fileList.length - filteredFileList.length} da pasta 6_RELATÓRIOS foram ignorados)` : ''}`);
    } catch (error) {
      console.error('Erro ao analisar arquivos:', error);
      toast.error('Erro ao analisar arquivos. Verifique se o servidor está funcionando.');
    } finally {
      setLoading(false);
    }
  }, [selectedEmpresa, selectedUnidade, folders]);

  // Configuração do dropzone - ACEITAR PASTAS E ARQUIVOS
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles: File[]) => {
      if (!selectedEmpresa || !selectedUnidade) {
        toast.error('Selecione empresa e unidade antes de arrastar arquivos');
        return;
      }
      
      console.log('📁 ARQUIVOS RECEBIDOS:', acceptedFiles.length);
      console.log('📁 Primeiros 5 arquivos:', acceptedFiles.slice(0, 5).map(f => ({
        name: f.name,
        webkitRelativePath: f.webkitRelativePath,
        size: f.size
      })));
      
      processDroppedFiles(acceptedFiles);
    },
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/xml': ['.xml'],
      'application/xml': ['.xml']
    },
    multiple: true
  });

  // Handlers para seleção e drag & drop manual (multi-seleção)
  const handleManualItemClick = (e: React.MouseEvent, file: UndetectedFile, index: number) => {
    if (e.shiftKey && lastSelectedIndex !== null) {
      const [start, end] = [lastSelectedIndex, index].sort((a, b) => a - b);
      const newSet = new Set(selectedManualPaths);
      for (let i = start; i <= end; i++) newSet.add(undetectedFiles[i].path);
      setSelectedManualPaths(newSet);
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      const newSet = new Set(selectedManualPaths);
      if (newSet.has(file.path)) newSet.delete(file.path); else newSet.add(file.path);
      setSelectedManualPaths(newSet);
      setLastSelectedIndex(index);
      return;
    }

    // Seleção simples
    setSelectedManualPaths(new Set([file.path]));
    setLastSelectedIndex(index);
  };

  const handleFileDragStart = (file: UndetectedFile, index?: number) => {
    const selectedHasCurrent = selectedManualPaths.has(file.path);
    let group: UndetectedFile[];
    if (selectedManualPaths.size > 0 && selectedHasCurrent) {
      group = undetectedFiles.filter((f) => selectedManualPaths.has(f.path));
    } else {
      group = [file];
      setSelectedManualPaths(new Set([file.path]));
      setLastSelectedIndex(index ?? null);
    }
    setDraggedFiles(group);
  };

  const handleFileDragEnd = () => {
    setDraggedFiles(null);
  };

  const handleFolderDrop = (folderId: string) => {
    if (!draggedFiles || draggedFiles.length === 0) return;

    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;

    const targetPath = folder.path;

    // Atualiza atribuições
    const draggedSet = new Set(draggedFiles.map(df => df.path));
    const updatedUndetected = undetectedFiles.map(file =>
      draggedSet.has(file.path) ? { ...file, assignedFolder: targetPath } : file
    );
    setUndetectedFiles(updatedUndetected);

    // Calcula variações por pasta
    const decByFolder = new Map<string, number>();
    let incCount = 0;
    draggedFiles.forEach(df => {
      if (df.assignedFolder && df.assignedFolder !== targetPath) {
        decByFolder.set(df.assignedFolder, (decByFolder.get(df.assignedFolder) || 0) + 1);
      }
      if (df.assignedFolder !== targetPath) incCount += 1;
    });

    const updatedFolders = folders.map(f => {
      let count = f.count;
      if (f.id === folderId) count += incCount;
      const dec = decByFolder.get(f.path) || 0;
      if (dec) count = Math.max(0, count - dec);
      return { ...f, count };
    });
    setFolders(updatedFolders);

    toast.success(`${draggedFiles.length} arquivo(s) movido(s) para ${folder.name}`);
    setDraggedFiles(null);
  };

  // Função para renomear arquivo
  const handleRename = (file: UndetectedFile) => {
    setRenameDialog({
      isOpen: true,
      file,
      newName: file.customName || file.name
    });
  };

  const confirmRename = () => {
    if (!renameDialog.file) return;

    const updatedUndetected = undetectedFiles.map(file =>
      file.path === renameDialog.file!.path
        ? { ...file, customName: renameDialog.newName }
        : file
    );
    setUndetectedFiles(updatedUndetected);
    
    setRenameDialog({ isOpen: false, file: null, newName: '' });
    toast.success('Arquivo renomeado');
  };

  // Função para remover arquivo da lista
  const removeFile = (file: UndetectedFile) => {
    const updatedUndetected = undetectedFiles.filter(f => f.path !== file.path);
    setUndetectedFiles(updatedUndetected);

    // Atualiza seleção, se necessário
    if (selectedManualPaths.has(file.path)) {
      const ns = new Set(selectedManualPaths);
      ns.delete(file.path);
      setSelectedManualPaths(ns);
    }

    // Atualizar contador se arquivo tinha pasta atribuída
    if (file.assignedFolder) {
      const updatedFolders = folders.map(f => ({
        ...f,
        count: f.path === file.assignedFolder ? f.count - 1 : f.count
      }));
      setFolders(updatedFolders);
    }

    toast.success('Arquivo removido da lista');
  };

  // Função para processar tudo
  const processAll = async () => {
    if (!selectedEmpresa || !selectedUnidade) {
      toast.error('Selecione empresa e unidade');
      return;
    }

    // Verificar se todos os arquivos não detectados têm destino
    const unassignedFiles = undetectedFiles.filter(f => !f.assignedFolder);
    if (unassignedFiles.length > 0) {
      toast.error(`${unassignedFiles.length} arquivos ainda precisam de uma pasta de destino`);
      return;
    }

    setProcessing(true);

    try {
      // Simular processamento (aqui você integraria com a API real)
      const results: ProcessingResult[] = [];

      // Processar arquivos detectados
      for (const file of detectedFiles) {
        results.push({
          originalName: file.name,
          newName: file.newName,
          targetPath: `${file.targetFolder}/${file.newName}`,
          success: true
        });
      }

      // Processar arquivos não detectados
      for (const file of undetectedFiles) {
        if (file.assignedFolder) {
          const fileName = file.customName || file.name;
          results.push({
            originalName: file.name,
            newName: fileName,
            targetPath: `${file.assignedFolder}/${fileName}`,
            success: true
          });
        }
      }

      setConfirmDialog({
        isOpen: true,
        results
      });

    } catch (error) {
      toast.error('Erro ao processar arquivos');
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  // Função para confirmar processamento final
  const confirmFinalProcessing = async () => {
    try {
      // Aqui faria a chamada real para a API
      toast.success(`${confirmDialog.results.length} arquivos organizados com sucesso!`);
      
      // Limpar estado
      setFiles([]);
      setDetectedFiles([]);
      setUndetectedFiles([]);
      setFolders(FOLDER_STRUCTURE);
      setConfirmDialog({ isOpen: false, results: [] });
      
    } catch (error) {
      toast.error('Erro ao salvar arquivos');
      console.error(error);
    }
  };

  const canProcess = selectedEmpresa && selectedUnidade && files.length > 0 && 
    undetectedFiles.every(f => f.assignedFolder);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-blue-900 text-white">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Organização em Lote</h1>
            <p className="text-blue-200">
              Arraste uma pasta inteira para organizar arquivos automaticamente
            </p>
          </div>
        </div>

        {/* Seleção Compacta de Empresa e Unidade */}
        <div className="bg-slate-900/70 border border-blue-800/40 rounded-lg p-4 backdrop-blur-sm shadow-lg shadow-blue-900/20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-blue-200 uppercase tracking-wider">1. Destino</h3>
            {selectedEmpresa && selectedUnidade && (
              <button
                onClick={() => {
                  setSelectedEmpresa('');
                  setSelectedUnidade('');
                }}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Alterar
              </button>
            )}
          </div>

          {selectedEmpresa && selectedUnidade ? (
            <div className="bg-blue-800/15 border border-blue-700/30 rounded-lg p-3 transition-all duration-300 hover:border-blue-600/50">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">
                    {empresas.find(e => e.id.toString() === selectedEmpresa)?.nome}
                  </p>
                  <p className="text-xs text-blue-200 flex items-center gap-2">
                    <MapPin className="w-3 h-3 text-blue-400" />
                    {unidades.find(u => u.id.toString() === selectedUnidade)?.nome}
                    <span className="text-blue-400">• {unidades.find(u => u.id.toString() === selectedUnidade)?.id_unidade}</span>
                  </p>
                </div>
                <div className="text-xs bg-blue-700/25 text-blue-300 px-2 py-1 rounded border border-blue-600/50">
                  Selecionado
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Lista compacta de empresas */}
              {!selectedEmpresa ? (
                <div className="space-y-2">
                  <p className="text-xs text-blue-300 mb-2">Selecione uma empresa:</p>
                  
                  {/* Barra de pesquisa para empresas */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-400" />
                    <Input
                      placeholder="Pesquisar empresa..."
                      value={searchEmpresa}
                      onChange={(e) => setSearchEmpresa(e.target.value)}
                      className="pl-10 bg-white/10 border-blue-500/30 text-white placeholder:text-blue-300 text-sm h-9"
                    />
                  </div>
                  
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {filteredEmpresas.length > 0 ? (
                      filteredEmpresas.map((empresa) => (
                        <button
                          key={empresa.id}
                          onClick={() => setSelectedEmpresa(empresa.id.toString())}
                          className="w-full text-left px-3 py-2 rounded border border-blue-800/30 hover:bg-blue-800/15 hover:border-blue-700/50 transition-all duration-200 group"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm text-white font-medium">{empresa.nome}</span>
                              <span className="text-xs text-blue-300 ml-2 font-mono">({empresa.id_empresa})</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-blue-400 group-hover:text-blue-300 transition-colors" />
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="text-center py-4 text-blue-300 text-sm">
                        <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>Nenhuma empresa encontrada</p>
                        {searchEmpresa && (
                          <p className="text-xs mt-1">para "{searchEmpresa}"</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      onClick={() => setSelectedEmpresa('')}
                      className="text-blue-400 hover:text-blue-300"
                      title="Voltar para seleção de empresa"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <p className="text-xs text-blue-300">
                      {empresas.find(e => e.id.toString() === selectedEmpresa)?.nome} - Selecione a unidade:
                    </p>
                  </div>
                  
                  {/* Search bar for unidades */}
                  <div className="relative mb-2">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-blue-400" />
                    <input
                      type="text"
                      placeholder="Pesquisar unidade..."
                      value={searchUnidade}
                      onChange={(e) => setSearchUnidade(e.target.value)}
                      className="w-full pl-7 pr-3 py-1.5 text-xs bg-blue-900/20 border border-blue-800/30 rounded text-white placeholder-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                    />
                  </div>
                  
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {filteredUnidades.length > 0 ? (
                      filteredUnidades.map((unidade) => (
                        <button
                          key={unidade.id}
                          onClick={() => setSelectedUnidade(unidade.id.toString())}
                          className="w-full text-left px-3 py-2 rounded border border-blue-800/30 hover:bg-blue-800/15 hover:border-blue-700/50 transition-all duration-200 group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3 h-3 text-blue-400" />
                              <span className="text-sm text-white">{unidade.nome}</span>
                              <span className="text-xs text-blue-300 font-mono">({unidade.id_unidade})</span>
                              {unidade.id_unidade === "001" && (
                                <span className="text-xs bg-blue-700/30 text-blue-300 px-1.5 py-0.5 rounded border border-blue-600/50">
                                  Matriz
                                </span>
                              )}
                            </div>
                            <Check className="w-4 h-4 text-green-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="text-center py-4 text-blue-300 text-sm">
                        <Search className="w-6 h-6 mx-auto mb-2 opacity-50" />
                        <p>Nenhuma unidade encontrada</p>
                        {searchUnidade && (
                          <p className="text-xs mt-1">para "{searchUnidade}"</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Área de Drop */}
        <Card className="bg-white/10 backdrop-blur-sm border-blue-500/30">
          <CardHeader>
            <CardTitle className="text-white">2. Selecionar Arquivos</CardTitle>
            <CardDescription className="text-blue-200">
              Arraste uma pasta ou selecione arquivos para organizar
            </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
              ${isDragActive 
                ? 'border-blue-400 bg-blue-500/10' 
                : 'border-blue-500/30 hover:border-blue-400 bg-white/5 hover:bg-blue-500/10'
              }
              ${!selectedEmpresa || !selectedUnidade 
                ? 'opacity-50 cursor-not-allowed' 
                : ''
              }
            `}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-blue-300 mb-4" />
            {loading ? (
              <div className="flex items-center justify-center gap-2 text-white">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Processando arquivos...</span>
              </div>
            ) : isDragActive ? (
              <p className="text-lg text-white">Solte os arquivos aqui...</p>
            ) : (
              <div>
                <p className="text-lg mb-2 text-white">
                  Arraste uma pasta com arquivos aqui
                </p>
                <p className="text-sm text-blue-200">
                  Sistema inteligente: filtra automaticamente arquivos CCEE da pasta "6_RELATÓRIOS"
                </p>
                <p className="text-xs text-blue-300 mt-1">
                  Suporta: PDF, XLSX, XLS, CSV, DOCX, DOC
                </p>
              </div>
            )}
          </div>

          {files.length > 0 && (
            <Alert className="mt-4 bg-blue-500/20 border-blue-500/30">
              <AlertCircle className="h-4 w-4 text-blue-300" />
              <AlertDescription className="text-white flex items-center justify-between">
                <span>
                  <strong>{files.length} arquivos carregados:</strong> {detectedFiles.length} detectados automaticamente, {undetectedFiles.length} para organizar manualmente
                </span>
                <Button
                  onClick={() => {
                    // Filtrar arquivos existentes - remover os da pasta 6_RELATÓRIOS e subpastas
                    const filteredFiles = files.filter(file => {
                      const pathLower = file.path.toLowerCase();
                      const pathNorm = file.path.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
                      return !(
                        pathLower.includes('6_relatórios') ||
                        pathLower.includes('6 relatórios') ||
                        pathNorm.includes('6_relatorios') ||
                        pathNorm.includes('6 relatorios') ||
                        pathLower.includes('/6_relatórios/') ||
                        pathLower.includes('\\6_relatórios\\') ||
                        pathNorm.includes('/6_relatorios/') ||
                        pathNorm.includes('\\6_relatorios\\')
                      );
                    });
                    
                    const filteredDetected = detectedFiles.filter(file => {
                      const pathLower = file.path.toLowerCase();
                      const pathNorm = file.path.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
                      return !(
                        pathLower.includes('6_relatórios') ||
                        pathLower.includes('6 relatórios') ||
                        pathNorm.includes('6_relatorios') ||
                        pathNorm.includes('6 relatorios') ||
                        pathLower.includes('/6_relatórios/') ||
                        pathLower.includes('\\6_relatórios\\') ||
                        pathNorm.includes('/6_relatorios/') ||
                        pathNorm.includes('\\6_relatorios\\')
                      );
                    });
                    
                    const filteredUndetected = undetectedFiles.filter(file => {
                      const pathLower = file.path.toLowerCase();
                      const pathNorm = file.path.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
                      return !(
                        pathLower.includes('6_relatórios') ||
                        pathLower.includes('6 relatórios') ||
                        pathNorm.includes('6_relatorios') ||
                        pathNorm.includes('6 relatorios') ||
                        pathLower.includes('/6_relatórios/') ||
                        pathLower.includes('\\6_relatórios\\') ||
                        pathNorm.includes('/6_relatorios/') ||
                        pathNorm.includes('\\6_relatorios\\')
                      );
                    });
                    
                    setFiles(filteredFiles);
                    setDetectedFiles(filteredDetected);
                    setUndetectedFiles(filteredUndetected);
                    
                    const removedCount = files.length - filteredFiles.length;
                    if (removedCount > 0) {
                      toast.success(`${removedCount} arquivos da pasta 6_RELATÓRIOS foram removidos da lista`);
                    } else {
                      toast.info('Filtragem aplicada - arquivos 6_RELATÓRIOS não encontrados');
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="ml-2 bg-orange-500/20 hover:bg-orange-500/30 border-orange-500/50 text-orange-300"
                >
                  <Filter className="w-4 h-4 mr-1" />
                  Filtrar 6_RELATÓRIOS
                </Button>
                
                <Button
                  onClick={() => {
                    setFiles([]);
                    setDetectedFiles([]);
                    setUndetectedFiles([]);
                    toast.info('Lista de arquivos limpa');
                  }}
                  variant="outline"
                  size="sm"
                  className="ml-2 bg-red-500/20 hover:bg-red-500/30 border-red-500/50 text-red-300"
                >
                  <X className="w-4 h-4 mr-1" />
                  Limpar Lista
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Tabs com arquivos */}
      {files.length > 0 && (
        <Card className="bg-white/10 backdrop-blur-sm border-blue-500/30">
          <CardHeader>
            <CardTitle className="text-white">3. Organizar Arquivos</CardTitle>
            <CardDescription className="text-blue-200">
              Revise os arquivos detectados e organize os demais manualmente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="auto" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-white/10">
                <TabsTrigger value="auto" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                  Automático ({detectedFiles.length})
                </TabsTrigger>
                <TabsTrigger value="manual" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                  Manual ({undetectedFiles.length})
                </TabsTrigger>
              </TabsList>

              {/* Tab Automática */}
              <TabsContent value="auto" className="space-y-4">
                <div className="text-sm text-blue-200">
                  Arquivos detectados automaticamente com destino definido:
                </div>
                <ScrollArea className="h-64 w-full border border-blue-500/30 rounded bg-white/5">
                  <div className="p-4 space-y-2">
                    {detectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-green-500/20 border border-green-500/30 rounded">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-green-400" />
                          <span className="font-medium text-white">{file.name}</span>
                          <Badge variant="secondary" className="bg-blue-500/30 text-blue-200">{file.type}</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-blue-200">
                          <ArrowRight className="h-4 w-4" />
                          <span>{file.targetFolder}</span>
                          <Check className="h-4 w-4 text-green-400" />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => moveToManual(file)}
                            className="ml-2 border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/20"
                          >
                            <ChevronLeft className="h-3 w-3 mr-1" />
                            Enviar para Manual
                          </Button>
                        </div>
                      </div>
                    ))}
                    {detectedFiles.length === 0 && (
                      <div className="text-center py-8 text-blue-300">
                        Nenhum arquivo detectado automaticamente
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Tab Manual */}
              <TabsContent value="manual" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Lista de arquivos não detectados */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-white">Arquivos para organizar:</h4>
                    <ScrollArea className="h-64 w-full border border-blue-500/30 rounded bg-white/5">
                      <div className="p-4 space-y-2">
                        {undetectedFiles.map((file, index) => (
                          <div
                            key={index}
                            draggable
                            onDragStart={() => handleFileDragStart(file, index)}
                            onDragEnd={handleFileDragEnd}
                            onClick={(e) => handleManualItemClick(e, file, index)}
                            className={`
                              flex items-center justify-between p-2 border rounded cursor-move transition-opacity
                              ${draggedFiles?.some(df => df.path === file.path) ? 'opacity-50' : ''}
                              ${file.assignedFolder ? 'bg-blue-500/20 border-blue-500/30' : 'hover:bg-white/10 border-blue-500/20'}
                              ${selectedManualPaths.has(file.path) ? 'ring-1 ring-blue-400' : ''}
                            `}
                          >
                            <div className="flex items-center gap-2 flex-1">
                              <FileText className="h-4 w-4 text-blue-300" />
                              <div className="flex-1">
                                <div className="font-medium text-sm text-white">
                                  {file.customName || file.name}
                                </div>
                                {file.assignedFolder && (
                                  <div className="text-xs text-blue-300">
                                    → {file.assignedFolder}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRename(file)}
                                className="text-blue-300 hover:text-white hover:bg-blue-500/20"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeFile(file)}
                                className="text-red-400 hover:text-white hover:bg-red-500/20"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        {undetectedFiles.length === 0 && (
                          <div className="text-center py-8 text-blue-300">
                            Todos os arquivos foram detectados automaticamente
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* Pastas de destino */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-white">Pastas de destino:</h4>
                    <ScrollArea className="h-64 w-full">
                      <div className="space-y-2 pr-4">
                        {folders.map((folder) => (
                          <div
                            key={folder.id}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => handleFolderDrop(folder.id)}
                            className={`
                              p-3 border rounded transition-colors cursor-pointer
                              ${draggedFiles && draggedFiles.length > 0 
                                ? 'border-blue-400 bg-blue-500/20 hover:border-blue-300' 
                                : 'hover:bg-white/10 border-blue-500/30'
                              }
                            `}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <FolderOpen className="h-4 w-4 text-blue-400" />
                                <div>
                                  <div className="font-medium text-sm text-white">{folder.name}</div>
                                  <div className="text-xs text-blue-200">
                                    {folder.description}
                                  </div>
                                </div>
                              </div>
                              {folder.count > 0 && (
                                <Badge variant="secondary" className="bg-blue-500/30 text-blue-200">{folder.count}</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Botão de processar */}
      {files.length > 0 && (
        <Card className="bg-white/10 backdrop-blur-sm border-blue-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="font-medium text-white">
                  Pronto para processar {files.length} arquivos
                </div>
                <div className="text-sm text-blue-200">
                  {detectedFiles.length} automáticos + {undetectedFiles.filter(f => f.assignedFolder).length} manuais
                </div>
              </div>
              <Button
                onClick={processAll}
                disabled={!canProcess || processing}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
              >
                {processing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Confirmar e Processar
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog de renomear */}
      <Dialog open={renameDialog.isOpen} onOpenChange={(open: boolean) => 
        setRenameDialog(prev => ({ ...prev, isOpen: open }))
      }>
        <DialogContent className="bg-slate-900 border-blue-500/30 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Renomear arquivo</DialogTitle>
            <DialogDescription className="text-blue-200">
              Digite o novo nome para o arquivo (com extensão)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-white">Nome original:</label>
              <div className="text-sm text-blue-200">
                {renameDialog.file?.name}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-white">Novo nome:</label>
              <Input
                value={renameDialog.newName}
                onChange={(e) => setRenameDialog(prev => ({
                  ...prev,
                  newName: e.target.value
                }))}
                placeholder="Digite o novo nome..."
                className="bg-white/10 border-blue-500/30 text-white placeholder:text-blue-300"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameDialog({ isOpen: false, file: null, newName: '' })}
              className="border-blue-500/30 text-blue-200 hover:bg-blue-500/20"
            >
              Cancelar
            </Button>
            <Button 
              onClick={confirmRename} 
              disabled={!renameDialog.newName.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação */}
      <Dialog open={confirmDialog.isOpen} onOpenChange={(open: boolean) =>
        setConfirmDialog(prev => ({ ...prev, isOpen: open }))
      }>
        <DialogContent className="max-w-3xl max-h-[80vh] bg-slate-900 border-blue-500/30 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Confirmar processamento</DialogTitle>
            <DialogDescription className="text-blue-200">
              Revise as operações que serão realizadas:
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-96">
            <div className="space-y-2">
              {confirmDialog.results.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-2 border border-blue-500/30 rounded bg-white/5">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-300" />
                    <div>
                      <div className="font-medium text-sm text-white">{result.originalName}</div>
                      {result.originalName !== result.newName && (
                        <div className="text-xs text-blue-300">→ {result.newName}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-blue-200">
                    {result.targetPath}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ isOpen: false, results: [] })}
              className="border-blue-500/30 text-blue-200 hover:bg-blue-500/20"
            >
              Cancelar
            </Button>
            <Button 
              onClick={confirmFinalProcessing}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Download className="mr-2 h-4 w-4" />
              Processar Arquivos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
};

export default BatchOrganize;
