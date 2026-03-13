/**
 * API Configuration
 * Centraliza URLs e configurações de API
 */

// Base URL da API
// Prioriza VITE_API_URL, depois VITE_BACKEND_URL, depois localhost
export const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001';

// Endpoints
export const API_ENDPOINTS = {
  // Auth
  auth: {
    login: `${API_BASE_URL}/auth/admin/login`,
    me: `${API_BASE_URL}/auth/me`,
    refresh: `${API_BASE_URL}/auth/refresh`,
  },
  
  // AI Maturity
  aiMaturity: {
    current: (companyId: string, days?: number) => 
      `${API_BASE_URL}/analytics/ai-maturity/current/${companyId}${days ? `?days=${days}` : ''}`,
    evolution: (companyId: string, days?: number) => 
      `${API_BASE_URL}/analytics/ai-maturity/evolution/${companyId}${days ? `?days=${days}` : ''}`,
    heatmap: (companyId: string, days?: number) => 
      `${API_BASE_URL}/analytics/ai-maturity/heatmap/${companyId}${days ? `?days=${days}` : ''}`,
    domains: (companyId: string, days?: number) => 
      `${API_BASE_URL}/analytics/ai-maturity/domains/${companyId}${days ? `?days=${days}` : ''}`,
    report: (companyId: string) => `${API_BASE_URL}/analytics/ai-maturity/report/${companyId}`,
    adaptiveActions: (companyId: string, limit?: number) => 
      `${API_BASE_URL}/analytics/ai-maturity/adaptive-actions/${companyId}${limit ? `?limit=${limit}` : ''}`,
    learnedPatterns: (companyId: string) => 
      `${API_BASE_URL}/analytics/ai-maturity/learned-patterns/${companyId}`,
  },
  
  // Analytics
  analytics: {
    geo: {
      heatmap: (days?: number) =>
        `${API_BASE_URL}/analytics/geo/heatmap${days ? `?days=${days}` : ''}`,
      countries: (days?: number) =>
        `${API_BASE_URL}/analytics/geo/countries${days ? `?days=${days}` : ''}`,
    }
  },
  
  // Chat & Conversations
  chat: {
    history: (companyId: string, groupBySession?: boolean, limit?: number) => {
      const params = new URLSearchParams();
      if (groupBySession !== false) params.append('group_by_session', 'true');
      if (limit) params.append('limit', limit.toString());
      return `${API_BASE_URL}/chat/history/${companyId}${params.toString() ? `?${params.toString()}` : ''}`;
    },
    historyEnriched: (companyId: string, limit?: number) => {
      const params = new URLSearchParams();
      if (limit) params.append('limit', limit.toString());
      return `${API_BASE_URL}/chat/history/enriched/${companyId}${params.toString() ? `?${params.toString()}` : ''}`;
    },
    sessions: (companyId: string, status?: string, limit?: number) => {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (limit) params.append('limit', limit.toString());
      return `${API_BASE_URL}/chat/sessions/${companyId}${params.toString() ? `?${params.toString()}` : ''}`;
    },
    sessionMessages: (sessionId: string) => 
      `${API_BASE_URL}/chat/sessions/${sessionId}/messages`,
    /** Devolver conversa à IA / fila (paridade Nyoka) */
    sessionRelease: (sessionId: string) =>
      `${API_BASE_URL}/chat/sessions/${sessionId}/release`,
    /** Resumo da conversa (LLM) */
    sessionSummary: (sessionId: string) =>
      `${API_BASE_URL}/chat/sessions/${sessionId}/summary`,
  },

  // CRM (leads pipeline)
  crm: {
    leads: (search?: string, status?: string) => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (status) params.append('status', status);
      const q = params.toString();
      return `${API_BASE_URL}/api/v1/crm/leads${q ? `?${q}` : ''}`;
    },
    leadUpdate: (leadId: string) => `${API_BASE_URL}/api/v1/crm/leads/${leadId}`,
  },

  // Scheduler (Agenda)
  scheduler: {
    events: (fromDate?: string, toDate?: string) => {
      const params = new URLSearchParams();
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);
      const q = params.toString();
      return `${API_BASE_URL}/api/v1/scheduler/events${q ? `?${q}` : ''}`;
    },
    createEvent: () => `${API_BASE_URL}/api/v1/scheduler/events`,
    integrations: {
      status: () => `${API_BASE_URL}/api/v1/scheduler/integrations/status`,
      googleAuthorize: () => `${API_BASE_URL}/api/v1/scheduler/integrations/google/authorize`,
      googleSync: () => `${API_BASE_URL}/api/v1/scheduler/integrations/google/sync`,
      outlookAuthorize: () => `${API_BASE_URL}/api/v1/scheduler/integrations/outlook/authorize`,
      outlookSync: () => `${API_BASE_URL}/api/v1/scheduler/integrations/outlook/sync`,
      exportIcs: (fromDate?: string, toDate?: string) => {
        const params = new URLSearchParams();
        if (fromDate) params.append('from_date', fromDate);
        if (toDate) params.append('to_date', toDate);
        const q = params.toString();
        return `${API_BASE_URL}/api/v1/scheduler/events/export/ics${q ? `?${q}` : ''}`;
      },
    },
  },
  
  // Contacts
  contacts: {
    list: (companyId: string, search?: string) => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      return `${API_BASE_URL}/contacts/${companyId}${params.toString() ? `?${params.toString()}` : ''}`;
    },
    get: (contactId: string) => `${API_BASE_URL}/contacts/${contactId}`,
    create: () => `${API_BASE_URL}/contacts`,
    update: (contactId: string) => `${API_BASE_URL}/contacts/${contactId}`,
    delete: (contactId: string) => `${API_BASE_URL}/contacts/${contactId}`,
  },
  
  // Contact Imports
  contactImports: {
    list: (companyId: string) => `${API_BASE_URL}/contacts/imports/${companyId}`,
    get: (importId: string) => `${API_BASE_URL}/contacts/imports/${importId}`,
    googleAuthorize: (companyId: string) => `${API_BASE_URL}/contacts/imports/google/authorize`,
    googleCallback: () => `${API_BASE_URL}/contacts/imports/google/callback`,
    csv: (companyId: string) => `${API_BASE_URL}/contacts/imports/csv/${companyId}`,
    status: (importId: string) => `${API_BASE_URL}/contacts/imports/${importId}/status`,
  },
  
  // Dashboard
  dashboard: {
    stats: (companyId: string, days?: number) => 
      `${API_BASE_URL}/dashboard/stats/${companyId}${days ? `?days=${days}` : ''}`,
  },
  
  // AI Config
  aiConfig: {
    get: (companyId: string) => `${API_BASE_URL}/companies/${companyId}/ai-config`,
    update: (companyId: string) => `${API_BASE_URL}/companies/${companyId}/ai-config`,
  },
  
  // Search Analytics (via nyoka-core proxy)
  search: {
    analytics: (companyId: string, days?: number) => 
      `${API_BASE_URL}/api/v1/search/analytics?company_id=${companyId}${days ? `&days=${days}` : ''}`,
    usage: (companyId: string, days?: number) => 
      `${API_BASE_URL}/api/v1/search/analytics/usage?company_id=${companyId}${days ? `&days=${days}` : ''}`,
    trends: (companyId: string, days?: number) => 
      `${API_BASE_URL}/api/v1/search/analytics/trends?company_id=${companyId}${days ? `&days=${days}` : ''}`,
    performance: (companyId: string, days?: number) => 
      `${API_BASE_URL}/api/v1/search/analytics/performance?company_id=${companyId}${days ? `&days=${days}` : ''}`,
    insights: (companyId: string) => 
      `${API_BASE_URL}/api/v1/search/insights?company_id=${companyId}`,
    dashboardStats: (companyId: string, days?: number) => 
      `${API_BASE_URL}/api/v1/search/dashboard-stats?company_id=${companyId}${days ? `&days=${days}` : ''}`,
  },
  
  // Real-time Analytics (SSE)
  realtime: {
    metrics: (companyId: string) => 
      `${API_BASE_URL}/api/v1/realtime/metrics?company_id=${companyId}`,
    current: (companyId: string) => 
      `${API_BASE_URL}/api/v1/realtime/current?company_id=${companyId}`,
  },
  
  // Feedbacks
  feedbacks: {
    create: () => `${API_BASE_URL}/api/feedbacks`,
    public: (limit?: number) => 
      `${API_BASE_URL}/api/feedbacks/public${limit ? `?limit=${limit}` : ''}`,
    list: (approvedOnly?: boolean, rating?: number) => {
      const params = new URLSearchParams();
      if (approvedOnly !== undefined) params.append('approved_only', String(approvedOnly));
      if (rating !== undefined) params.append('rating', String(rating));
      return `${API_BASE_URL}/api/feedbacks${params.toString() ? `?${params.toString()}` : ''}`;
    },
  },
};

// Headers padrão
const TOKEN_KEYS = ['access_token', 'nyoka_token'];
const COMPANY_STORAGE_KEY = 'nyoka_current_company';

const getStoredToken = () => {
  for (const key of TOKEN_KEYS) {
    const value = localStorage.getItem(key);
    if (value) {
      if (key === 'nyoka_token') {
        localStorage.removeItem('nyoka_token');
        localStorage.setItem('access_token', value);
      }
      return value;
    }
  }
  return null;
};

const getSelectedCompanyId = () => {
  const raw = localStorage.getItem(COMPANY_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return typeof parsed?.id === 'string' && parsed.id.trim() ? parsed.id : null;
  } catch {
    return null;
  }
};

export const getAuthHeaders = (token?: string | null) => {
  const authToken = token || getStoredToken();
  const companyId = getSelectedCompanyId();
  
  return {
    'Content-Type': 'application/json',
    ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
    ...(companyId && { 'X-Tenant-ID': companyId }),
  };
};

