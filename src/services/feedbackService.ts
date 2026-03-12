import { API_ENDPOINTS, getAuthHeaders } from '@/config/api';

export interface FeedbackCreate {
  name: string;
  role?: string;
  text: string;
  rating: number;
}

export interface FeedbackResponse {
  id: string;
  user_id: string;
  name: string;
  role?: string;
  text: string;
  rating: number;
  company_id?: string;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

export interface FeedbackPublicResponse {
  id: string;
  name: string;
  role?: string;
  text: string;
  rating: number;
  created_at: string;
}

/**
 * Cria um novo feedback/testimonial
 */
export async function createFeedback(data: FeedbackCreate): Promise<FeedbackResponse> {
  const response = await fetch(API_ENDPOINTS.feedbacks.create(), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erro ao criar feedback' }));
    throw new Error(error.detail || 'Erro ao criar feedback');
  }

  return response.json();
}

/**
 * Busca feedbacks públicos (aprovados com rating = 5)
 */
export async function getPublicFeedbacks(limit: number = 50): Promise<FeedbackPublicResponse[]> {
  const response = await fetch(API_ENDPOINTS.feedbacks.public(limit), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erro ao buscar feedbacks' }));
    throw new Error(error.detail || 'Erro ao buscar feedbacks');
  }

  return response.json();
}

/**
 * Lista feedbacks do usuário autenticado
 */
export async function getFeedbacks(
  approvedOnly?: boolean,
  rating?: number
): Promise<FeedbackResponse[]> {
  const response = await fetch(API_ENDPOINTS.feedbacks.list(approvedOnly, rating), {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erro ao buscar feedbacks' }));
    throw new Error(error.detail || 'Erro ao buscar feedbacks');
  }

  return response.json();
}

