/**
 * Caminho: src/lib/apiEndpoints.ts
 * Descrição: Utilitário para determinar endpoints baseado no role do usuário
 * Data: 2025-01-09
 * Versão: 1.0
 */

import { useAuth } from '@/contexts/AuthContext';

/**
 * Determina o endpoint correto para listar usuários baseado no role do usuário
 */
export const getUserListEndpoint = (): string => {
  // Em um contexto real, isso seria obtido do hook useAuth
  // Por enquanto, vamos usar uma função que pode ser chamada com o user
  return '/admin/users'; // fallback para superadmin
};

/**
 * Determina o endpoint correto baseado no role do usuário
 */
export const getApiEndpoint = (userRole: string, endpoint: string): string => {
  switch (userRole) {
    case 'superadmin':
      return endpoint; // Superadmin usa endpoints originais
    case 'operador':
      // Operadores usam endpoints específicos
      if (endpoint.includes('/admin/users')) {
        return endpoint.replace('/admin/users', '/operator/users');
      }
      if (endpoint.includes('/admin/companies/') && endpoint.includes('/operators')) {
        return endpoint.replace('/admin/companies/', '/operator/');
      }
      return endpoint;
    case 'provider':
      // Providers usam endpoints específicos (se implementados)
      if (endpoint.includes('/admin/users')) {
        return endpoint.replace('/admin/users', '/provider/users');
      }
      return endpoint;
    default:
      return endpoint;
  }
};

/**
 * Hook para obter endpoints baseados no usuário atual
 */
export const useApiEndpoints = () => {
  const { user } = useAuth();

  const getUserEndpoint = (baseEndpoint: string): string => {
    if (!user) return baseEndpoint;
    return getApiEndpoint(user.role, baseEndpoint);
  };

  const getOperatorsEndpoint = (companyId?: string): string => {
    if (!user) return '/admin/companies/operators';
    
    if (user.role === 'superadmin') {
      return companyId ? `/admin/companies/${companyId}/operators` : '/admin/companies/operators';
    } else if (user.role === 'operador') {
      return '/operator/operators';
    }
    
    return '/admin/companies/operators';
  };

  const getUsersListEndpoint = (): string => {
    if (!user) return '/admin/users';
    
    if (user.role === 'superadmin') {
      return '/admin/users';
    } else if (user.role === 'operador') {
      return '/operator/users';
    }
    
    return '/admin/users';
  };

  return {
    getUserEndpoint,
    getOperatorsEndpoint,
    getUsersListEndpoint
  };
};
