/**
 * Caminho: src/lib/fetchWithAuth.ts
 * Descrição: Wrapper centralizado para fetch com suporte a token JWT armazenado no localStorage.
 * Versão: 1.0 – 2025-01-27
 * Histórico de Modificações:
 * - 2025-01-27: Criação inicial do utilitário fetchWithAuth com suporte ao header Authorization
 */

export interface FetchWithAuthOptions extends RequestInit {
  auth?: boolean;            // Se falso, não injeta o header Authorization
  tokenOverride?: string;    // Permite forçar o uso de um token específico
}

const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/+$/, '');

const resolveInput = (input: RequestInfo): RequestInfo => {
  if (typeof input === 'string') {
    if (/^https?:\/\//i.test(input)) {
      return input;
    }
    if (API_BASE_URL) {
      const normalized = input.startsWith('/') ? input.slice(1) : input;
      return `${API_BASE_URL}/${normalized}`;
    }
  }
  return input;
};

/**
 * fetchWithAuth – Wrapper para fetch com token JWT.
 * Injeta automaticamente o header Authorization com base no access_token salvo no localStorage,
 * ou no tokenOverride, se fornecido.
 */
const TOKEN_KEY = 'access_token';
const WORKSPACE_STORAGE_KEY = 'nyoka_current_workspace';
const LEGACY_COMPANY_STORAGE_KEY = 'nyoka_current_company';

const getSelectedCompanyId = (): string | null => {
  const raw =
    localStorage.getItem(WORKSPACE_STORAGE_KEY) ??
    localStorage.getItem(LEGACY_COMPANY_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    const companyId = parsed?.id;
    return typeof companyId === 'string' && companyId.trim() ? companyId : null;
  } catch {
    return null;
  }
};

export const fetchWithAuth = async (
  input: RequestInfo,
  options: FetchWithAuthOptions = {}
): Promise<Response> => {
  const token = options.tokenOverride || localStorage.getItem(TOKEN_KEY);
  const headers = new Headers(options.headers || {});
  const companyId = getSelectedCompanyId();

  if (options.auth !== false && token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (options.auth !== false && companyId) {
    headers.set('X-Tenant-ID', companyId);
  }

  return fetch(resolveInput(input), {
    ...options,
    headers,
  });
};

/**
 * fetchWithAuthJson – Wrapper que além de usar fetchWithAuth,
 * já realiza o parse do JSON e lança erro caso response não esteja ok.
 * Intercepta 401 para limpar token e facilitar redirecionamento.
 */
export const fetchWithAuthJson = async <T = any>(
  input: RequestInfo,
  options: FetchWithAuthOptions = {}
): Promise<T> => {
  // Garantir que o Content-Type seja application/json quando há body
  const headers = new Headers(options.headers || {});
  if (options.body && typeof options.body === 'string') {
    try {
      JSON.parse(options.body);
      headers.set('Content-Type', 'application/json');
    } catch (e) {
      // Se não for JSON válido, não define o Content-Type
    }
  }
  
  const response = await fetchWithAuth(input, {
    ...options,
    headers
  });

  const contentType = response.headers.get('Content-Type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('pontua_user');
      console.warn("auth.token_expired_logout");
      // Redirecionar para login
      window.location.href = '/login';
    }

    const errorMessage =
      (data && data.detail) ||
      response.statusText ||
      `Erro ${response.status} na requisição`;

    const error = new Error(errorMessage);
    (error as any).detail = data?.detail;
    (error as any).status = response.status;
    throw error;
  }

  return data as T;
};

/**
 * fetchWithAuthForm – Wrapper para upload de arquivos com FormData.
 * Não define Content-Type para permitir que o browser defina automaticamente com boundary.
 */
export const fetchWithAuthForm = async <T = any>(
  input: RequestInfo,
  formData: FormData,
  options: FetchWithAuthOptions = {}
): Promise<T> => {
  const token = options.tokenOverride || localStorage.getItem(TOKEN_KEY);
  const companyId = getSelectedCompanyId();
  const headers = new Headers();

  if (options.auth !== false && token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (options.auth !== false && companyId) {
    headers.set('X-Tenant-ID', companyId);
  }

  const response = await fetch(resolveInput(input), {
    ...options,
    method: options.method || 'POST',
    headers,
    body: formData,
  });

  const contentType = response.headers.get('Content-Type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('pontua_user');
      console.warn("auth.token_expired_logout");
      // Redirecionar para login
      window.location.href = '/login';
    }

    const errorMessage =
      (data && data.detail) ||
      response.statusText ||
      `Erro ${response.status} na requisição`;

    throw new Error(errorMessage);
  }

  return data as T;};
