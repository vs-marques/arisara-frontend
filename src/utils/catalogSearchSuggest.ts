/**
 * Ranqueia itens do catálogo pelo texto de busca e monta sugestões únicas (cidade / bairro / código).
 * A lista já vem filtrada pela API; aqui a gente só deduplica e formata.
 */
import type { CatalogListItem } from "../services/realEstateCatalog";

function norm(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Parece código de anúncio (ex.: AP0151, CA0332) — não mistura com nome de cidade. */
export function looksLikePropertyCodeQuery(raw: string): boolean {
  const t = raw.trim();
  if (t.length < 3) return false;
  if (/\s/.test(t)) return false;
  if (/\d/.test(t) && /[a-z]/i.test(t)) return true;
  if (/^[a-z]{2,4}\d{2,10}$/i.test(t)) return true;
  return false;
}

function codeMatchesQuery(nq: string, codeRaw: string): boolean {
  const c = norm(codeRaw);
  return c.length > 0 && (c === nq || c.startsWith(nq) || c.includes(nq));
}

function cityMatchesFacet(nq: string, city: string): boolean {
  const cityN = norm(city);
  if (!cityN || !nq) return false;
  if (cityN === nq || cityN.startsWith(nq)) return true;
  const tokens = nq.split(/\s+/).filter((t) => t.length >= 2);
  if (tokens.length > 0 && tokens.every((t) => cityN.includes(t))) return true;
  if (nq.length >= 3 && cityN.includes(nq)) return true;
  return false;
}

function hoodMatchesFacet(nq: string, hood: string): boolean {
  const h = norm(hood);
  if (!h || !nq) return false;
  if (h === nq || h.startsWith(nq)) return true;
  if (nq.length >= 3 && h.includes(nq)) return true;
  const tokens = nq.split(/\s+/).filter((t) => t.length >= 2);
  if (tokens.length > 0 && tokens.every((t) => h.includes(t))) return true;
  return false;
}

export type CatalogFacetKind = "city" | "neighborhood" | "code";

export type CatalogFacetRow = {
  kind: CatalogFacetKind;
  label: string;
  fillQuery: string;
  id: string;
};

export type CatalogSearchFacetBuckets = {
  cities: CatalogFacetRow[];
  neighborhoods: CatalogFacetRow[];
  codes: CatalogFacetRow[];
};

const emptyBuckets = (): CatalogSearchFacetBuckets => ({
  cities: [],
  neighborhoods: [],
  codes: [],
});

function sortByLabel(rows: CatalogFacetRow[]): CatalogFacetRow[] {
  return [...rows].sort((a, b) => a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" }));
}

/**
 * Agrupa imóveis em facetas distintas (sem repetir a mesma cidade/bairro/código).
 * Busca estilo código (ex.: AP01): só a seção de códigos.
 */
export function buildCatalogSearchFacetBuckets(
  query: string,
  items: CatalogListItem[],
): CatalogSearchFacetBuckets {
  const nq = norm(query);
  if (!nq) return emptyBuckets();

  const citiesMap = new Map<string, CatalogFacetRow>();
  const hoodsMap = new Map<string, CatalogFacetRow>();
  const codesMap = new Map<string, CatalogFacetRow>();
  const codeOnly = looksLikePropertyCodeQuery(query);

  for (const item of items) {
    const city = (item.city || "").trim();
    const state = (item.state || "").trim();
    const hood = (item.neighborhood || "").trim();
    const rawCode = (item.external_code || "").trim();

    if (codeOnly) {
      if (rawCode && codeMatchesQuery(nq, rawCode)) {
        const ck = norm(rawCode);
        if (!codesMap.has(ck)) {
          codesMap.set(ck, { kind: "code", label: rawCode, fillQuery: rawCode, id: `code:${ck}` });
        }
      }
      continue;
    }

    if (city && cityMatchesFacet(nq, city)) {
      const ck = `${norm(city)}|${norm(state)}`;
      if (!citiesMap.has(ck)) {
        const label = state ? `${city} - ${state}` : city;
        citiesMap.set(ck, { kind: "city", label, fillQuery: label, id: `city:${ck}` });
      }
    }

    if (hood && hoodMatchesFacet(nq, hood)) {
      const hk = `${norm(hood)}|${norm(city)}|${norm(state)}`;
      if (!hoodsMap.has(hk)) {
        const label = city && state ? `${hood}, ${city} - ${state}` : city ? `${hood}, ${city}` : hood;
        hoodsMap.set(hk, { kind: "neighborhood", label, fillQuery: label, id: `hood:${hk}` });
      }
    }
  }

  return {
    cities: sortByLabel([...citiesMap.values()]),
    neighborhoods: sortByLabel([...hoodsMap.values()]),
    codes: sortByLabel([...codesMap.values()]),
  };
}

function scoreItem(item: CatalogListItem, qRaw: string): number {
  const q = norm(qRaw);
  if (!q) return 0;
  const tokens = q.split(/\s+/).filter((t) => t.length > 0);
  const code = norm(item.external_code || "");
  const city = norm(item.city || "");
  const hood = norm(item.neighborhood || "");
  const title = norm(item.title || "");
  const summary = norm(item.listing_summary || "");
  const blob = `${code} ${city} ${hood} ${title} ${summary}`;

  let score = 0;

  if (code && code === q) score += 8000;
  else if (code && code.startsWith(q)) score += 5500;
  else if (code && code.includes(q)) score += 3200;

  if (city && city === q) score += 7200;
  else if (city && city.startsWith(q)) score += 4800;
  else if (city && tokens.length && tokens.every((t) => city.includes(t))) score += 3600;
  else if (city && city.includes(q)) score += 2200;

  if (hood && hood === q) score += 7000;
  else if (hood && hood.startsWith(q)) score += 4600;
  else if (hood && tokens.length && tokens.every((t) => hood.includes(t))) score += 3400;
  else if (hood && hood.includes(q)) score += 2100;

  if (title.includes(q)) {
    score += 1800;
    const idx = title.indexOf(q);
    if (idx === 0) score += 400;
    else if (idx > 0 && idx < 24) score += 200;
  }

  if (summary.includes(q)) score += 600;

  for (const t of tokens) {
    if (t.length < 2) continue;
    if (blob.includes(t)) score += 120 + Math.min(80, t.length * 12);
  }

  const prefixBoost = (field: string) => {
    for (const t of tokens) {
      if (t.length >= 2 && field.startsWith(t)) score += 350;
    }
  };
  prefixBoost(city);
  prefixBoost(hood);
  prefixBoost(code);

  return score;
}

export function rankCatalogItemsBySearchRelevance(
  items: CatalogListItem[],
  query: string,
  take: number,
): CatalogListItem[] {
  const q = query.trim();
  if (!q) return items.slice(0, take);
  const scored = items.map((item) => ({ item, score: scoreItem(item, q) }));
  scored.sort((a, b) => b.score - a.score);
  const sorted = scored.map((x) => x.item);
  const top = sorted.slice(0, take);
  return top.length ? top : items.slice(0, take);
}
