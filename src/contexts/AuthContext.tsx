/**
 * Caminho: src/contexts/AuthContext.tsx
 * Descrição: Contexto de autenticação da plataforma Arisara (backend Nyoka)
 * Versão: 1.0 – 2025-11-02
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { isTokenExpired } from '@/lib/utils';

interface User {
  user_id: string;
  username: string;
  email: string;
  company_id?: string | null;
  mfa_enabled: boolean;
  primary_role?: string | null;
  role_display?: string | null;
  role?: string | null;
  roles: string[];
  permissions: string[];
  is_superadmin: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<LoginResult>;
  verifyMfa: (email: string, code: string) => Promise<User | null>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
  token: string | null;
}

interface LoginResult {
  success: boolean;
  requiresMfa: boolean;
  email?: string;
  message?: string;
  user?: User;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
const TOKEN_KEY = 'access_token';
const USER_DATA_KEY = 'nyoka_user';
const MOCK_AUTH = import.meta.env.VITE_MOCK_AUTH === 'true';

/** JWT mock com exp em 2038 (não expira em dev). */
const MOCK_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJtb2NrLXVzZXIiLCJleHAiOjIxNDc0ODM2NDd9.mock';

const createMockUser = (email: string): User => ({
  user_id: 'mock-user-id',
  username: email.split('@')[0] || 'dev',
  email,
  company_id: 'mock-company-id',
  mfa_enabled: false,
  primary_role: 'admin',
  role_display: 'Admin',
  role: 'admin',
  roles: ['admin', 'company_admin'],
  permissions: [
    'users:view', 'users:invite', 'users:manage_roles', 'users:manage_sessions', 'users:view_sessions',
    'chat:view', 'chat:assume', 'chat:end', 'analytics:view', 'documents:manage', 'settings:edit',
    'use_api', 'view_integrations', 'view_logs', 'view_companies', 'clear_memory',
  ],
  is_superadmin: false,
});

const coerceIsSuperadmin = (payload: {
  is_superadmin?: boolean;
  roles?: string[];
  company_id?: string | null;
}) => {
  if (typeof payload.is_superadmin === 'boolean' && payload.is_superadmin) {
    return true;
  }
  if (Array.isArray(payload.roles) && payload.roles.includes('superadmin')) {
    // Consider global superadmin when sem company vinculado
    if (!payload.company_id) {
      return true;
    }
  }
  return Boolean(payload.is_superadmin);
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  const isAuthenticated = !isLoading && !!user;

  // Inicialização: verificar token existente
  useEffect(() => {
    // Limpa eventual chave legacy
    localStorage.removeItem('nyoka_token');

    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_DATA_KEY);

      if (storedToken && storedUser) {
        if (!isTokenExpired(storedToken)) {
          try {
            const userData = JSON.parse(storedUser) as Partial<User>;
            const fallbackRole = userData.role ?? userData.primary_role ?? null;
            setUser({
              user_id: userData.user_id ?? '',
              username: userData.username ?? '',
              email: userData.email ?? '',
              company_id: userData.company_id ?? null,
              mfa_enabled: Boolean(userData.mfa_enabled),
              primary_role: userData.primary_role ?? fallbackRole,
              role_display: userData.role_display ?? null,
              role: fallbackRole,
              roles: Array.isArray(userData.roles) ? userData.roles : [],
              permissions: Array.isArray(userData.permissions) ? userData.permissions : [],
              is_superadmin: coerceIsSuperadmin({
                is_superadmin: userData.is_superadmin,
                roles: userData.roles,
                company_id: userData.company_id,
              }),
            });
            setToken(storedToken);
            // Garantir migração para a chave nova
            localStorage.setItem(TOKEN_KEY, storedToken);
          } catch (error) {
            console.error("auth.load_user_error", { error: error instanceof Error ? error.message : String(error) });
            localStorage.removeItem(USER_DATA_KEY);
            localStorage.removeItem(TOKEN_KEY);
          }
        } else {
          localStorage.removeItem(USER_DATA_KEY);
          localStorage.removeItem(TOKEN_KEY);
        }
      }
    
    setIsLoading(false);
  }, []);

  // Verificação periódica de expiração do token
  useEffect(() => {
    if (!token) return;

    const checkTokenExpiration = () => {
      if (isTokenExpired(token)) {
        if (window.location.pathname !== '/login') {
          setUser(null);
          setToken(null);
          localStorage.removeItem(USER_DATA_KEY);
          localStorage.removeItem(TOKEN_KEY);
          window.location.href = '/login';
        }
      }
    };

    const interval = setInterval(checkTokenExpiration, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const login = async (email: string, password: string): Promise<LoginResult> => {
    setIsLoading(true);

    try {
      if (MOCK_AUTH) {
        const normalizedUser = createMockUser(email || 'dev@arisara.com');
        localStorage.setItem(TOKEN_KEY, MOCK_TOKEN);
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(normalizedUser));
        setToken(MOCK_TOKEN);
        setUser(normalizedUser);
        setIsLoading(false);
        return { success: true, requiresMfa: false, user: normalizedUser };
      }

      const response = await fetch(`${BACKEND_URL}/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Erro ao fazer login');
      }

      const data = await response.json();

      if (data.requires_mfa) {
        return {
          success: false,
          requiresMfa: true,
          email: data.email ?? email,
          message: data.message,
        };
      }

      if (!data.access_token) {
        throw new Error('Resposta inválida do servidor de autenticação');
      }

      const normalizedUser: User = {
        user_id: data.user_id,
        username: data.username,
        email: data.email,
        company_id: data.company_id,
        mfa_enabled: data.mfa_enabled,
        primary_role: data.primary_role ?? null,
        role_display: data.role_display ?? null,
        role: data.primary_role ?? null,
        roles: Array.isArray(data.roles) ? data.roles : [],
        permissions: Array.isArray(data.permissions) ? data.permissions : [],
        is_superadmin: coerceIsSuperadmin({
          is_superadmin: data.is_superadmin,
          roles: data.roles,
          company_id: data.company_id,
        }),
      };

      // Salvar token e dados do usuário
      localStorage.setItem(TOKEN_KEY, data.access_token);
      localStorage.setItem(USER_DATA_KEY, JSON.stringify(normalizedUser));

      setToken(data.access_token);
      setUser(normalizedUser);

      return {
        success: true,
        requiresMfa: false,
        user: normalizedUser,
      };
    } catch (err: any) {
      console.error("auth.login_error", { error: err instanceof Error ? err.message : String(err) });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(USER_DATA_KEY);
    localStorage.removeItem(TOKEN_KEY);
  };

  const verifyMfa = async (email: string, code: string): Promise<User | null> => {
    setIsLoading(true);

    try {
      if (MOCK_AUTH) {
        const normalizedUser = createMockUser(email || 'dev@arisara.com');
        localStorage.setItem(TOKEN_KEY, MOCK_TOKEN);
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(normalizedUser));
        setToken(MOCK_TOKEN);
        setUser(normalizedUser);
        setIsLoading(false);
        return normalizedUser;
      }

      const response = await fetch(`${BACKEND_URL}/auth/admin/mfa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Código inválido ou expirado');
      }

      if (!data.access_token) {
        throw new Error('Resposta inválida do servidor de autenticação');
      }

      const normalizedUser: User = {
        user_id: data.user_id,
        username: data.username,
        email: data.email,
        company_id: data.company_id,
        mfa_enabled: data.mfa_enabled,
        primary_role: data.primary_role ?? null,
        role_display: data.role_display ?? null,
        role: data.primary_role ?? null,
        roles: Array.isArray(data.roles) ? data.roles : [],
        permissions: Array.isArray(data.permissions) ? data.permissions : [],
        is_superadmin: coerceIsSuperadmin({
          is_superadmin: data.is_superadmin,
          roles: data.roles,
          company_id: data.company_id,
        }),
      };

      localStorage.setItem(TOKEN_KEY, data.access_token);
      localStorage.setItem(USER_DATA_KEY, JSON.stringify(normalizedUser));

      setToken(data.access_token);
      setUser(normalizedUser);

      return normalizedUser;
    } catch (err: any) {
      console.error("auth.mfa_verify_error", { error: err instanceof Error ? err.message : String(err) });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, login, verifyMfa, logout, isLoading, isAuthenticated, token }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};