import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// Rotas simplificadas: apenas página de Empresas por enquanto.
import EmpresasPage from './pages/Empresas';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<EmpresasPage />} />
          <Route path="/empresas" element={<EmpresasPage />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
