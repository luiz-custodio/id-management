import { BrowserRouter as Router, HashRouter, Routes, Route } from 'react-router-dom';
// Rotas simplificadas: apenas página de Empresas por enquanto.
import EmpresasPage from './pages/Empresas';
import TitleBar from './components/TitleBar';

function App() {
  // Detectar se está no Electron para usar HashRouter
  const isElectron = typeof window !== 'undefined' && window.electronAPI;
  const RouterComponent = isElectron ? HashRouter : Router;

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
    </>
  )
}

export default App
