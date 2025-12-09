import React, { useState, useEffect } from 'react';
import { Minus, X, Pin, PinOff, Monitor, RefreshCw, Settings } from 'lucide-react';

const TitleBar: React.FC = () => {
  const [isPinned, setIsPinned] = useState(false);
  const [showSizeMenu, setShowSizeMenu] = useState(false);
  const [sizes, setSizes] = useState<Record<string, { width: number; height: number; name: string }>>({});
  const [currentSize, setCurrentSize] = useState('medium');
  const [ipPrefix, setIpPrefix] = useState('');
  const [ipSuffix, setIpSuffix] = useState('');

  useEffect(() => {
    if (window.electronAPI) {
      // Carregar tamanhos disponíveis
      window.electronAPI.windowGetSizes().then(({ sizes, current }) => {
        setSizes(sizes);
        setCurrentSize(current);
      });

      // Carregar host atual e separar prefixo/último octeto
      window.electronAPI.getServerConfig().then((cfg) => {
        const host = (cfg?.host || '').trim();
        const parts = host.split('.');
        if (parts.length === 4) {
          setIpPrefix(parts.slice(0, 3).join('.'));
          setIpSuffix(parts[3]);
        } else {
          setIpPrefix('192.168.1');
          setIpSuffix('');
        }
      }).catch(() => {
        setIpPrefix('192.168.1');
        setIpSuffix('');
      });
    }
  }, []);

  const handleMinimize = () => {
    if (window.electronAPI) {
      window.electronAPI.windowMinimize();
    }
  };

  const handleClose = () => {
    if (window.electronAPI) {
      window.electronAPI.windowClose();
    }
  };

  const handleTogglePin = async () => {
    if (window.electronAPI) {
      const newPinState = await window.electronAPI.windowTogglePin();
      setIsPinned(newPinState);
    }
  };

  const handleCheckUpdates = async () => {
    if (window.electronAPI) {
      await window.electronAPI.checkForUpdates?.();
    }
  };

  const handleEditIpSuffix = async () => {
    if (!window.electronAPI) return;
    const base = ipPrefix || '192.168.1';
    const current = ipSuffix || '';
    const input = window.prompt(`Informe apenas o último bloco do IP (${base}.X)`, current);
    if (input === null) return;
    const trimmed = input.trim();
    const parsed = Number(trimmed);
    if (!trimmed || Number.isNaN(parsed) || parsed < 0 || parsed > 255) {
      window.alert('Valor inválido. Digite um número entre 0 e 255.');
      return;
    }
    const normalized = String(Math.trunc(parsed));
    const host = `${base}.${normalized}`;
    try {
      await window.electronAPI.setServerConfig({ host });
      setIpSuffix(normalized);
    } catch (error) {
      console.error('Falha ao salvar IP', error);
      window.alert('Não foi possível salvar o IP. Tente novamente.');
    }
  };

  const handleSizeChange = async (sizeKey: string) => {
    if (window.electronAPI) {
      const result = await window.electronAPI.windowResize(sizeKey);
      if (result) {
        setCurrentSize(result.size);
      }
    }
    setShowSizeMenu(false);
  };

  // Não mostrar se não estiver no Electron
  if (!window.electronAPI) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 h-8 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-4 z-50">
      {/* Área de título arrastável */}
      <div className="flex-1 flex items-center gap-3 h-full">
        <div className="electron-drag flex items-center gap-2 text-white text-sm font-medium select-none h-full">
          <div className="w-4 h-4 bg-blue-600 rounded flex items-center justify-center text-xs font-bold">
            BM
          </div>
          Sistema de Gerenciamento de IDs
        </div>
        {/* Botão de configuração do servidor (fora da área de drag) */}
        <button
          onClick={handleEditIpSuffix}
          className="electron-no-drag flex items-center gap-2 text-xs text-slate-200 bg-slate-800/80 hover:bg-slate-700/90 px-2 py-1 rounded border border-slate-700 hover:border-blue-500 transition-colors"
          title="Clique para editar o IP do servidor"
          type="button"
        >
          <span className="hidden sm:inline">Servidor:</span>
          <span className="font-mono bg-slate-900 px-2 py-1 rounded border border-slate-700 text-blue-100">{ipPrefix || '192.168.1'}.{ipSuffix || 'x'}</span>
          <Settings size={14} />
        </button>
      </div>

      {/* Controles da janela */}
      <div className="flex items-center gap-1 electron-no-drag">
        {/* Verificar atualizações */}
        <button
          onClick={handleCheckUpdates}
          className="electron-no-drag w-8 h-6 flex items-center justify-center hover:bg-slate-700 text-slate-300 hover:text-white rounded transition-colors"
          title="Verificar atualizações"
        >
          <RefreshCw size={12} />
        </button>
        {/* Seletor de Tamanho */}
        <div className="relative">
          <button
            onClick={() => setShowSizeMenu(!showSizeMenu)}
            className="electron-no-drag w-8 h-6 flex items-center justify-center hover:bg-slate-700 text-slate-300 hover:text-white rounded transition-colors"
            title={`Tamanho: ${sizes[currentSize]?.name || 'Médio'}`}
          >
            <Monitor size={12} />
          </button>
          
          {showSizeMenu && (
            <div className="absolute right-0 top-8 bg-slate-800 border border-slate-600 rounded shadow-lg z-50 min-w-32">
              {Object.entries(sizes).map(([key, size]) => (
                <button
                  key={key}
                  onClick={() => handleSizeChange(key)}
                  className={`electron-no-drag w-full px-3 py-2 text-left text-sm hover:bg-slate-700 transition-colors ${
                    currentSize === key ? 'bg-blue-600 text-white' : 'text-slate-300'
                  }`}
                >
                  {size.name}
                  <span className="text-xs text-slate-400 block">
                    {size.width}×{size.height}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        {/* Botão Pin */}
        <button
          onClick={handleTogglePin}
          className={`electron-no-drag w-8 h-6 flex items-center justify-center rounded transition-colors ${
            isPinned 
              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
              : 'hover:bg-slate-700 text-slate-300 hover:text-white'
          }`}
          title={isPinned ? 'Desafixar janela' : 'Manter sempre na frente'}
        >
          {isPinned ? <PinOff size={12} /> : <Pin size={12} />}
        </button>

        {/* Botão Minimizar */}
        <button
          onClick={handleMinimize}
          className="electron-no-drag w-8 h-6 flex items-center justify-center hover:bg-slate-700 text-slate-300 hover:text-white rounded transition-colors"
          title="Minimizar"
        >
          <Minus size={14} />
        </button>

        {/* Botão Fechar */}
        <button
          onClick={handleClose}
          className="electron-no-drag w-8 h-6 flex items-center justify-center hover:bg-red-600 text-slate-300 hover:text-white rounded transition-colors"
          title="Fechar"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
