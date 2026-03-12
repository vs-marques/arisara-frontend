import { fetchWithAuthJson } from '@/lib/fetchWithAuth';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
const DISCOVERY_BASE_URL =
  import.meta.env.VITE_DISCOVERY_API_URL || BACKEND_URL;

const buildUrl = (path: string, params?: Record<string, unknown>) => {
  const url = new URL(`${DISCOVERY_BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }

      if (Array.isArray(value)) {
        value.forEach((item) => url.searchParams.append(key, String(item)));
        return;
      }

      url.searchParams.append(key, String(value));
    });
  }
  return url.toString();
};

export interface DiscoverySource {
  id: string;
  name: string;
  description?: string;
  base_url: string;
  auth_type: string;
  auth_config: Record<string, unknown>;
  origin_type: string;
  status: string;
  metadata: Record<string, unknown>;
  last_discovered_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DiscoveryEndpoint {
  id: string;
  source_id: string;
  name?: string;
  description?: string;
  method: string;
  path: string;
  origin: string;
  version: number;
  status: string;
  query_schema: Record<string, unknown>;
  request_schema: Record<string, unknown>;
  response_schema: Record<string, unknown>;
  headers_template: Array<Record<string, unknown>>;
  metadata: Record<string, unknown>;
  last_health_status?: string | null;
  last_health_checked_at?: string | null;
  approved_at?: string | null;
}

export interface DiscoverySourceCreatePayload {
  name: string;
  base_url: string;
  description?: string;
  auth_type?: string;
  auth_config?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface VaultSecret {
  id: string;
  reference: string;
  provider: string;
  description?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface VaultSecretCreatePayload {
  reference: string;
  provider: string;
  description?: string;
  secret_data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface ImportOpenApiPayload {
  openapi_url?: string;
  openapi_spec?: Record<string, unknown>;
}

export interface ApproveEndpointPayload {
  status: 'approved' | 'blocked' | 'deprecated';
  notes?: string;
}

export interface TestEndpointPayload {
  path_params?: Record<string, string>;
  query_params?: Record<string, string>;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}

export interface TestEndpointResponse {
  success: boolean;
  status_code?: number | null;
  latency_ms: number;
  response_body?: unknown;
  response_headers: Record<string, string>;
  error_message?: string | null;
  request_url: string;
  request_method: string;
}

export const discoveryService = {
  listSources: async (): Promise<DiscoverySource[]> => {
    return fetchWithAuthJson<DiscoverySource[]>(
      `${DISCOVERY_BASE_URL}/discovery/sources`,
    );
  },
  createSource: async (payload: DiscoverySourceCreatePayload): Promise<DiscoverySource> => {
    return fetchWithAuthJson<DiscoverySource>(`${DISCOVERY_BASE_URL}/discovery/sources`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  importOpenApi: async (sourceId: string, payload: ImportOpenApiPayload): Promise<DiscoveryEndpoint[]> => {
    return fetchWithAuthJson<DiscoveryEndpoint[]>(
      `${DISCOVERY_BASE_URL}/discovery/sources/${sourceId}/import/openapi`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  },
  listEndpoints: async (params?: { status?: string[]; origin?: string[]; source_id?: string }): Promise<DiscoveryEndpoint[]> => {
    return fetchWithAuthJson<DiscoveryEndpoint[]>(
      buildUrl('/discovery/endpoints', {
        status: params?.status,
        origin: params?.origin,
        source_id: params?.source_id,
      }),
    );
  },
  approveEndpoint: async (endpointId: string, payload: ApproveEndpointPayload): Promise<DiscoveryEndpoint> => {
    return fetchWithAuthJson<DiscoveryEndpoint>(
      `${DISCOVERY_BASE_URL}/discovery/endpoints/${endpointId}/approve`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  },
  listEndpointHealth: async (endpointId: string, limit = 20) => {
    return fetchWithAuthJson<Array<{
      id: string;
      checked_at: string;
      latency_ms?: number | null;
      status_code?: number | null;
      success: boolean;
      error_message?: string | null;
      response_size_bytes?: number | null;
      metadata: Record<string, unknown>;
    }>>(
      buildUrl(`/discovery/endpoints/${endpointId}/health`, { limit }),
    );
  },
  recordHealth: async (
    endpointId: string,
    payload: {
      latency_ms?: number;
      status_code?: number;
      success?: boolean;
      error_message?: string;
      response_size_bytes?: number;
      metadata?: Record<string, unknown>;
    }
  ) => {
    return fetchWithAuthJson(
      `${DISCOVERY_BASE_URL}/discovery/endpoints/${endpointId}/health`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  },
  testEndpoint: async (endpointId: string, payload: TestEndpointPayload): Promise<TestEndpointResponse> => {
    return fetchWithAuthJson<TestEndpointResponse>(
      `${DISCOVERY_BASE_URL}/discovery/endpoints/${endpointId}/test`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  },
};

export const vaultService = {
  listSecrets: async (provider?: string): Promise<VaultSecret[]> => {
    return fetchWithAuthJson<VaultSecret[]>(
      buildUrl('/vault/secrets', provider ? { provider } : undefined),
    );
  },
  createSecret: async (payload: VaultSecretCreatePayload): Promise<VaultSecret> => {
    return fetchWithAuthJson<VaultSecret>(`${DISCOVERY_BASE_URL}/vault/secrets`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  deleteSecret: async (reference: string): Promise<void> => {
    await fetchWithAuthJson(`${DISCOVERY_BASE_URL}/vault/secrets/${encodeURIComponent(reference)}`, {
      method: 'DELETE',
    });
  },
};

