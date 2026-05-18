/**
 * Preenche lat/lng em lote: reaproveita uma geocodificação Nominatim por combinação bairro/cidade/UF.
 * Pedidos passam pela fila global em nominatimGeocode (intervalo + retentativas em 429).
 */
import { useEffect, useMemo, useState } from "react";
import type { PropertyCardListing } from "../types/propertyListing";
import { listingHasGeoCoords } from "../utils/mapViewport";
import { nominatimSearchFirstResult } from "../utils/nominatimGeocode";

const MAX_AREA_KEYS = 20;

function areaKey(l: PropertyCardListing): string {
  return [
    (l.neighborhood || "").trim().toLowerCase(),
    (l.city || "").trim().toLowerCase(),
    (l.state || "").trim().toLowerCase(),
  ].join("\t");
}

function nominatimQueryForListing(l: PropertyCardListing): string | null {
  const city = (l.city || "").trim();
  const neighborhood = (l.neighborhood || "").trim();
  if (!city && !neighborhood) return null;
  const parts = [
    neighborhood || null,
    city || null,
    (l.state || "").trim() || null,
    "Brazil",
  ].filter(Boolean) as string[];
  return parts.join(", ");
}

function ingestionFingerprint(listings: PropertyCardListing[]): string {
  return listings.map((l) => `${l.id}:${l.lat ?? ""}:${l.lng ?? ""}:${areaKey(l)}`).join("|");
}

export function useListingsAreaGeocode(listings: PropertyCardListing[]): PropertyCardListing[] {
  const [coordsByKey, setCoordsByKey] = useState<Record<string, { lat: number; lng: number }>>({});

  const ingestionKey = useMemo(() => ingestionFingerprint(listings), [listings]);

  useEffect(() => {
    setCoordsByKey({});
    const ac = new AbortController();
    let cancelled = false;

    const keyToQuery = new Map<string, string>();
    const keys = new Set<string>();
    for (const l of listings) {
      if (listingHasGeoCoords(l)) continue;
      const q = nominatimQueryForListing(l);
      if (!q) continue;
      const k = areaKey(l);
      keys.add(k);
      if (!keyToQuery.has(k)) keyToQuery.set(k, q);
    }

    const ordered = [...keys].slice(0, MAX_AREA_KEYS);

    void (async () => {
      for (const k of ordered) {
        if (cancelled || ac.signal.aborted) break;
        const q = keyToQuery.get(k);
        if (!q) continue;
        try {
          const coords = await nominatimSearchFirstResult(q, ac.signal, {
            acceptLanguage: "th,en;q=0.9",
          });
          if (cancelled || ac.signal.aborted) break;
          if (!coords) continue;
          setCoordsByKey((prev) => ({ ...prev, [k]: coords }));
        } catch {
          /* abort / rede */
        }
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [ingestionKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return useMemo(() => {
    return listings.map((l) => {
      if (listingHasGeoCoords(l)) return l;
      const k = areaKey(l);
      const c = coordsByKey[k];
      if (!c) return l;
      return { ...l, lat: c.lat, lng: c.lng };
    });
  }, [listings, coordsByKey]);
}
