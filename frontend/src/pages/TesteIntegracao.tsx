import { useState, useEffect } from 'react';
import { api, type Empresa, type Unidade } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TesteIntegracao() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const testarEmpresas = async () => {
    setLoading(true);
    setStatus('idle');
    try {
      const data = await api.listarEmpresas();
      setEmpresas(data);
      setResultado(`✅ Sucesso! ${data.length} empresas encontradas`);
      setStatus('success');
    } catch (error) {
      setResultado(`❌ Erro: ${error instanceof Error ? error.message : String(error)}`);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const testarUnidades = async () => {
    if (empresas.length === 0) {
      setResultado('⚠️ Execute o teste de empresas primeiro');
      setStatus('error');
      return;
    }
    
    setLoading(true);
    setStatus('idle');
    try {
      const data = await api.listarUnidades(empresas[0].id);
      setUnidades(data);
      setResultado(`✅ Sucesso! ${data.length} unidades encontradas para empresa ${empresas[0].nome}`);
      setStatus('success');
    } catch (error) {
      setResultado(`❌ Erro: ${error instanceof Error ? error.message : String(error)}`);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const testarPreview = async () => {
    if (unidades.length === 0) {
      setResultado('⚠️ Execute o teste de unidades primeiro');
      setStatus('error');
      return;
    }
    
    setLoading(true);
    setStatus('idle');
    try {
      const testFiles = ['C:\\Temp\\FAT-2025-08.pdf', 'C:\\Temp\\NE-CP-2025-08.pdf'];
      const data = await api.preview('C:\\Temp', unidades[0].id, testFiles);
      setResultado(`✅ Sucesso! Preview gerado com ${data.length} itens`);
      setStatus('success');
    } catch (error) {
      setResultado(`❌ Erro: ${error instanceof Error ? error.message : String(error)}`);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  // Teste automático ao carregar
  useEffect(() => {
    testarEmpresas();
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>🧪 Teste de Integração Backend + Frontend</CardTitle>
        <CardDescription>
          Teste a comunicação entre o React frontend e FastAPI backend
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={testarEmpresas} 
            disabled={loading}
            variant="outline"
          >
            🏢 Testar Empresas
          </Button>
          <Button 
            onClick={testarUnidades} 
            disabled={loading}
            variant="outline"
          >
            🏭 Testar Unidades
          </Button>
          <Button 
            onClick={testarPreview} 
            disabled={loading}
            variant="outline"
          >
            📄 Testar Preview
          </Button>
        </div>

        {resultado && (
          <div className={`p-3 rounded-lg border ${getStatusColor()}`}>
            <p className="font-medium">{resultado}</p>
          </div>
        )}

        {empresas.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Empresas encontradas:</h4>
            <div className="bg-gray-50 p-3 rounded text-sm">
              {empresas.map(empresa => (
                <div key={empresa.id}>
                  {empresa.id_empresa} - {empresa.nome}
                </div>
              ))}
            </div>
          </div>
        )}

        {unidades.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Unidades encontradas:</h4>
            <div className="bg-gray-50 p-3 rounded text-sm">
              {unidades.map(unidade => (
                <div key={unidade.id}>
                  {unidade.id_unidade} - {unidade.nome}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-sm text-gray-600">
          <p><strong>Status dos Servidores:</strong></p>
          <p>• Backend: http://localhost:8000</p>
          <p>• Frontend: http://localhost:5173</p>
          <p>• API Docs: http://localhost:8000/docs</p>
        </div>
      </CardContent>
    </Card>
  );
}
