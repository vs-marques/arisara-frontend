// src/lib/api.ts
import axios from 'axios';
import { fetchWithAuthJson } from './fetchWithAuth';

// Força HTTPS em produção para evitar Mixed Content errors
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const testBackendConnection = async () => {
  // console.log('[DEBUG] Testando conexão com backend');
  try {
    const response = await fetchWithAuthJson(`${BACKEND_URL}/auth/test`);
    // console.log('[DEBUG] Teste backend:', response);
    return response;
  } catch (error) {
    // console.error('[DEBUG] Erro no teste backend:', error);
    throw error;
  }
};

export const getUserOrganizations = async () => {
  // console.log('[DEBUG] Chamando getUserOrganizations');
  // console.log('[DEBUG] URL:', `${BACKEND_URL}/auth/user/organizations`);
  try {
    const response = await fetchWithAuthJson(`${BACKEND_URL}/auth/user/organizations`);
    // console.log('[DEBUG] Resposta da API:', response);
    return response;
  } catch (error) {
    // console.log('[DEBUG] Erro na requisição:', error);
    throw error;
  }
};

export const getAllCompanies = async () => {
  // console.log('[DEBUG] Chamando getAllCompanies');
  // console.log('[DEBUG] URL:', `${BACKEND_URL}/auth/admin/companies`);
  try {
    const response = await fetchWithAuthJson(`${BACKEND_URL}/auth/admin/companies`);
    // console.log('[DEBUG] Resposta da API:', response);
    return response;
  } catch (error) {
    // console.log('[DEBUG] Erro na requisição:', error);
    throw error;
  }
};
