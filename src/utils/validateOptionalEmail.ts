/**
 * E-mail opcional: vazio é válido; se preenchido, exige formato com domínio e extensão (ex.: .com, .com.br).
 */
export type OptionalEmailResult =
  | { valid: true }
  | { valid: false; kind: 'domain' | 'format' };

export function validateOptionalEmail(email: string): OptionalEmailResult {
  const trimmed = email.trim();
  if (!trimmed) return { valid: true };
  if (/\s/.test(trimmed) || trimmed.length > 254) {
    return { valid: false, kind: 'format' };
  }
  const at = trimmed.lastIndexOf('@');
  if (at <= 0 || at === trimmed.length - 1) {
    return { valid: false, kind: 'format' };
  }
  const domain = trimmed.slice(at + 1);
  if (!domain.includes('.')) {
    return { valid: false, kind: 'domain' };
  }
  const tld = domain.split('.').pop() ?? '';
  if (tld.length < 2) {
    return { valid: false, kind: 'format' };
  }
  const local = trimmed.slice(0, at);
  if (!/^[^\s@]+$/.test(local) || !/^[^\s@]+$/.test(domain)) {
    return { valid: false, kind: 'format' };
  }
  return { valid: true };
}
