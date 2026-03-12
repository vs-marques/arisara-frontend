/**
 * Caminho: src/components/ProtectedRoute.tsx
 * Descrição: Componente para proteção de rotas com validação de autenticação e roles
 * Versão: 2.0 – 2025-01-27
 * Histórico de Modificações:
 * - 2025-01-27: Adicionada validação de roles específicos por rota
 * - 2025-07-21: Estrutura inicial de proteção de rotas
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { Loader2 } from 'lucide-react';
import type { Role } from '@/types/User';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { currentCompany, isLoading: companyLoading, availableCompanies } = useCompany();

  console.debug("protected_route.state", {
    isAuthenticated,
    isLoading,
    hasUser: !!user,
    companyLoading,
    companiesCount: availableCompanies.length,
    hasCurrentCompany: !!currentCompany
  });

  if (isLoading || companyLoading) {
    console.debug("protected_route.loading");
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden transition-all duration-500 ease-in-out">
        {/* Gradiente do modo claro */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 via-blue-200 to-orange-200 dark:hidden" />
        
        {/* Gradiente do modo escuro */}
        <div className="absolute inset-0 bg-gradient-to-br from-black via-[#252440] to-[#000020] hidden dark:block" />
        
        {/* Padrão de fundo */}
        <div className="fixed inset-0 opacity-20 dark:opacity-15">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(99,102,241,0.08),transparent_50%),radial-gradient(circle_at_75%_75%,rgba(251,146,60,0.08),transparent_50%)] dark:bg-[radial-gradient(circle_at_25%_25%,rgba(30,58,138,0.2),transparent_50%),radial-gradient(circle_at_75%_75%,rgba(30,64,175,0.15),transparent_50%)]" />
        </div>
        
        <div className="relative z-10 flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
          <p className="text-gray-600 dark:text-gray-300">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.debug("protected_route.redirect_login");
    return <Navigate to="/login" replace />;
  }

  // Se allowedRoles foi especificado, verifica se o usuário tem permissão
  if (allowedRoles && allowedRoles.length > 0 && user) {
    if (!allowedRoles.includes(user.role)) {
      console.debug("protected_route.forbidden", { userRole: user.role, allowedRoles });
      // Usuário não tem permissão - redireciona para dashboard
      return <Navigate to="/dashboard" replace />;
    }
  }

  // Verificar se usuário precisa de empresa selecionada
  const rolesNeedingCompany = ['admin', 'provider', 'operador'];
  if (user && rolesNeedingCompany.includes(user.role)) {
    // Aguardar o CompanyContext terminar de processar todas as empresas
    if (availableCompanies.length === 0) {
      // Ainda não carregou as empresas - aguardar
      console.debug("protected_route.waiting_companies");
      return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden transition-all duration-500 ease-in-out">
          {/* Gradiente do modo claro */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 via-blue-200 to-orange-200 dark:hidden" />
          
          {/* Gradiente do modo escuro */}
          <div className="absolute inset-0 bg-gradient-to-br from-black via-[#252440] to-[#000020] hidden dark:block" />
          
          {/* Padrão de fundo */}
          <div className="fixed inset-0 opacity-20 dark:opacity-15">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(99,102,241,0.08),transparent_50%),radial-gradient(circle_at_75%_75%,rgba(251,146,60,0.08),transparent_50%)] dark:bg-[radial-gradient(circle_at_25%_25%,rgba(30,58,138,0.2),transparent_50%),radial-gradient(circle_at_75%_75%,rgba(30,64,175,0.15),transparent_50%)]" />
          </div>
          
          <div className="relative z-10 flex flex-col items-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            <p className="text-gray-600 dark:text-gray-300">Carregando empresas...</p>
          </div>
        </div>
      );
    } else if (availableCompanies.length === 1 && !currentCompany) {
      // Tem 1 empresa mas ainda não definiu automaticamente - aguardar
      console.debug("protected_route.waiting_company_auto");
      return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden transition-all duration-500 ease-in-out">
          {/* Gradiente do modo claro */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 via-blue-200 to-orange-200 dark:hidden" />
          
          {/* Gradiente do modo escuro */}
          <div className="absolute inset-0 bg-gradient-to-br from-black via-[#252440] to-[#000020] hidden dark:block" />
          
          {/* Padrão de fundo */}
          <div className="fixed inset-0 opacity-20 dark:opacity-15">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(99,102,241,0.08),transparent_50%),radial-gradient(circle_at_75%_75%,rgba(251,146,60,0.08),transparent_50%)] dark:bg-[radial-gradient(circle_at_25%_25%,rgba(30,58,138,0.2),transparent_50%),radial-gradient(circle_at_75%_75%,rgba(30,64,175,0.15),transparent_50%)]" />
          </div>
          
          <div className="relative z-10 flex flex-col items-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            <p className="text-gray-600 dark:text-gray-300">Configurando empresa...</p>
          </div>
        </div>
      );
    } else if (availableCompanies.length > 1 && !currentCompany) {
      // Tem múltiplas empresas - redirecionar para seleção
      console.debug("protected_route.redirect_organizations_multiple");
      return <Navigate to="/organizations" replace />;
    } else if (availableCompanies.length === 0) {
      // Nenhuma empresa disponível - redirecionar
      console.debug("protected_route.redirect_organizations_none");
      return <Navigate to="/organizations" replace />;
    }
    // Se chegou aqui, tem empresa selecionada ou é superadmin
  }

  console.debug("protected_route.render_children");
  return <>{children}</>;
};

export default ProtectedRoute;
