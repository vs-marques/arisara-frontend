// Caminho: src/services/sessionService.ts
// Descrição: Serviço para consumo dos endpoints de sessões ativas
// Data: 2025-12-17
// Versão: 1.0

import { fetchWithAuthJson } from "@/lib/fetchWithAuth";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

// ============================================================
// Interfaces
// ============================================================

export interface DeviceInfo {
  browser: string;
  os: string;
  device_type: string;
  display: string;
}

export interface SessionResponse {
  id: string;
  ip_address?: string | null;
  user_agent?: string | null;
  device: DeviceInfo;
  created_at?: string | null;
  last_used_at?: string | null;
  expires_at?: string | null;
  is_active: boolean;
}

export interface SessionListResponse {
  sessions: SessionResponse[];
  total: number;
}

export interface RevokeSessionResponse {
  message: string;
  session_id: string;
}

export interface RevokeAllResponse {
  message: string;
  sessions_revoked: number;
}

// ============================================================
// Serviços
// ============================================================

/**
 * Lista todas as sessões ativas do usuário
 */
export const listMySessions = async (): Promise<SessionListResponse> => {
  return fetchWithAuthJson<SessionListResponse>(`${BACKEND_URL}/api/sessions`);
};

/**
 * Revoga uma sessão específica
 */
export const revokeSession = async (
  sessionId: string
): Promise<RevokeSessionResponse> => {
  return fetchWithAuthJson<RevokeSessionResponse>(
    `${BACKEND_URL}/api/sessions/${sessionId}`,
    { method: "DELETE" }
  );
};

/**
 * Revoga todas as outras sessões, mantendo apenas a atual
 */
export const revokeAllOtherSessions = async (): Promise<RevokeAllResponse> => {
  return fetchWithAuthJson<RevokeAllResponse>(
    `${BACKEND_URL}/api/sessions/revoke-all`,
    { method: "POST" }
  );
};

