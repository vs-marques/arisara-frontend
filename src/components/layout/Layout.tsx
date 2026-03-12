/**
 * Caminho: src/components/layout/Layout.tsx
 * Descrição: Layout principal da aplicação com sistema de tema dinâmico
 * Versão: 1.2 – 2025-01-27
 * Histórico de Modificações:
 * - 2025-01-27: Adicionado controles flutuantes de tema e idioma
 * - 2025-01-27: Implementado sistema de tema dinâmico
 * - 2025-07-24: Estrutura inicial de layout
 */

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import FloatingControls from '@/components/ui/floating-controls';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import SupportAgent from '@/components/SupportAgent';

interface Props {
  children: React.ReactNode;
}

const Layout: React.FC<Props> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const currentPage = location.pathname.replace('/', '') || 'dashboard';

  // Detectar se é mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handlePageChange = (page: string) => {
    navigate(`/${page}`);
  };

  const handleToggleCollapse = () => {
    if (isMobile) {
      setIsSidebarOpen(!isSidebarOpen);
    } else {
      setIsCollapsed(!isCollapsed);
    }
  };

  // Renderizar conteúdo (sempre via children do App.tsx)
  const renderContent = () => {
    return children || <div>Carregando...</div>;
  };

  return (
    <div className="flex h-screen relative overflow-hidden transition-all duration-500 ease-in-out">
      {/* Gradiente do modo claro - mesmo do login */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 via-blue-200 to-orange-200 dark:hidden" />
      
      {/* Gradiente do modo escuro - mesmo do login */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-[#252440] to-[#000020] hidden dark:block" />
      
      {/* Padrão de fundo específico - mesmo do login */}
      <div className="fixed inset-0 opacity-20 dark:opacity-15">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(99,102,241,0.08),transparent_50%),radial-gradient(circle_at_75%_75%,rgba(251,146,60,0.08),transparent_50%)] dark:bg-[radial-gradient(circle_at_25%_25%,rgba(30,58,138,0.2),transparent_50%),radial-gradient(circle_at_75%_75%,rgba(30,64,175,0.15),transparent_50%)]" />
      </div>

      <div className="relative z-20">
        <Sidebar 
          currentPage={currentPage} 
          onPageChange={handlePageChange}
          isCollapsed={isCollapsed}
          onToggleCollapse={handleToggleCollapse}
          isMobileOpen={isSidebarOpen}
        />
      </div>
      
      {/* Botão de toggle para mobile */}
      {isMobile && (
        <Button
          variant="outline"
          size="sm"
          className="fixed top-4 left-4 z-30 lg:hidden"
          onClick={handleToggleCollapse}
        >
          <Menu className="h-4 w-4" />
        </Button>
      )}
      
      <main className={`flex-1 overflow-y-auto p-4 transition-colors duration-300 relative z-10 ${
        isMobile ? 'pt-16' : ''
      }`}>
        {renderContent()}
      </main>
      <FloatingControls />
      <SupportAgent />
    </div>
  );
};

export default Layout;
