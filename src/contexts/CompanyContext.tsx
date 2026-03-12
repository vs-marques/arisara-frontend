/**
 * Caminho: src/contexts/CompanyContext.tsx
 * Descrição: Contexto para gerenciar a empresa atualmente selecionada pelo usuário
 * Versão: 1.0.0
 * Data: 2025-08-22
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { fetchWithAuthJson } from '@/lib/fetchWithAuth';

interface Company {
  id: string;
  name: string;
  domain?: string | null;
  plan: string;
  is_active: boolean;
  role?: string | null;
  role_display?: string | null;
  role_scope: 'global' | 'tenant';
  assigned_roles: string[];
}

interface CompanyContextType {
  currentCompany: Company | null;
  setCurrentCompany: (company: Company | null) => void;
  availableCompanies: Company[];
  setAvailableCompanies: (companies: Company[]) => void;
  isLoading: boolean;
  refreshCompanies: () => Promise<Company[]>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};

interface CompanyProviderProps {
  children: ReactNode;
}

export const CompanyProvider: React.FC<CompanyProviderProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [availableCompanies, setAvailableCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const STORAGE_KEY = 'nyoka_current_company';

  // Carregar empresa salva no localStorage e empresas disponíveis ao inicializar
  useEffect(() => {
    if (isAuthenticated && user) {
      // Carregar empresas disponíveis
      refreshCompanies();
    }
  }, [isAuthenticated, user]);

  // Verificar se deve carregar empresa salva após carregar empresas disponíveis
  useEffect(() => {
    if (isAuthenticated && user && availableCompanies.length > 0) {
      // Só carregar empresa salva se o usuário tiver apenas 1 empresa
      // Se tiver múltiplas empresas, deve passar pelo lobby
      const savedCompany = localStorage.getItem(STORAGE_KEY);
      if (savedCompany && availableCompanies.length === 1) {
        try {
          const company = JSON.parse(savedCompany);
          setCurrentCompany(company);
        } catch (error) {
          console.error("company_context.load_saved_error", { error: error instanceof Error ? error.message : String(error) });
          localStorage.removeItem(STORAGE_KEY);
        }
      } else if (availableCompanies.length > 1) {
        // Se tem múltiplas empresas, limpar empresa salva para forçar lobby
        localStorage.removeItem(STORAGE_KEY);
        setCurrentCompany(null);
      } else if (availableCompanies.length === 1) {
        // Se tem apenas 1 empresa, definir automaticamente
        setCurrentCompany(availableCompanies[0]);
      }
    } else if (isAuthenticated && user && availableCompanies.length === 0 && !user.is_superadmin) {
      console.warn("company_context.no_companies_available");
    }
  }, [availableCompanies, isAuthenticated, user?.id, user?.is_superadmin]);

  // Salvar empresa no localStorage quando mudar
  useEffect(() => {
    if (currentCompany) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentCompany));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [currentCompany, STORAGE_KEY]);

  const refreshCompanies = async (): Promise<Company[]> => {
    if (!user) return [];

    try {
      setIsLoading(true);

      let rawData: any = null;
      try {
        rawData = await fetchWithAuthJson('/auth/admin/companies');
      } catch (error) {
        console.error("company_context.admin_companies_error", { error: error instanceof Error ? error.message : String(error) });
      }

      let companiesPayload: any[] | null = null;
      if (rawData) {
        if (Array.isArray(rawData)) {
          companiesPayload = rawData;
        } else if (Array.isArray(rawData.companies)) {
          companiesPayload = rawData.companies;
        } else if (Array.isArray(rawData.organizations)) {
          companiesPayload = rawData.organizations;
        }
      }

      if (!companiesPayload) {
        try {
          const legacy = await fetchWithAuthJson('/auth/user/organizations');
          if (legacy && Array.isArray(legacy.organizations)) {
            companiesPayload = legacy.organizations;
          }
        } catch (fallbackError) {
          console.error("company_context.fallback_organizations_error", { error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError) });
        }
      }

      if (companiesPayload) {
        const mapped = companiesPayload.map((company: any) => ({
          id: company.id,
          name: company.name,
          domain: company.domain ?? company.domain_name ?? null,
          plan: company.plan ?? 'unknown',
          is_active: company.is_active !== undefined ? Boolean(company.is_active) : true,
          role: company.role ?? company.user_role ?? null,
          role_display: company.role_display ?? null,
          role_scope: company.role_scope === 'global' ? 'global' : 'tenant',
          assigned_roles: Array.isArray(company.assigned_roles)
            ? company.assigned_roles
            : Array.isArray(company.roles)
            ? company.roles
            : [],
        }));
        setAvailableCompanies(mapped);
        return mapped;
      } else {
        setAvailableCompanies([]);
      }
    } catch (error: any) {
      console.error("company_context.load_companies_error", { error: error instanceof Error ? error.message : String(error) });
      // Em caso de erro, definir lista vazia
      setAvailableCompanies([]);
      
      // Se for erro 401, pode ser problema de token
      if (error.status === 401) {
        console.warn("company_context.token_expired");
      }
    } finally {
      setIsLoading(false);
    }

    return [];
  };

  const handleSetCurrentCompany = (company: Company | null) => {
    setCurrentCompany(company);
    
    // Se estiver limpando a empresa, remover do localStorage
    if (!company) {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const value: CompanyContextType = {
    currentCompany,
    setCurrentCompany: handleSetCurrentCompany,
    availableCompanies,
    setAvailableCompanies,
    isLoading,
    refreshCompanies,
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
};
