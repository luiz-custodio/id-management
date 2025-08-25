import React, { useState, useEffect } from 'react';
import { Minus, X, Pin, PinOff, Monitor } from 'lucide-react';

const TitleBar: React.FC = () => {
  const [isPinned, setIsPinned] = useState(false);
  const [showSizeMenu, setShowSizeMenu] = useState(false);
  const [sizes, setSizes] = useState<Record<string, { width: number; height: number; name: string }>>({});
  const [currentSize, setCurrentSize] = useState('medium');

  useEffect(() => {
    if (window.electronAPI) {
      // Carregar tamanhos disponíveis
      window.electronAPI.windowGetSizes().then(({ sizes, current }) => {
        setSizes(sizes);
        setCurrentSize(current);
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
    <div className="fixed top-0 left-0 right-0 h-8 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-4 z-50 electron-drag">
      
      {/* Título */}
      <div className="flex items-center gap-2 text-white text-sm font-medium">
        <div className="w-4 h-4 bg-blue-600 rounded flex items-center justify-center text-xs font-bold">
          BM
        </div>
        Sistema de Gerenciamento de IDs
      </div>

      {/* Controles da janela */}
      <div className="flex items-center gap-1 electron-no-drag">
        {/* Seletor de Tamanho */}
        <div className="relative">
          <button
            onClick={() => setShowSizeMenu(!showSizeMenu)}
            className="w-8 h-6 flex items-center justify-center hover:bg-slate-700 text-slate-300 hover:text-white rounded transition-colors"
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
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-700 transition-colors ${
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
          className={`w-8 h-6 flex items-center justify-center rounded transition-colors ${
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
          className="w-8 h-6 flex items-center justify-center hover:bg-slate-700 text-slate-300 hover:text-white rounded transition-colors"
          title="Minimizar"
        >
          <Minus size={14} />
        </button>

        {/* Botão Fechar */}
        <button
          onClick={handleClose}
          className="w-8 h-6 flex items-center justify-center hover:bg-red-600 text-slate-300 hover:text-white rounded transition-colors"
          title="Fechar"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
