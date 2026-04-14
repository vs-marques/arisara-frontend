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
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Loader2 } from 'lucide-react';
import type { Role } from '@/types/User';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { currentWorkspace, isLoading: workspaceLoading, availableWorkspaces } = useWorkspace();

  console.debug("protected_route.state", {
    isAuthenticated,
    isLoading,
    hasUser: !!user,
    workspaceLoading,
    workspacesCount: availableWorkspaces.length,
    hasCurrentWorkspace: !!currentWorkspace
  });

  if (isLoading || workspaceLoading) {
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

  // Verificar se usuário precisa de workspace/tenant selecionado
  const rolesNeedingWorkspace = ['admin', 'provider', 'operador'];
  if (user && rolesNeedingWorkspace.includes(user.role)) {
    // Aguardar o WorkspaceContext terminar de carregar a lista
    if (availableWorkspaces.length === 0) {
      // Ainda não carregou os workspaces - aguardar
      console.debug("protected_route.waiting_workspaces");
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
            <p className="text-gray-600 dark:text-gray-300">Carregando workspaces...</p>
          </div>
        </div>
      );
    } else if (availableWorkspaces.length === 1 && !currentWorkspace) {
      // Tem 1 workspace mas ainda não definiu automaticamente - aguardar
      console.debug("protected_route.waiting_workspace_auto");
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
            <p className="text-gray-600 dark:text-gray-300">Configurando workspace...</p>
          </div>
        </div>
      );
    } else if (availableWorkspaces.length > 1 && !currentWorkspace) {
      // Tem múltiplos workspaces - redirecionar para seleção
      console.debug("protected_route.redirect_workspaces_multiple");
      return <Navigate to="/workspaces" replace />;
    } else if (availableWorkspaces.length === 0) {
      // Nenhum workspace disponível - redirecionar
      console.debug("protected_route.redirect_workspaces_none");
      return <Navigate to="/workspaces" replace />;
    }
    // Se chegou aqui, tem workspace selecionado ou é superadmin
  }

  console.debug("protected_route.render_children");
  return <>{children}</>;
};

export default ProtectedRoute;
