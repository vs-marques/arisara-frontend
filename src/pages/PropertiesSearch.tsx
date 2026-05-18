/**
 * @file PropertiesSearch.tsx
 * @description Busca Imóveis — lista filtra pela área visível do mapa; geocode por área em lote.
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Layout from "../components/Layout";
import { useRequireAuth } from "../hooks/useRequireAuth";
import { useWorkspace } from "../contexts/WorkspaceContext";
import { formatListingPrice } from "../components/properties/mockListings";
import {
  fetchCatalogProperties,
  mapCatalogItemToCardListing,
  resolveCatalogQueryContext,
  submitCatalogLeadIntention,
} from "../services/realEstateCatalog";
import type { PropertyCardListing } from "../types/propertyListing";
import { useListingsAreaGeocode } from "../hooks/useListingsAreaGeocode";
import type { MapViewportBBox } from "../utils/mapViewport";
import { listingInViewportBBox } from "../utils/mapViewport";
import { looksLikePropertyCodeQuery } from "../utils/catalogSearchSuggest";
import { nominatimSearchFirstResult } from "../utils/nominatimGeocode";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal } from "lucide-react";

const PropertiesSearchMap = lazy(() => import("../components/properties/PropertiesSearchMap"));

const CATALOG_SEARCH_FETCH_LIMIT = 200;

function listingThumb(listing: PropertyCardListing): string {
  const u = listing.primaryImageUrl?.trim();
  if (u && /^https?:\/\//i.test(u)) return u;
  return `https://picsum.photos/seed/${listing.imageSeed}/200/160`;
}

export default function PropertiesSearch() {
  useRequireAuth();
  const { t } = useTranslation();
  const { currentWorkspace } = useWorkspace();
  const [searchParams] = useSearchParams();
  const q = searchParams.get("q") || "";
  const purposeRaw = (searchParams.get("purpose") || "sale").toLowerCase();
  const purpose: "sale" | "rent" = purposeRaw === "rent" ? "rent" : "sale";

  const [listings, setListings] = useState<PropertyCardListing[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const catalogSearchIntentionKeyRef = useRef<string | null>(null);
  const [viewportBounds, setViewportBounds] = useState<MapViewportBBox | null>(null);
  const [queryMapCenter, setQueryMapCenter] = useState<[number, number] | null>(null);

  const onMapViewportChange = useCallback((b: MapViewportBBox) => {
    setViewportBounds(b);
  }, []);

  useEffect(() => {
    setViewportBounds(null);
  }, [q, purpose]);

  useEffect(() => {
    const qn = q.trim();
    if (!qn) {
      setQueryMapCenter(null);
      return;
    }
    setQueryMapCenter(null);
    const ac = new AbortController();
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const pt = await nominatimSearchFirstResult(qn, ac.signal, {
            acceptLanguage: "th,en;q=0.9",
          });
          if (ac.signal.aborted) return;
          if (!pt) return;
          setQueryMapCenter([pt.lat, pt.lng]);
        } catch {
          if (!ac.signal.aborted) setQueryMapCenter(null);
        }
      })();
    }, 400);
    return () => {
      ac.abort();
      window.clearTimeout(timer);
    };
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ctx = await resolveCatalogQueryContext(currentWorkspace);
      if (!ctx) {
        setError(t("properties.catalog.loadContextError"));
        setListings([]);
        setTotal(0);
        return;
      }
      const res = await fetchCatalogProperties({
        workspaceId: ctx.workspaceId,
        companyId: ctx.companyId,
        q: q.trim() || undefined,
        purpose: looksLikePropertyCodeQuery(q.trim()) ? null : purpose,
        limit: CATALOG_SEARCH_FETCH_LIMIT,
        offset: 0,
      });
      setTotal(res.total);
      setListings(res.items.map((row) => mapCatalogItemToCardListing(row, { listPurpose: purpose })));
      const intentionKey = `${ctx.workspaceId}|${purpose}|${q.trim()}`;
      if (catalogSearchIntentionKeyRef.current !== intentionKey) {
        catalogSearchIntentionKeyRef.current = intentionKey;
        void submitCatalogLeadIntention({
          workspaceId: ctx.workspaceId,
          companyId: ctx.companyId,
          intentionKind: "catalog_search",
          sourceContext: { q: q.trim(), purpose, path: "/properties/search" },
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("properties.catalog.loadFailed"));
      setListings([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace, purpose, q, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const enrichedListings = useListingsAreaGeocode(listings);

  const visibleListings = useMemo(() => {
    if (!viewportBounds) return enrichedListings;
    return enrichedListings.filter((l) => listingInViewportBBox(l, viewportBounds));
  }, [enrichedListings, viewportBounds]);

  const mapFitBoundsTriggerKey = useMemo(
    () =>
      `${q}\0${purpose}\0${listings.map((l) => `${l.id}:${l.lat ?? ""}:${l.lng ?? ""}`).join("|")}\0${queryMapCenter?.join(",") ?? ""}`,
    [q, purpose, listings, queryMapCenter],
  );

  return (
    <Layout viewportHeight>
      <div className="mx-auto flex min-h-0 w-full max-w-[min(100%,96rem)] flex-1 flex-col gap-4 lg:flex-row lg:gap-6">
        <section className="order-2 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:order-1 lg:max-w-[min(42rem,54%)]">
          <header className="shrink-0 rounded-2xl border border-white/10 bg-neutral-950 px-4 py-4 shadow-lg shadow-black/30 sm:px-5">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">
              {t("properties.breadcrumb")} · {t("properties.search.breadcrumb")}
            </p>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Button
                  variant="ghost"
                  asChild
                  className="mb-1 h-auto px-0 text-sm text-gray-400 hover:bg-transparent hover:text-white"
                >
                  <Link to="/properties">← {t("properties.search.backHub")}</Link>
                </Button>
                <h1 className="text-2xl font-semibold text-white sm:text-3xl">
                  {loading
                    ? "…"
                    : t("properties.search.resultsCount", { count: visibleListings.length })}
                  {q ? (
                    <span className="text-gray-500">
                      {" "}
                      · “{q}”
                    </span>
                  ) : null}
                </h1>
                {error ? (
                  <p className="mt-2 text-sm text-red-400" role="alert">
                    {error}
                  </p>
                ) : null}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 rounded-2xl border-white/10 bg-white/5 text-white hover:border-[#EC4899]/40 hover:bg-[#EC4899]/10"
              >
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                {t("properties.search.filters")}
              </Button>
            </div>
          </header>

          {loading ? (
            <p className="mt-3 shrink-0 text-sm text-gray-500">{t("properties.catalog.loading")}</p>
          ) : !error && listings.length === 0 ? (
            <p className="mt-3 shrink-0 text-sm text-gray-500">{t("properties.catalog.emptySearch")}</p>
          ) : (
            <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1 [-webkit-overflow-scrolling:touch]">
                {!error && listings.length > 0 && visibleListings.length === 0 ? (
                  <p className="mb-3 text-sm text-amber-400/90">{t("properties.search.mapViewportEmpty")}</p>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  {visibleListings.map((listing) => (
                    <Link
                      key={listing.id}
                      to={`/properties/${listing.id}`}
                      className="flex gap-3 rounded-2xl border border-white/10 bg-neutral-950 p-3 transition hover:border-[#EC4899]/40 hover:bg-neutral-900 sm:rounded-3xl sm:p-4"
                    >
                      <img
                        src={listingThumb(listing)}
                        alt=""
                        className="h-24 w-28 shrink-0 rounded-xl object-cover sm:h-28 sm:w-36 sm:rounded-2xl"
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-xs text-gray-500">{listing.subtitle}</p>
                        <p className="line-clamp-2 text-sm font-medium text-white">{listing.title}</p>
                        <p className="text-xs text-gray-500">
                          {listing.bedrooms ?? "—"} {t("properties.search.dormsAbbr")} ·{" "}
                          {listing.bathrooms ?? "—"} {t("properties.search.bathAbbr")}
                        </p>
                        <p className="text-sm font-semibold text-white">
                          {formatListingPrice(listing.price, listing.currency, t("properties.priceOnRequest"))}{" "}
                          <span className="text-xs font-normal text-gray-500">
                            {listing.transaction === "rent"
                              ? t("properties.priceRentPeriod")
                              : t("properties.priceTotalLabel")}
                          </span>
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
                {!loading && !error && total > listings.length ? (
                  <p className="mt-4 pb-2 text-xs text-amber-400/90">
                    {t("properties.search.showingCap", {
                      shown: listings.length,
                      total,
                      limit: CATALOG_SEARCH_FETCH_LIMIT,
                    })}
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </section>

        <section className="order-1 flex h-[40vh] min-h-[260px] w-full max-h-[55vh] shrink-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-neutral-950 sm:rounded-3xl lg:h-auto lg:max-h-none lg:min-h-0 lg:flex-1 lg:self-stretch">
          <Suspense
            fallback={
              <div className="flex h-full min-h-[260px] flex-1 items-center justify-center rounded-2xl bg-neutral-900/60 text-sm text-gray-500 sm:rounded-3xl">
                {t("properties.search.mapLoading")}
              </div>
            }
          >
            <div className="relative h-full min-h-0 w-full flex-1">
              <PropertiesSearchMap
                listings={visibleListings}
                fitBoundsListings={enrichedListings}
                fitBoundsTriggerKey={mapFitBoundsTriggerKey}
                emptyMapCenter={queryMapCenter}
                onViewportChange={onMapViewportChange}
              />
            </div>
          </Suspense>
        </section>
      </div>
    </Layout>
  );
}
