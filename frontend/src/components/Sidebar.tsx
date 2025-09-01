import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Building2, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const location = useLocation();

  const navigation = [
    {
      name: 'Empresas',
      href: '/empresas',
      icon: Building2,
      description: 'Gerenciar empresas e unidades'
    },
    {
      name: 'Organização em Lote',
      href: '/batch-organize',
      icon: Package,
      description: 'Organizar múltiplos arquivos'
    }
  ];

  return (
    <div className={cn("flex flex-col w-56 bg-gradient-to-b from-slate-900/95 to-blue-950/95 backdrop-blur-sm border-r border-blue-800/30", className)}>
      {/* Logo - Compacto */}
      <div className="p-4 border-b border-blue-800/30">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-blue-700 to-blue-800 rounded-lg p-2 shadow-lg shadow-blue-700/25 border border-blue-600/30">
            <span className="text-white font-bold text-sm tracking-tight">ID</span>
          </div>
          <div>
            <h1 className="text-sm font-bold bg-gradient-to-r from-blue-400 to-blue-200 bg-clip-text text-transparent tracking-wide">
              MANAGEMENT
            </h1>
            <p className="text-xs text-blue-300/70">Sistema de Gerenciamento</p>
          </div>
        </div>
      </div>
      
      {/* Navegação - Compacta */}
      <nav className="flex-1 p-3 space-y-1">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 group",
                isActive
                  ? "bg-blue-700/30 text-blue-100 border border-blue-600/40 shadow-sm"
                  : "text-blue-200/80 hover:bg-blue-800/20 hover:text-blue-100 hover:border-blue-700/30 border border-transparent"
              )}
            >
              <item.icon className={cn(
                "h-4 w-4 flex-shrink-0 transition-colors",
                isActive ? "text-blue-300" : "text-blue-400/70 group-hover:text-blue-300"
              )} />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{item.name}</div>
                <div className="text-xs text-blue-300/50 truncate">{item.description}</div>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer - Compacto */}
      <div className="p-3 border-t border-blue-800/30 text-xs text-blue-300/60">
        <div className="truncate">Sistema de Gerenciamento de IDs</div>
        <div className="text-blue-400/50 font-mono">v0.4.1</div>
      </div>
    </div>
  );
};

export default Sidebar;
