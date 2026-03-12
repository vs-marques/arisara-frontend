// Caminho: src/utils/documentValidation.ts
// Descrição: Utilitários para validação de CPF e CNPJ
// Data: 2025-10-01
// Versão: 1.0.0
// Histórico de Modificações:
// - 2025-10-01: Criação inicial dos utilitários de validação
// - 2025-10-01: Suporte a CPF e CNPJ com algoritmos de validação
// - 2025-10-01: Formatação automática de documentos
// - 2025-10-01: Detecção automática de tipo de documento

/**
 * Utilitários para validação e formatação de CPF e CNPJ
 * Suporte completo para consumidor PJ no sistema
 */

export type DocumentType = 'cpf' | 'cnpj';

/**
 * Remove caracteres não numéricos do documento
 */
export const cleanDocument = (document: string): string => {
  return document.replace(/\D/g, '');
};

/**
 * Detecta o tipo de documento baseado no tamanho
 */
export const detectDocumentType = (document: string): DocumentType => {
  const cleaned = cleanDocument(document);
  return cleaned.length === 14 ? 'cnpj' : 'cpf';
};

/**
 * Formata CPF: 000.000.000-00
 */
export const formatCPF = (cpf: string): string => {
  const cleaned = cleanDocument(cpf);
  if (cleaned.length > 11) return cleaned.slice(0, 11);
  
  return cleaned
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2');
};

/**
 * Formata CNPJ: 00.000.000/0000-00
 */
export const formatCNPJ = (cnpj: string): string => {
  const cleaned = cleanDocument(cnpj);
  if (cleaned.length > 14) return cleaned.slice(0, 14);
  
  return cleaned
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})/, '$1-$2');
};

/**
 * Formata documento automaticamente baseado no tipo detectado
 */
export const formatDocument = (document: string): string => {
  const type = detectDocumentType(document);
  return type === 'cnpj' ? formatCNPJ(document) : formatCPF(document);
};

/**
 * Valida CPF usando algoritmo oficial
 */
export const validateCPF = (cpf: string): boolean => {
  const cleaned = cleanDocument(cpf);
  
  // Verifica se tem 11 dígitos
  if (cleaned.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  // Validação do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.charAt(9))) return false;
  
  // Validação do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.charAt(10))) return false;
  
  return true;
};

/**
 * Valida CNPJ usando algoritmo oficial
 */
export const validateCNPJ = (cnpj: string): boolean => {
  const cleaned = cleanDocument(cnpj);
  
  // Verifica se tem 14 dígitos
  if (cleaned.length !== 14) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  // Validação do primeiro dígito verificador
  let sum = 0;
  let weight = 5;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned.charAt(i)) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  let remainder = sum % 11;
  const firstDigit = remainder < 2 ? 0 : 11 - remainder;
  if (firstDigit !== parseInt(cleaned.charAt(12))) return false;
  
  // Validação do segundo dígito verificador
  sum = 0;
  weight = 6;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleaned.charAt(i)) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  remainder = sum % 11;
  const secondDigit = remainder < 2 ? 0 : 11 - remainder;
  if (secondDigit !== parseInt(cleaned.charAt(13))) return false;
  
  return true;
};

/**
 * Valida documento automaticamente baseado no tipo detectado
 */
export const validateDocument = (document: string): boolean => {
  const type = detectDocumentType(document);
  return type === 'cnpj' ? validateCNPJ(document) : validateCPF(document);
};

/**
 * Retorna informações completas sobre o documento
 */
export interface DocumentInfo {
  type: DocumentType;
  formatted: string;
  isValid: boolean;
  cleaned: string;
}

export const getDocumentInfo = (document: string): DocumentInfo => {
  const cleaned = cleanDocument(document);
  const type = detectDocumentType(document);
  const formatted = formatDocument(document);
  const isValid = validateDocument(document);
  
  return {
    type,
    formatted,
    isValid,
    cleaned
  };
};

/**
 * Mensagens de erro para validação
 */
export const getDocumentErrorMessage = (document: string): string | null => {
  const cleaned = cleanDocument(document);
  
  if (cleaned.length === 0) {
    return 'Documento é obrigatório';
  }
  
  if (cleaned.length < 11) {
    return 'Documento deve ter pelo menos 11 dígitos';
  }
  
  if (cleaned.length > 14) {
    return 'Documento deve ter no máximo 14 dígitos';
  }
  
  if (cleaned.length === 11 && !validateCPF(document)) {
    return 'CPF inválido';
  }
  
  if (cleaned.length === 14 && !validateCNPJ(document)) {
    return 'CNPJ inválido';
  }
  
  return null;
};
