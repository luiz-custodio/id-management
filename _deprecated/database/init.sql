-- Inicialização do banco PostgreSQL para ID Management
-- Mantém compatibilidade total com SQLite existente

-- Extensões úteis
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Configurações de timezone para compatibilidade
SET timezone = 'America/Sao_Paulo';

-- Criação das tabelas (equivalente ao SQLAlchemy)
CREATE TABLE IF NOT EXISTS empresas (
    id SERIAL PRIMARY KEY,
    id_empresa VARCHAR(4) UNIQUE NOT NULL,
    nome VARCHAR NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_empresas_id ON empresas(id);
CREATE INDEX IF NOT EXISTS ix_empresas_id_empresa ON empresas(id_empresa);

CREATE TABLE IF NOT EXISTS unidades (
    id SERIAL PRIMARY KEY,
    id_unidade VARCHAR(3) NOT NULL,
    nome VARCHAR NOT NULL,
    empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_unidades_id ON unidades(id);
CREATE INDEX IF NOT EXISTS ix_unidades_id_unidade ON unidades(id_unidade);

-- Constraint de unicidade para id_unidade por empresa (como no SQLite)
ALTER TABLE unidades ADD CONSTRAINT IF NOT EXISTS uq_unidade_por_empresa 
    UNIQUE (empresa_id, id_unidade);

CREATE TABLE IF NOT EXISTS itens (
    id SERIAL PRIMARY KEY,
    id_item VARCHAR NOT NULL,
    tipo VARCHAR NOT NULL,
    ano_mes VARCHAR NULL,
    titulo_visivel VARCHAR NOT NULL,
    caminho_arquivo VARCHAR NOT NULL,
    descricao VARCHAR NULL,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_modificacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    unidade_id INTEGER NOT NULL REFERENCES unidades(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_itens_id ON itens(id);
CREATE INDEX IF NOT EXISTS ix_itens_id_item ON itens(id_item);

-- Função para atualizar data_modificacao automaticamente
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.data_modificacao = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar data_modificacao automaticamente
DROP TRIGGER IF EXISTS update_itens_modtime ON itens;
CREATE TRIGGER update_itens_modtime 
    BEFORE UPDATE ON itens 
    FOR EACH ROW 
    EXECUTE FUNCTION update_modified_column();

-- Inserir dados de exemplo (equivalente ao que está no SQLite)
-- Só insere se não existir para evitar duplicatas

DO $$
BEGIN
    -- Empresa CEOLIN
    IF NOT EXISTS (SELECT 1 FROM empresas WHERE id_empresa = '0001') THEN
        INSERT INTO empresas (id_empresa, nome) VALUES ('0001', 'CEOLIN');
    END IF;
    
    -- Empresa EXEMPLO
    IF NOT EXISTS (SELECT 1 FROM empresas WHERE id_empresa = '0002') THEN
        INSERT INTO empresas (id_empresa, nome) VALUES ('0002', 'EXEMPLO LTDA');
    END IF;
    
    -- Unidades para CEOLIN
    IF NOT EXISTS (SELECT 1 FROM unidades WHERE empresa_id = (SELECT id FROM empresas WHERE id_empresa = '0001') AND id_unidade = '001') THEN
        INSERT INTO unidades (id_unidade, nome, empresa_id) 
        VALUES ('001', 'Matriz', (SELECT id FROM empresas WHERE id_empresa = '0001'));
    END IF;
    
    -- Unidades para EXEMPLO
    IF NOT EXISTS (SELECT 1 FROM unidades WHERE empresa_id = (SELECT id FROM empresas WHERE id_empresa = '0002') AND id_unidade = '001') THEN
        INSERT INTO unidades (id_unidade, nome, empresa_id) 
        VALUES ('001', 'Filial Central', (SELECT id FROM empresas WHERE id_empresa = '0002'));
    END IF;
END
$$;

-- Verificação final
SELECT 'Database initialized successfully!' as status;
