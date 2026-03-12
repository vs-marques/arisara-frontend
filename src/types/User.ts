export type Role = 'consumer' | 'provider' | 'supplier' | 'superadmin' | 'operador';

export interface Organization {
  id: string;
  name: string;
}

export interface AppUser {
  id: string;
  email: string;
  username: string;
  external_id?: string;
  mfa_enabled: boolean;
  is_blocked: boolean;
  is_active: boolean;
  status: string;
  profile_id: string | null;
  // Profile data (from person_profiles table)
  full_name?: string;
  document?: string;
  document_type?: 'cpf' | 'cnpj';
  phone_number?: string;
  birth_date?: string;
  role: Role;
  organizations?: Organization[];
}

// Interface para cadastro de consumidor individual (PF ou PJ)
export interface ConsumerSignup {
  full_name: string;
  birth_date: string;
  cpf: string; // CPF ou CNPJ (será validado no backend)
  email: string;
  password: string;
  zipcode: string;
  number: string;
  complement?: string;
  phone_number: string;
  user_type: 'consumer';
}
