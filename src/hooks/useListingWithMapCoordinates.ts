/**
 * Garante lat/lng para o mapa Leaflet: usa coordenadas do catálogo ou geocodifica o endereço (Nominatim OSM).
 */
import { useEffect, useMemo, useState } from "react";
import type { PropertyBusinessType, PropertyCardListing } from "../types/propertyListing";
import { nominatimSearchFirstResult } from "../utils/nominatimGeocode";

function hasFiniteCoords(lat: unknown, lng: unknown): boolean {
  return typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng);
}

export function useListingWithMapCoordinates(listing: PropertyCardListing): PropertyCardListing {
  const [geocoded, setGeocoded] = useState<{ lat: number; lng: number } | null>(null);

  const catalogOk = hasFiniteCoords(listing.lat, listing.lng);

  useEffect(() => {
    if (catalogOk) {
      setGeocoded(null);
      return;
    }
    const city = (listing.city || "").trim();
    const neighborhood = (listing.neighborhood || "").trim();
    const state = (listing.state || "").trim();
    if (!city && !neighborhood) return;

    const parts = [neighborhood || null, city || null, state || null, "Brazil"].filter(Boolean) as string[];
    const q = parts.join(", ");
    const ac = new AbortController();
    void (async () => {
      try {
        const coords = await nominatimSearchFirstResult(q, ac.signal, {
          acceptLanguage: "th,en;q=0.9",
        });
        if (ac.signal.aborted) return;
        if (!coords) return;
        setGeocoded(coords);
      } catch {
        /* abort / rede */
      }
    })();

    return () => {
      ac.abort();
    };
  }, [catalogOk, listing.id, listing.city, listing.state, listing.neighborhood, listing.lat, listing.lng]);

  return useMemo(() => {
    if (catalogOk) return listing;
    if (!geocoded) return listing;
    return { ...listing, lat: geocoded.lat, lng: geocoded.lng };
  }, [listing, catalogOk, geocoded]);
}

/** Só para satisfazer regras de hooks antes do listing carregar (sem cidade → sem geocode). */
export const LISTING_MAP_COORDINATES_FALLBACK: PropertyCardListing = {
  id: "__map_placeholder__",
  externalCode: "",
  title: "",
  subtitle: "",
  city: null,
  neighborhood: null,
  state: null,
  price: null,
  priceSaleAmount: null,
  priceRentAmount: null,
  offersSale: true,
  offersRent: false,
  businessType: null as PropertyBusinessType | null,
  currency: "BRL",
  bedrooms: null,
  bathrooms: null,
  parking: null,
  areaSqm: null,
  transaction: "sale",
  imageSeed: "placeholder",
  description: "",
  features: [],
  lat: null,
  lng: null,
};
