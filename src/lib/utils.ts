import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Apenas dígitos do valor. */
export function phoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** Formata telefone brasileiro: (11) 99999-9999 ou (11) 9999-9999. */
export function formatPhoneBR(value: string): string {
  const digits = phoneDigits(value);
  if (digits.length <= 2) {
    return digits.length ? `(${digits}` : "";
  }
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

/** Valida telefone BR: 10 (fixo) ou 11 (celular) dígitos. */
export function validatePhone(phone: string): { valid: boolean; message?: string } {
  const digits = phoneDigits(phone);
  if (digits.length === 0) return { valid: false, message: "Informe o telefone." };
  if (digits.length < 10) return { valid: false, message: "Telefone incompleto." };
  if (digits.length > 11) return { valid: false, message: "Telefone inválido." };
  return { valid: true };
}

const normalizeBase64 = (value: string) => {
  const padding = 4 - (value.length % 4);
  if (padding !== 4) {
    value += "=".repeat(padding);
  }
  return value.replace(/-/g, "+").replace(/_/g, "/");
};

export function isTokenExpired(token?: string | null): boolean {
  if (!token) {
    return true;
  }

  const parts = token.split(".");
  if (parts.length < 2) {
    return true;
  }

  try {
    const payload = JSON.parse(
      atob(normalizeBase64(parts[1]))
    ) as { exp?: number };

    if (!payload.exp) {
      return true;
    }

    const expirationMs = payload.exp * 1000;
    return Date.now() >= expirationMs;
  } catch (error) {
    console.warn("utils.jwt_parse_failed", { error: error instanceof Error ? error.message : String(error) });
    return true;
  }
}

