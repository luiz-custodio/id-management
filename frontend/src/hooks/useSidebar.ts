import { useState, useEffect } from 'react';

export const useSidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('idms.sidebarCollapsed');
      // Se não há preferência salva, padrão é retraído (true)
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true; // Padrão retraído
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('idms.sidebarCollapsed', isCollapsed.toString());
    } catch {
      // Ignora erros de localStorage
    }
  }, [isCollapsed]);

  const toggleSidebar = () => {
    setIsCollapsed(prev => !prev);
  };

  return {
    isCollapsed,
    toggleSidebar,
  };
};