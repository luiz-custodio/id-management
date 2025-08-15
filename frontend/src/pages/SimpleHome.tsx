export default function SimpleHome() {
  console.log('SimpleHome renderizando...');
  
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(to bottom right, #f8fafc, #e0f2fe)',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto', paddingTop: '100px' }}>
        <h1 style={{ 
          fontSize: '3rem', 
          fontWeight: 'bold', 
          color: '#1f2937', 
          marginBottom: '24px' 
        }}>
          🎉 Sistema de Gerenciamento de IDs
        </h1>
        
        <p style={{ 
          fontSize: '1.25rem', 
          color: '#6b7280', 
          marginBottom: '32px',
          maxWidth: '600px',
          margin: '0 auto 32px auto'
        }}>
          Organizador automático de documentos com numeração padronizada
        </p>
        
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a 
            href="/dashboard" 
            style={{
              background: 'linear-gradient(to right, #2563eb, #7c3aed)',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: '600',
              display: 'inline-block'
            }}
          >
            📊 Dashboard
          </a>
          
          <a 
            href="/importar" 
            style={{
              background: 'white',
              color: '#2563eb',
              padding: '12px 24px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: '600',
              border: '2px solid #2563eb',
              display: 'inline-block'
            }}
          >
            📁 Importar
          </a>
          
          <a 
            href="/teste" 
            style={{
              background: 'white',
              color: '#16a34a',
              padding: '12px 24px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: '600',
              border: '2px solid #16a34a',
              display: 'inline-block'
            }}
          >
            🧪 Teste
          </a>
          
          <a 
            href="/login" 
            style={{
              background: 'white',
              color: '#7c3aed',
              padding: '12px 24px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: '600',
              border: '2px solid #7c3aed',
              display: 'inline-block'
            }}
          >
            🔐 Login
          </a>
        </div>
        
        <div style={{ marginTop: '48px', padding: '24px', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px', color: '#1f2937' }}>
            ✅ Status do Sistema
          </h2>
          <p style={{ color: '#16a34a', fontWeight: '600' }}>
            Frontend funcionando corretamente!
          </p>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '8px' }}>
            Servidor: http://localhost:5176
          </p>
        </div>
      </div>
    </div>
  );
}
