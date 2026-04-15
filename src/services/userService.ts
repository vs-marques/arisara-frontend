// Caminho: src/services/userService.ts
// Descrição: Serviço para consumo dos endpoints administrativos de usuários e RBAC.

import { fetchWithAuthJson } from '@/lib/fetchWithAuth';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export interface RoleResponse {
  id: string;
  name: string;
  description?: string | null;
  permissions: string[];
}

export interface UserRoleSummary {
  id: string;
  name: string;
  description?: string | null;
}

export interface AdminUserResponse {
  id: string;
  name?: string | null;
  username: string;
  email: string;
  mfa_enabled: boolean;
  is_active: boolean;
  is_blocked: boolean;
  last_login_at?: string | null;
  created_at?: string | null;
  roles: UserRoleSummary[];
  permissions: string[];
  company_id?: string | null;
  company?: {
    id: string;
    name: string;
    domain?: string | null;
    plan: string;
  } | null;
  role_names?: string[];
  primary_role?: string | null;
}

export interface InvitationResponse {
  id: string;
  email: string;
  user_type: string;
  document_type: string;
  status: 'pending' | 'sent' | 'accepted' | 'expired' | 'cancelled';
  expires_at: string;
  created_at: string;
  invited_by?: string;
  accepted_at?: string | null;
  metadata_json?: Record<string, unknown> | null;
}

export const getAdminUsers = async (options?: {
  companyId?: string | null;
  /** Superadmin: filtra por core.workspaces.id (tenant PF no lobby). */
  workspaceId?: string | null;
  includeCompany?: boolean;
}): Promise<AdminUserResponse[]> => {
  const url = new URL(`${BACKEND_URL}/admin/users`);
  if (options?.companyId) {
    url.searchParams.append('company_id', options.companyId);
  }
  if (options?.workspaceId) {
    url.searchParams.append('workspace_id', options.workspaceId);
  }
  if (options?.includeCompany) {
    url.searchParams.append('include_company', 'true');
  }

  return fetchWithAuthJson<AdminUserResponse[]>(url.toString());
};

export const getRoles = async (): Promise<RoleResponse[]> => {
  return fetchWithAuthJson<RoleResponse[]>(`${BACKEND_URL}/admin/roles`);
};

export const assignRole = async (
  userId: string,
  roleName: string,
  companyId?: string
): Promise<void> => {
  await fetchWithAuthJson(`${BACKEND_URL}/admin/users/${userId}/roles`, {
    method: 'POST',
    body: JSON.stringify({
      role_name: roleName,
      company_id: companyId ?? null,
    }),
  });
};

export const revokeRole = async (
  userId: string,
  roleName: string,
  companyId?: string
): Promise<void> => {
  const url = new URL(`${BACKEND_URL}/admin/users/${userId}/roles/${roleName}`);
  if (companyId) {
    url.searchParams.append('company_id', companyId);
  }

  await fetchWithAuthJson(url.toString(), {
    method: 'DELETE',
  });
};

export const getInvitations = async (): Promise<InvitationResponse[]> => {
  return fetchWithAuthJson<InvitationResponse[]>(`${BACKEND_URL}/admin/users/invitations`);
};

export const createInvitation = async (payload: {
  email: string;
  user_type: string;
  document_type: string;
  expires_in_hours?: number;
  metadata?: Record<string, unknown>;
}): Promise<InvitationResponse> => {
  return fetchWithAuthJson<InvitationResponse>(`${BACKEND_URL}/admin/users/invitations`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const resendInvitation = async (invitationId: string): Promise<InvitationResponse> => {
  return fetchWithAuthJson<InvitationResponse>(
    `${BACKEND_URL}/admin/users/invitations/${invitationId}/resend`,
    { method: 'POST' }
  );
};

export const cancelInvitation = async (invitationId: string): Promise<InvitationResponse> => {
  return fetchWithAuthJson<InvitationResponse>(
    `${BACKEND_URL}/admin/users/invitations/${invitationId}`,
    { method: 'DELETE' }
  );
};

