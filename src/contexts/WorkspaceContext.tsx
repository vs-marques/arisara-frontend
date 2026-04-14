/**
 * Contexto de workspace/tenant: seleção no lobby (PJ e PF) e tenant efetivo para APIs.
 */

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { fetchWithAuthJson } from '@/lib/fetchWithAuth';

export interface WorkspaceSummary {
  id: string;
  name: string;
  domain?: string | null;
  plan: string;
  is_active: boolean;
  role?: string | null;
  role_display?: string | null;
  role_scope: 'global' | 'tenant';
  assigned_roles: string[];
  tenant_kind?: 'organization' | 'individual' | null;
  workspace_id?: string | null;
  owner_user_id?: string | null;
  workspace_type?: 'individual' | 'organization' | null;
  created_at?: string | null;
  updated_at?: string | null;
  signup_review_status?: string | null;
}

export const WORKSPACE_STORAGE_KEY = 'nyoka_current_workspace';
const LEGACY_COMPANY_STORAGE_KEY = 'nyoka_current_company';

interface WorkspaceContextType {
  currentWorkspace: WorkspaceSummary | null;
  setCurrentWorkspace: (workspace: WorkspaceSummary | null) => void;
  availableWorkspaces: WorkspaceSummary[];
  setAvailableWorkspaces: (workspaces: WorkspaceSummary[]) => void;
  isLoading: boolean;
  refreshWorkspaces: () => Promise<WorkspaceSummary[]>;
  effectiveTenantId: string | null;
  isPFWorkspace: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};

interface WorkspaceProviderProps {
  children: ReactNode;
}

export const WorkspaceProvider: React.FC<WorkspaceProviderProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceSummary | null>(null);
  const [availableWorkspaces, setAvailableWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      refreshWorkspaces();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (isAuthenticated && user && availableWorkspaces.length > 0) {
      const savedRaw =
        localStorage.getItem(WORKSPACE_STORAGE_KEY) ?? localStorage.getItem(LEGACY_COMPANY_STORAGE_KEY);

      const syncSelected = (id: string | null | undefined) => {
        if (!id) return false;
        const match = availableWorkspaces.find((w) => w.id === id);
        if (!match) return false;
        setCurrentWorkspace(match);
        return true;
      };

      if (syncSelected(currentWorkspace?.id)) return;

      if (savedRaw) {
        try {
          const parsed = JSON.parse(savedRaw);
          if (syncSelected(parsed?.id)) {
            localStorage.setItem(WORKSPACE_STORAGE_KEY, savedRaw);
            localStorage.removeItem(LEGACY_COMPANY_STORAGE_KEY);
            return;
          }
        } catch (error) {
          console.error('workspace_context.load_saved_error', {
            error: error instanceof Error ? error.message : String(error),
          });
          localStorage.removeItem(WORKSPACE_STORAGE_KEY);
          localStorage.removeItem(LEGACY_COMPANY_STORAGE_KEY);
        }
      }

      if (availableWorkspaces.length === 1) {
        setCurrentWorkspace(availableWorkspaces[0]);
      } else {
        localStorage.removeItem(WORKSPACE_STORAGE_KEY);
        localStorage.removeItem(LEGACY_COMPANY_STORAGE_KEY);
        setCurrentWorkspace(null);
      }
    } else if (isAuthenticated && user && availableWorkspaces.length === 0 && !user.is_superadmin) {
      console.warn('workspace_context.no_workspaces_available');
    }
  }, [availableWorkspaces, currentWorkspace?.id, isAuthenticated, user?.user_id, user?.is_superadmin]);

  useEffect(() => {
    if (currentWorkspace) {
      const json = JSON.stringify(currentWorkspace);
      localStorage.setItem(WORKSPACE_STORAGE_KEY, json);
      localStorage.removeItem(LEGACY_COMPANY_STORAGE_KEY);
    } else {
      localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    }
  }, [currentWorkspace]);

  const refreshWorkspaces = async (): Promise<WorkspaceSummary[]> => {
    if (!user) return [];

    try {
      setIsLoading(true);

      let rawData: unknown = null;
      try {
        rawData = await fetchWithAuthJson('/auth/admin/workspaces');
      } catch (error) {
        console.error('workspace_context.admin_workspaces_error', {
          error: error instanceof Error ? error.message : String(error),
        });
      }

      let payload: unknown[] | null = null;
      if (rawData && typeof rawData === 'object') {
        const r = rawData as Record<string, unknown>;
        if (Array.isArray(rawData)) payload = rawData as unknown[];
        else if (Array.isArray(r.companies)) payload = r.companies as unknown[];
        else if (Array.isArray(r.organizations)) payload = r.organizations as unknown[];
      }

      if (!payload) {
        try {
          const legacy = await fetchWithAuthJson('/auth/user/organizations');
          const leg = legacy as { organizations?: unknown[] };
          if (legacy && Array.isArray(leg.organizations)) {
            payload = leg.organizations;
          }
        } catch (fallbackError) {
          console.error('workspace_context.fallback_organizations_error', {
            error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
          });
        }
      }

      if (payload) {
        const mapped: WorkspaceSummary[] = payload.map((row: any) => ({
          id: String(row.id),
          name: row.name,
          domain: row.domain ?? row.domain_name ?? null,
          plan: row.plan ?? 'unknown',
          is_active: row.is_active !== undefined ? Boolean(row.is_active) : true,
          role: row.role ?? row.user_role ?? null,
          role_display: row.role_display ?? null,
          role_scope: row.role_scope === 'global' ? 'global' : 'tenant',
          assigned_roles: Array.isArray(row.assigned_roles)
            ? row.assigned_roles
            : Array.isArray(row.roles)
              ? row.roles
              : [],
          tenant_kind:
            row.tenant_kind === 'individual' || row.tenant_kind === 'organization'
              ? row.tenant_kind
              : null,
          workspace_id: row.workspace_id != null ? String(row.workspace_id) : null,
          owner_user_id: row.owner_user_id != null ? String(row.owner_user_id) : null,
          workspace_type:
            row.workspace_type === 'individual' || row.workspace_type === 'organization'
              ? row.workspace_type
              : null,
          created_at: row.created_at != null ? String(row.created_at) : null,
          updated_at: row.updated_at != null ? String(row.updated_at) : null,
          signup_review_status:
            row.signup_review_status != null && row.signup_review_status !== ''
              ? String(row.signup_review_status)
              : null,
        }));
        setAvailableWorkspaces(mapped);
        return mapped;
      }
      setAvailableWorkspaces([]);
    } catch (error: unknown) {
      console.error('workspace_context.load_error', {
        error: error instanceof Error ? error.message : String(error),
      });
      setAvailableWorkspaces([]);
      const status = (error as { status?: number }).status;
      if (status === 401) {
        console.warn('workspace_context.token_expired');
      }
    } finally {
      setIsLoading(false);
    }

    return [];
  };

  const handleSetCurrentWorkspace = (workspace: WorkspaceSummary | null) => {
    setCurrentWorkspace(workspace);
    if (!workspace) {
      localStorage.removeItem(WORKSPACE_STORAGE_KEY);
      localStorage.removeItem(LEGACY_COMPANY_STORAGE_KEY);
    }
  };

  const userWorkspaceId = (user as unknown as { workspace_id?: string | null } | null)?.workspace_id ?? null;
  const effectiveTenantId = currentWorkspace?.id ?? userWorkspaceId ?? null;
  const isPFWorkspace =
    (!currentWorkspace && !!userWorkspaceId) ||
    currentWorkspace?.tenant_kind === 'individual' ||
    currentWorkspace?.workspace_type === 'individual';

  const value: WorkspaceContextType = {
    currentWorkspace,
    setCurrentWorkspace: handleSetCurrentWorkspace,
    availableWorkspaces,
    setAvailableWorkspaces,
    isLoading,
    refreshWorkspaces,
    effectiveTenantId,
    isPFWorkspace,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};
