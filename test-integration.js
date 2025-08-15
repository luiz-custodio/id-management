#!/usr/bin/env node
// Script de teste da integração Backend + Frontend

const API_BASE = "http://localhost:8000";

async function testAPI() {
  console.log("🧪 Testando integração Backend + Frontend...\n");

  try {
    // Test 1: Listar empresas
    console.log("1️⃣ Testando /empresas...");
    const empresasResponse = await fetch(`${API_BASE}/empresas`);
    const empresas = await empresasResponse.json();
    console.log(`✅ Empresas encontradas: ${empresas.length}`);
    console.log(empresas);

    if (empresas.length > 0) {
      const empresa = empresas[0];
      
      // Test 2: Listar unidades
      console.log(`\n2️⃣ Testando /unidades para empresa ${empresa.id}...`);
      const unidadesResponse = await fetch(`${API_BASE}/unidades?empresa_id=${empresa.id}`);
      const unidades = await unidadesResponse.json();
      console.log(`✅ Unidades encontradas: ${unidades.length}`);
      console.log(unidades);

      if (unidades.length > 0) {
        // Test 3: Preview de organização
        console.log(`\n3️⃣ Testando /organizador/preview...`);
        const testFiles = ["C:\\Temp\\FAT-2025-08.pdf", "C:\\Temp\\NE-CP-2025-08.pdf"];
        
        const previewResponse = await fetch(`${API_BASE}/organizador/preview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base_dir: "C:\\Temp",
            unidade_id: unidades[0].id,
            arquivos: testFiles
          })
        });
        
        const preview = await previewResponse.json();
        console.log(`✅ Preview gerado com ${preview.length} itens`);
        console.log(preview);
      }
    }

    console.log("\n🎉 Todos os testes passaram! Integração funcionando corretamente.");

  } catch (error) {
    console.error("❌ Erro no teste:", error.message);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  testAPI();
}

module.exports = { testAPI };
