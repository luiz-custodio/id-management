import { BrowserRouter as Router, HashRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
// Rotas simplificadas: apenas página de Empresas por enquanto.
import EmpresasPage from './pages/Empresas';
import TitleBar from './components/TitleBar';

function App() {
  // Detectar se está no Electron para usar HashRouter
  const isElectron = typeof window !== 'undefined' && window.electronAPI;
  const RouterComponent = isElectron ? HashRouter : Router;

  useEffect(() => {
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
    return () => { try { unsub && unsub(); } catch {} };
  }, []);

  return (
    <>
      <TitleBar />
      <RouterComponent>
        <div className={`App ${isElectron ? 'pt-8' : ''}`}>
          <Routes>
            <Route path="/" element={<EmpresasPage />} />
            <Route path="/empresas" element={<EmpresasPage />} />
          </Routes>
        </div>
      </RouterComponent>
      <Toaster richColors position="top-right" />
    </>
  )
}

export default App
