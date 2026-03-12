// Caminho: src/services/profileService.ts
// Descrição: Serviço para consumo dos endpoints de perfil de usuários
// Data: 2025-12-17
// Versão: 1.0

import { fetchWithAuthJson, fetchWithAuthForm } from "@/lib/fetchWithAuth";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

// ============================================================
// Interfaces
// ============================================================

export interface CompanyInfo {
  id: string;
  name: string;
  cnpj: string;
  domain?: string | null;
  plan: string;
}

export interface ProfileResponse {
  id: string;
  username: string;
  email: string;
  name?: string | null;
  cpf?: string | null;
  birth_date?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  mfa_enabled: boolean;
  is_active: boolean;
  is_blocked: boolean;
  company_id?: string | null;
  company?: CompanyInfo | null;
  last_login_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  birth_date_locked: boolean;
}

export interface UpdateProfileRequest {
  phone?: string;
}

export interface RequestEmailChangeRequest {
  new_email: string;
}

export interface RequestEmailChangeResponse {
  message: string;
  new_email: string;
}

export interface VerifyEmailChangeRequest {
  new_email: string;
  verification_code: string;
}

export interface UpdateBirthDateRequest {
  birth_date: string; // YYYY-MM-DD
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface ToggleMFARequest {
  enabled: boolean;
}

export interface AvatarUploadResponse {
  avatar_url: string;
  message: string;
}

// ============================================================
// Serviços
// ============================================================

/**
 * Busca o perfil completo do usuário autenticado
 */
export const getMyProfile = async (): Promise<ProfileResponse> => {
  return fetchWithAuthJson<ProfileResponse>(`${BACKEND_URL}/api/profile/me`);
};

/**
 * Atualiza dados editáveis do perfil (apenas telefone)
 * NOTA: Para alterar email, use requestEmailChange + verifyEmailChange
 */
export const updateMyProfile = async (
  data: UpdateProfileRequest
): Promise<ProfileResponse> => {
  return fetchWithAuthJson<ProfileResponse>(`${BACKEND_URL}/api/profile/me`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
};

/**
 * Solicita mudança de email enviando código MFA para o novo email
 */
export const requestEmailChange = async (
  newEmail: string
): Promise<RequestEmailChangeResponse> => {
  return fetchWithAuthJson<RequestEmailChangeResponse>(
    `${BACKEND_URL}/api/profile/request-email-change`,
    {
      method: "POST",
      body: JSON.stringify({ new_email: newEmail }),
    }
  );
};

/**
 * Verifica código MFA e completa a mudança de email
 */
export const verifyEmailChange = async (
  newEmail: string,
  verificationCode: string
): Promise<ProfileResponse> => {
  return fetchWithAuthJson<ProfileResponse>(
    `${BACKEND_URL}/api/profile/verify-email-change`,
    {
      method: "POST",
      body: JSON.stringify({
        new_email: newEmail,
        verification_code: verificationCode,
      }),
    }
  );
};

/**
 * Atualiza data de nascimento (apenas uma vez)
 */
export const updateBirthDate = async (
  birth_date: string
): Promise<ProfileResponse> => {
  return fetchWithAuthJson<ProfileResponse>(
    `${BACKEND_URL}/api/profile/birth-date`,
    {
      method: "PATCH",
      body: JSON.stringify({ birth_date }),
    }
  );
};

/**
 * Altera a senha do usuário
 */
export const changePassword = async (
  data: ChangePasswordRequest
): Promise<{ message: string }> => {
  return fetchWithAuthJson<{ message: string }>(
    `${BACKEND_URL}/api/profile/password`,
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
};

/**
 * Ativa ou desativa MFA
 */
export const toggleMFA = async (enabled: boolean): Promise<ProfileResponse> => {
  return fetchWithAuthJson<ProfileResponse>(`${BACKEND_URL}/api/profile/mfa`, {
    method: "PATCH",
    body: JSON.stringify({ enabled }),
  });
};

/**
 * Faz upload do avatar do usuário
 */
export const uploadAvatar = async (
  file: File
): Promise<AvatarUploadResponse> => {
  const formData = new FormData();
  formData.append("file", file);

  return fetchWithAuthForm<AvatarUploadResponse>(
    `${BACKEND_URL}/api/profile/avatar`,
    formData,
    { method: "POST" }
  );
};
