import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Importar from './pages/Importar';
import TesteIntegracao from './pages/TesteIntegracao';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/importar" element={<Importar />} />
          <Route path="/teste" element={<TesteIntegracao />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
