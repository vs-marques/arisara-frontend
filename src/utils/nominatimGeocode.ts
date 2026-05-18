/**
 * Geocodificação via Nominatim (OSM) com fila global e espaçamento mínimo entre pedidos,
 * para respeitar https://operations.osmfoundation.org/policies/nominatim/ e reduzir 429.
 */
const MIN_MS_BETWEEN_REQUESTS = 1300;
const MAX_ATTEMPTS = 4;

let chain: Promise<unknown> = Promise.resolve();
let lastRequestEndMs = 0;

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const t = window.setTimeout(resolve, ms);
    const onAbort = () => {
      window.clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

async function fetchOnce(
  query: string,
  signal: AbortSignal,
  acceptLanguage: string,
): Promise<Response> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
  return fetch(url, {
    signal,
    headers: {
      Accept: "application/json",
      "Accept-Language": acceptLanguage,
    },
  });
}

/**
 * Primeiro resultado de busca textual; null se não houver ou em erro após retentativas.
 * Pedidos são serializados em toda a aplicação e respeitam intervalo mínimo.
 */
export function nominatimSearchFirstResult(
  query: string,
  signal: AbortSignal,
  opts?: { acceptLanguage?: string },
): Promise<{ lat: number; lng: number } | null> {
  const q = query.trim();
  if (!q) return Promise.resolve(null);
  const acceptLanguage = opts?.acceptLanguage ?? "th,en;q=0.9";

  const run = chain.then(async () => {
    try {
      const idle = Math.max(0, MIN_MS_BETWEEN_REQUESTS - (Date.now() - lastRequestEndMs));
      if (idle > 0) {
        try {
          await sleep(idle, signal);
        } catch {
          return null;
        }
      }
      if (signal.aborted) return null;

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        if (signal.aborted) return null;
        const res = await fetchOnce(q, signal, acceptLanguage);

        if (res.status === 429) {
          const ra = res.headers.get("Retry-After");
          const sec = ra ? parseInt(ra, 10) : NaN;
          const backoffMs = Number.isFinite(sec)
            ? Math.min(60_000, sec * 1000 + 500)
            : Math.min(30_000, MIN_MS_BETWEEN_REQUESTS * (attempt + 2));
          try {
            await sleep(backoffMs, signal);
          } catch {
            return null;
          }
          continue;
        }

        if (!res.ok) return null;
        const data = (await res.json()) as { lat?: string; lon?: string }[];
        const first = Array.isArray(data) ? data[0] : null;
        if (!first?.lat || !first?.lon) return null;
        const lat = parseFloat(first.lat);
        const lng = parseFloat(first.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return { lat, lng };
      }
      return null;
    } finally {
      lastRequestEndMs = Date.now();
    }
  });

  chain = run.then(
    () => {},
    () => {},
  );
  return run;
}
