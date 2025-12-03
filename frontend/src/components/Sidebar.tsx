import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Building2, ClipboardCopy, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { api, type Empresa, type Unidade } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useSidebar } from '@/hooks/useSidebar';

interface SidebarProps {
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const location = useLocation();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [unitItems, setUnitItems] = useState<Array<{ key: string; label: string; empresaId: number; unidadeId: number }>>([]);
  const [checkedSet, setCheckedSet] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('idms.sidebarChecklist');
      if (!raw) return new Set();
      const arr = JSON.parse(raw);
      return new Set(Array.isArray(arr) ? arr : []);
    } catch {
      return new Set();
    }
  });

  const navigation = [
    {
      name: 'Empresas',
      href: '/empresas',
      icon: Building2,
      description: 'Gerenciar empresas e unidades'
    }
  ];

  // Carrega todas as filiais (unidades) e ordena alfabeticamente
  useEffect(() => {
    const loadAll = async () => {
      try {
        setLoadingUnits(true);
        const empresas: Empresa[] = await api.listarEmpresas();
        const items: Array<{ key: string; label: string; empresaId: number; unidadeId: number }> = [];
        for (const emp of empresas) {
          try {
            const unidades: Unidade[] = await api.listarUnidades(emp.id);
            for (const und of unidades) {
              const label = `${emp.nome} / ${und.nome} - ${und.id_unidade}`;
              items.push({ key: `${emp.id}:${und.id}`, label, empresaId: emp.id, unidadeId: und.id });
            }
          } catch {}
        }
        items.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR', { sensitivity: 'base' }));
        setUnitItems(items);
      } catch {
        setUnitItems([]);
      } finally {
        setLoadingUnits(false);
      }
    };
    loadAll();
  }, []);

  // Persistência simples dos marcados
  useEffect(() => {
    try {
      localStorage.setItem('idms.sidebarChecklist', JSON.stringify(Array.from(checkedSet)));
    } catch {}
  }, [checkedSet]);

  const toggleCheck = (key: string) => {
    setCheckedSet(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const copySidebarChecklist = async () => {
    try {
      const lines: string[] = [];
      lines.push('Checklist de Filiais');
      lines.push(new Date().toISOString());
      lines.push('');
      unitItems.forEach(u => {
        const mark = checkedSet.has(u.key) ? 'x' : ' ';
        lines.push(`- [${mark}] ${u.label}`);
      });
      const text = lines.join('\n');
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      toast.success('Checklist copiado');
    } catch (e) {
      console.error(e);
      toast.error('Falha ao copiar checklist');
    }
  };

  const copySidebarChecklistTSV = async () => {
    try {
      const rows: string[] = [];
      rows.push(['Unidade', 'Marcado'].join('\t'));
      unitItems.forEach(u => {
        rows.push([u.label, checkedSet.has(u.key) ? 'x' : ''].join('\t'));
      });
      const tsv = rows.join('\r\n');
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(tsv);
      } else {
        const ta = document.createElement('textarea');
        ta.value = tsv;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      toast.success('Checklist (2 colunas) copiado');
    } catch (e) {
      console.error(e);
      toast.error('Falha ao copiar checklist');
    }
  };

  return (
    <div className={cn("flex flex-col bg-gradient-to-b from-slate-900/95 to-blue-950/95 backdrop-blur-xl border-r border-blue-400/20 shadow-2xl transition-all duration-500 ease-out overflow-hidden", 
      isCollapsed ? "w-16" : "w-56", 
      className
    )}>
      {/* Logo - Compacto com efeitos modernos */}
      <div className="p-4 border-b border-blue-400/20 bg-gradient-to-r from-transparent via-blue-900/20 to-transparent">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-2 shadow-lg shadow-blue-500/25 border border-blue-400/20 flex-shrink-0 hover:shadow-blue-500/40 hover:scale-105 transition-all duration-300">
            <span className="text-white font-bold text-sm tracking-tight">ID</span>
          </div>
          {!isCollapsed && (
            <div className="min-w-0 transition-all duration-500 ease-in-out">
              <h1 className="text-sm font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-300 bg-clip-text text-transparent tracking-wide">
                MANAGEMENT
              </h1>
              <p className="text-xs text-blue-300/70 font-medium">Sistema de Gerenciamento</p>
            </div>
          )}
        </div>
        
        {/* Botão de toggle - posicionado abaixo do logo */}
        <div className="mt-3 flex justify-center">
          <Button
            onClick={toggleSidebar}
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 hover:bg-blue-800/20 text-blue-300 hover:text-blue-100 rounded-md border border-blue-700/30 hover:border-blue-600/50 transition-all duration-300 ease-in-out hover:scale-105"
            title={isCollapsed ? "Expandir sidebar" : "Recolher sidebar"}
          >
            {isCollapsed ? <Menu className="h-3.5 w-3.5 transition-transform duration-300 ease-in-out" /> : <X className="h-3.5 w-3.5 transition-transform duration-300 ease-in-out" />}
          </Button>
        </div>
      </div>
      
      {/* Navegação - Compacta com efeitos modernos */}
      <nav className="flex-1 p-3 space-y-2">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <div key={item.name} className="relative group">
              <Link
                to={item.href}
                className={cn(
                  "flex items-center rounded-xl text-sm transition-all duration-300 ease-in-out group relative overflow-hidden backdrop-blur-sm",
                  isCollapsed ? "justify-center p-3" : "gap-3 px-3 py-3",
                  isActive
                    ? "bg-gradient-to-r from-blue-600/20 to-blue-500/10 text-blue-100 border border-blue-400/40 shadow-lg shadow-blue-900/20"
                    : "text-blue-200/80 hover:bg-gradient-to-r hover:from-blue-800/15 hover:to-blue-700/10 hover:text-blue-100 hover:border-blue-500/30 hover:shadow-md hover:shadow-blue-900/10 border border-transparent hover:-translate-y-0.5"
                )}
              >
                <item.icon className={cn(
                  "h-5 w-5 flex-shrink-0 transition-all duration-300 ease-in-out",
                  isActive ? "text-blue-300 drop-shadow-sm" : "text-blue-400/70 group-hover:text-blue-300 group-hover:scale-110"
                )} />
                {!isCollapsed && (
                  <div className="flex-1 min-w-0 transition-all duration-300 ease-in-out">
                    <div className="font-semibold truncate">{item.name}</div>
                    <div className="text-xs text-blue-300/60 truncate font-medium">{item.description}</div>
                  </div>
                )}
                
                {/* Highlight effect */}
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent opacity-50 animate-pulse"></div>
                )}
              </Link>
              
              {/* Tooltip para modo colapsado - Melhorado */}
              {isCollapsed && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-2 bg-slate-800/95 backdrop-blur-md text-white text-xs rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-300 ease-in-out whitespace-nowrap z-50 border border-blue-400/20 shadow-xl shadow-blue-900/20 transform group-hover:translate-x-2">
                  <div className="font-semibold text-blue-300">{item.name}</div>
                  <div className="text-slate-300 mt-0.5">{item.description}</div>
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800/95"></div>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Checklist de Filiais */}
      {!isCollapsed && (
        <div className="p-3 border-t border-blue-800/30">
          <div className="text-xs font-medium text-blue-200 mb-2">Checklist de Filiais</div>
          <div className="mb-2 flex justify-end gap-2">
            <Button
              onClick={copySidebarChecklist}
              variant="outline"
              size="sm"
              className="bg-blue-500/20 border-blue-500/40 text-blue-200 hover:bg-blue-500/30"
              title="Copiar lista com marcações (texto)"
            >
              <ClipboardCopy className="h-3.5 w-3.5" />
              <span className="ml-1">Copiar</span>
            </Button>
            <Button
              onClick={copySidebarChecklistTSV}
              variant="outline"
              size="sm"
              className="bg-blue-500/20 border-blue-500/40 text-blue-200 hover:bg-blue-500/30"
              title="Copiar em 2 colunas (Excel)"
            >
              <ClipboardCopy className="h-3.5 w-3.5" />
              <span className="ml-1">Excel</span>
            </Button>
          </div>
          <div className="text-[11px] text-blue-300/70 mb-2">
            Marque as unidades já processadas
          </div>
          <div className="rounded border border-blue-800/30 bg-white/5">
            <ScrollArea className="h-40">
              <div className="p-2 space-y-1">
                {loadingUnits && (
                  <div className="text-xs text-blue-300">Carregando...</div>
                )}
                {!loadingUnits && unitItems.length === 0 && (
                  <div className="text-xs text-blue-300">Nenhuma unidade</div>
                )}
                {unitItems.map((u) => (
                  <label key={u.key} className="flex items-center gap-2 text-xs text-blue-100/90 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="accent-blue-500 h-3.5 w-3.5"
                      checked={checkedSet.has(u.key)}
                      onChange={() => toggleCheck(u.key)}
                    />
                    <span className="truncate" title={u.label}>{u.label}</span>
                  </label>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}

      {/* Footer - Compacto */}
      <div className="p-3 border-t border-blue-800/30 text-xs text-blue-300/60 transition-all duration-300 ease-in-out">
        {isCollapsed ? (
          <div className="text-center transition-all duration-300 ease-in-out">
            <div className="text-blue-400/50 font-mono" title="v1.0.70">v1.0.70</div>
          </div>
        ) : (
          <div className="transition-all duration-300 ease-in-out">
            <div className="truncate">Sistema de Gerenciamento de IDs</div>
            <div className="text-blue-400/50 font-mono">v1.0.70</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;

