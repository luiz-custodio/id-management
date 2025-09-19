# Sidebar Retrátil - Sistema de Gerenciamento de IDs

## 📋 Funcionalidade Implementada

A sidebar do sistema agora possui funcionalidade retrátil, permitindo ao usuário maximizar o espaço da área de trabalho quando necessário.

## 🎯 Características

### Estados da Sidebar

**Modo Colapsado (Padrão)**
- Largura: 64px (w-16)  
- Logo apenas com ícone "ID"
- Navegação apenas com ícones
- Tooltips informativos ao passar o mouse
- Checklist oculto para economizar espaço
- Footer simplificado
- **Botão de toggle centralizado abaixo do logo**

**Modo Expandido**
- Largura: 224px (w-56)
- Exibe logo completo com texto
- Mostra nomes e descrições completas dos itens de navegação
- Checklist de filiais visível e funcional
- Footer com informações completas
- **Botão de toggle centralizado abaixo do logo**

### Interação

- **Botão de Toggle**: Centralizado abaixo do logo no cabeçalho da sidebar
- **Ícones**: 
  - `Menu` (☰) quando colapsado - clique para expandir
  - `X` (✕) quando expandido - clique para recolher
- **Tooltips**: Quando colapsado, ao passar o mouse sobre os itens de navegação, aparecem tooltips informativos
- **Persistência**: O estado (expandido/colapsado) é salvo no localStorage do navegador
- **Padrão**: A sidebar inicia **retraída** por padrão para maximizar espaço de trabalho

## 🔧 Implementação Técnica

### Arquivos Modificados

1. **`src/hooks/useSidebar.ts`** (novo)
   - Hook personalizado para gerenciar estado da sidebar
   - Persistência no localStorage
   - Função de toggle

2. **`src/components/Sidebar.tsx`** (modificado)
   - Integração com hook useSidebar
   - Layout responsivo baseado no estado
   - Tooltips para modo colapsado
   - Animações suaves de transição

### Estrutura do Hook

```typescript
export const useSidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    // Restaura estado do localStorage
  });

  const toggleSidebar = () => {
    setIsCollapsed(prev => !prev);
  };

  return { isCollapsed, toggleSidebar };
};
```

### Classes CSS Principais

- `transition-all duration-300`: Animação suave de largura
- `w-16` vs `w-56`: Larguras para modo colapsado e expandido
- Tooltips com `absolute`, `opacity-0/100` e `group-hover`

## 🎨 Design

### Responsividade
- Transições suaves (300ms) ao alternar estados
- Elementos se reorganizam automaticamente
- Tooltips aparecem apenas no modo colapsado

### Acessibilidade
- Botão com `title` descritivo
- Tooltips informativos
- Ícones semânticos
- Contraste adequado

## 💾 Persistência

O estado da sidebar é automaticamente salvo no `localStorage` com a chave:
```
idms.sidebarCollapsed: "true" | "false"
```

## 🚀 Como Usar

1. **Para Recolher**: Clique no ícone `X` no canto superior direito da sidebar
2. **Para Expandir**: Clique no ícone `☰` (menu) no canto superior direito da sidebar colapsada
3. **Navegação**: No modo colapsado, passe o mouse sobre os ícones para ver tooltips informativos
4. **Estado Preservado**: Sua preferência será lembrada entre sessões

## 🎯 Benefícios

- **Economia de Espaço**: Mais área disponível para conteúdo principal
- **Flexibilidade**: Usuário escolhe quando precisa de mais espaço
- **Produtividade**: Acesso rápido ainda disponível via ícones
- **Intuitividade**: Interface familiar e fácil de usar
- **Performance**: Estado leve e persistente

## 🔮 Melhorias Futuras Possíveis

- Atalho de teclado para toggle (ex: Ctrl+B)
- Auto-collapse em telas pequenas
- Diferentes tamanhos de collapse
- Gestos touch para dispositivos móveis