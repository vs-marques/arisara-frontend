import { fetchWithAuthJson } from "@/lib/fetchWithAuth";

export interface WabaSignupSessionResponse {
  state: string;
  signup_url: string;
  expires_at: string;
  verify_token?: string | null;
}

export interface EvolutionCreateInstanceRequest {
  company_id?: string | null;
  instance_name: string;
  number?: string | null;
  webhook_url?: string | null;
}

export interface EvolutionCreateInstanceResponse {
  instance_name: string;
  instance_id: string;
  qr_code: string | null;
  status: string;
  message: string;
}

export interface EvolutionStatusResponse {
  status: string;
  phone_number: string | null;
  connected_at: string | null;
}

export interface EvolutionQRCodeResponse {
  qr_code: string;
  instance_name: string;
}

export interface EvolutionDeleteResponse {
  status: string;
  message: string;
}

export interface TwilioSignupRequest {
  company_id?: string | null;
  account_sid: string;
  auth_token: string;
}

export interface TwilioSignupResponse {
  status: string;
  message: string;
  company_id: string;
  account_sid: string;
}

export interface TwilioWhatsAppNumberRequest {
  company_id?: string | null;
  whatsapp_number: string;
  display_name?: string | null;
  description?: string | null;
}

export interface TwilioWhatsAppNumberResponse {
  id: string;
  company_id: string;
  whatsapp_number: string;
  display_name?: string | null;
  description?: string | null;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  verified_at?: string | null;
}

export interface TwilioAvailableNumberResponse {
  phone_number: string;
  whatsapp_number: string;
  friendly_name: string;
  sid: string;
  capabilities: Record<string, any>;
  date_created?: string | null;
}

export interface TwilioWhatsAppProfileRequest {
  company_id?: string | null;
  whatsapp_number: string;
  display_name?: string | null;
  description?: string | null;
  category?: string | null;
  website?: string | null;
  address?: string | null;
  email?: string | null;
  profile_image_url?: string | null;
}

export interface TwilioWhatsAppProfileResponse {
  whatsapp_number: string;
  display_name?: string | null;
  description?: string | null;
  category?: string | null;
  website?: string | null;
  address?: string | null;
  email?: string | null;
  profile_image_url?: string | null;
  status: string;
  message: string;
}

export class IntegrationService {
  // WABA (Meta) Methods
  static async createWabaSignupSession(
    companyId?: string | null
  ): Promise<WabaSignupSessionResponse> {
    const payload: Record<string, string | null> = {};
    if (companyId) {
      payload.company_id = companyId;
    }
    return fetchWithAuthJson<WabaSignupSessionResponse>(
      "/integrations/waba/signup-session",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  }

  // Twilio Methods
  static async createTwilioSignup(
    data: TwilioSignupRequest
  ): Promise<TwilioSignupResponse> {
    return fetchWithAuthJson<TwilioSignupResponse>(
      "/integrations/twilio/signup",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  static async addTwilioWhatsAppNumber(
    data: TwilioWhatsAppNumberRequest
  ): Promise<TwilioWhatsAppNumberResponse> {
    return fetchWithAuthJson<TwilioWhatsAppNumberResponse>(
      "/integrations/twilio/numbers",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  static async listTwilioWhatsAppNumbers(
    companyId?: string | null,
    includeInactive = false
  ): Promise<TwilioWhatsAppNumberResponse[]> {
    const params = new URLSearchParams();
    if (companyId) {
      params.append("company_id", companyId);
    }
    if (includeInactive) {
      params.append("include_inactive", "true");
    }
    const query = params.toString();
    return fetchWithAuthJson<TwilioWhatsAppNumberResponse[]>(
      `/integrations/twilio/numbers${query ? `?${query}` : ""}`,
      {
        method: "GET",
      }
    );
  }

  static async removeTwilioWhatsAppNumber(
    numberId: string,
    companyId?: string | null
  ): Promise<void> {
    const params = new URLSearchParams();
    if (companyId) {
      params.append("company_id", companyId);
    }
    const query = params.toString();
    return fetchWithAuthJson<void>(
      `/integrations/twilio/numbers/${numberId}${query ? `?${query}` : ""}`,
      {
        method: "DELETE",
      }
    );
  }

  static async getTwilioAvailableNumbers(
    companyId?: string | null
  ): Promise<TwilioAvailableNumberResponse[]> {
    const params = new URLSearchParams();
    if (companyId) {
      params.append("company_id", companyId);
    }
    const query = params.toString();
    return fetchWithAuthJson<TwilioAvailableNumberResponse[]>(
      `/integrations/twilio/available-numbers${query ? `?${query}` : ""}`,
      {
        method: "GET",
      }
    );
  }

  static async updateTwilioWhatsAppProfile(
    data: TwilioWhatsAppProfileRequest
  ): Promise<TwilioWhatsAppProfileResponse> {
    return fetchWithAuthJson<TwilioWhatsAppProfileResponse>(
      "/integrations/twilio/whatsapp-profile",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  static async getTwilioWhatsAppProfile(
    whatsappNumber: string,
    companyId?: string | null
  ): Promise<TwilioWhatsAppProfileResponse> {
    const params = new URLSearchParams();
    params.append("whatsapp_number", whatsappNumber);
    if (companyId) {
      params.append("company_id", companyId);
    }
    const query = params.toString();
    return fetchWithAuthJson<TwilioWhatsAppProfileResponse>(
      `/integrations/twilio/whatsapp-profile?${query}`,
      {
        method: "GET",
      }
    );
  }

  // Evolution API methods
  static async createEvolutionInstance(
    payload: EvolutionCreateInstanceRequest
  ): Promise<EvolutionCreateInstanceResponse> {
    return fetchWithAuthJson<EvolutionCreateInstanceResponse>(
      "/integrations/evolution/create-instance",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  }

  static async getEvolutionStatus(
    companyId: string
  ): Promise<EvolutionStatusResponse> {
    return fetchWithAuthJson<EvolutionStatusResponse>(
      `/integrations/evolution/status?company_id=${companyId}`
    );
  }

  static async getEvolutionQRCode(
    companyId: string
  ): Promise<EvolutionQRCodeResponse> {
    return fetchWithAuthJson<EvolutionQRCodeResponse>(
      `/integrations/evolution/qrcode?company_id=${companyId}`
    );
  }

  static async deleteEvolutionInstance(
    companyId: string
  ): Promise<EvolutionDeleteResponse> {
    return fetchWithAuthJson<EvolutionDeleteResponse>(
      `/integrations/evolution/delete-instance?company_id=${companyId}`,
      {
        method: "DELETE",
      }
    );
  }
}
