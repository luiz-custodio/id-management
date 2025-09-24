import { BrowserRouter as Router, HashRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
// Rotas
import EmpresasPage from './pages/Empresas';
import BatchOrganize from './pages/BatchOrganize';
import TitleBar from './components/TitleBar';
import Sidebar from './components/Sidebar';

function App() {
  // Detectar se está no Electron para usar HashRouter
  const isElectron = typeof window !== 'undefined' && window.electronAPI;
  const RouterComponent = isElectron ? HashRouter : Router;

  useEffect(() => {
    // Evita abrir arquivos/pastas quando o drop NÃO for dentro de uma área do app
    const onDragOver = (e: DragEvent) => {
      // Só bloqueia se não estiver sobre um elemento com data-allow-drop
      const path = (e.composedPath && e.composedPath()) || [] as any;
      const insideAllowed = Array.isArray(path) && path.some((n: any) => n?.getAttribute?.('data-allow-drop') === 'true');
      if (!insideAllowed) e.preventDefault();
    };
    const onDrop = (e: DragEvent) => {
      const path = (e.composedPath && e.composedPath()) || [] as any;
      const insideAllowed = Array.isArray(path) && path.some((n: any) => n?.getAttribute?.('data-allow-drop') === 'true');
      if (!insideAllowed) e.preventDefault();
    };
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);

    if (!window.electronAPI) return;
    const unsub = window.electronAPI.onUpdateEvent?.((evt) => {
      switch (evt.status) {
        case 'checking':
          toast.loading('Verificando atualizações...', { id: 'updater' });
          break;
        case 'disabled':
          toast.info('Atualizações automáticas indisponíveis no modo portátil. Use o instalador.', { id: 'updater' });
          break;
        case 'available':
          toast.message(`Nova versão disponível: ${evt.version}. Baixando...`, { id: 'updater' });
          break;
        case 'progress':
          toast.message(`Baixando atualização: ${Math.round(evt.percent || 0)}%`, { id: 'updater' });
          break;
        case 'downloaded':
          toast.success(`Atualização ${evt.version} baixada`, {
            id: 'updater',
            action: {
              label: 'Reiniciar',
              onClick: () => window.electronAPI?.quitAndInstall?.()
            }
          });
          break;
        case 'not-available':
          toast.info('Você já está na última versão', { id: 'updater' });
          break;
        case 'error':
          toast.error(`Erro ao atualizar: ${evt.message || ''}`, { id: 'updater' });
          break;
      }
    });
    return () => {
      try { unsub && unsub(); } catch {}
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  return (
    <>
      <TitleBar />
      <RouterComponent>
        <div className={`App flex h-screen ${isElectron ? 'pt-8' : ''}`}>
          <Sidebar />
          <main className="flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<EmpresasPage />} />
              <Route path="/empresas" element={<EmpresasPage />} />
              <Route path="/batch-organize" element={<BatchOrganize />} />
            </Routes>
          </main>
        </div>
      </RouterComponent>
      <Toaster richColors position="top-right" />
    </>
  )
}

export default App
