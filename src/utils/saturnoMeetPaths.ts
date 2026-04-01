/**
 * URLs curtas: /saturno/m/{slug} (ex.: abc-d2ef-gh3i), estilo meet.google.com.
 * URLs legadas: /saturno/meet/{code longo} continuam válidas.
 */

/** Slug curto gerado pelo backend (3-4-3 com [a-z0-9]). */
export function isShortMeetSlug(id: string): boolean {
  return /^[a-z0-9]{3}-[a-z0-9]{4}-[a-z0-9]{3}$/i.test(id.trim());
}

export function saturnoMeetLobbyPath(publicId: string): string {
  const id = publicId.trim();
  if (!id) return '/saturno';
  return isShortMeetSlug(id) ? `/saturno/m/${id}` : `/saturno/meet/${id}`;
}

export function saturnoMeetLivePath(publicId: string, search?: string): string {
  const q = search && search.startsWith('?') ? search : search ? `?${search}` : '';
  return `${saturnoMeetLobbyPath(publicId)}/live${q}`;
}

/** Token LiveKit já liberado no lobby (após aprovação); consumido na página /live. */
export function saturnoMeetPreconnectKey(roomPublicId: string): string {
  return `saturno_meet_preconnect_${roomPublicId.trim()}`;
}

type SaturnoSessionSecretEnvelope = {
  v: string;
  exp: number;
};

export function setSaturnoSessionSecret(key: string, value: string, ttlMs: number): void {
  try {
    const envelope: SaturnoSessionSecretEnvelope = {
      v: value,
      exp: Date.now() + Math.max(1_000, ttlMs),
    };
    sessionStorage.setItem(key, JSON.stringify(envelope));
  } catch {
    /* storage indisponível */
  }
}

/**
 * iOS / navegadores in-app costumam perder `location.state` no navigate para /live.
 * Marcamos intenção no sessionStorage ao sair do prejoin; TTL evita "pular" lobby para sempre.
 */
const SATURNO_PREJOIN_INTENT_PREFIX = 'saturno_meet_prejoin_intent_';
const DEFAULT_PREJOIN_INTENT_TTL_MS = 25 * 60 * 1000;

export function markSaturnoMeetNavigatedFromPrejoin(
  roomPublicId: string,
  ttlMs: number = DEFAULT_PREJOIN_INTENT_TTL_MS,
): void {
  try {
    const id = roomPublicId.trim();
    if (!id) return;
    sessionStorage.setItem(
      `${SATURNO_PREJOIN_INTENT_PREFIX}${id}`,
      JSON.stringify({ exp: Date.now() + Math.max(60_000, ttlMs) }),
    );
  } catch {
    /* storage indisponível */
  }
}

export function peekSaturnoMeetNavigatedFromPrejoin(roomPublicId: string): boolean {
  try {
    const id = roomPublicId.trim();
    if (!id) return false;
    const key = `${SATURNO_PREJOIN_INTENT_PREFIX}${id}`;
    const raw = sessionStorage.getItem(key);
    if (!raw) return false;
    const p = JSON.parse(raw) as { exp?: number };
    if (typeof p.exp !== 'number' || Date.now() >= p.exp) {
      sessionStorage.removeItem(key);
      return false;
    }
    return true;
  } catch {
    try {
      sessionStorage.removeItem(`${SATURNO_PREJOIN_INTENT_PREFIX}${roomPublicId.trim()}`);
    } catch {
      /* noop */
    }
    return false;
  }
}

export function getSaturnoSessionSecret(key: string): string | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SaturnoSessionSecretEnvelope>;
    if (typeof parsed?.v !== 'string' || typeof parsed?.exp !== 'number') {
      sessionStorage.removeItem(key);
      return null;
    }
    if (Date.now() >= parsed.exp) {
      sessionStorage.removeItem(key);
      return null;
    }
    return parsed.v;
  } catch {
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* storage indisponível */
    }
    return null;
  }
}

/** Extrai o id público da sala a partir de URL colada ou código digitado. */
export function parseSaturnoMeetPublicId(raw: string): string {
  const s = raw.trim();
  if (!s) return '';
  try {
    const u = new URL(s, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    const m =
      u.pathname.match(/\/saturno\/m\/([^/]+)/) ?? u.pathname.match(/\/saturno\/meet\/([^/]+)/);
    return (m?.[1] ?? '').trim();
  } catch {
    return s.replace(/\s/g, '');
  }
}

const SATURNO_MEET_CORRELATION_KEY = 'saturno_meet_correlation_id';

/** ID estável por aba (sessionStorage) para correlacionar logs Core/gateway com o fluxo Meet. */
export function getSaturnoMeetCorrelationId(): string {
  try {
    if (typeof sessionStorage !== 'undefined') {
      let id = sessionStorage.getItem(SATURNO_MEET_CORRELATION_KEY);
      if (!id && typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        id = crypto.randomUUID();
        sessionStorage.setItem(SATURNO_MEET_CORRELATION_KEY, id);
      }
      if (id) return id;
    }
  } catch {
    /* storage indisponível */
  }
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** Headers opcionais para chamadas à API Saturno (ecoam em `X-Correlation-ID` no Core). */
export function saturnoMeetTraceHeaders(): Record<string, string> {
  return { 'X-Correlation-ID': getSaturnoMeetCorrelationId() };
}
