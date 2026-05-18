/**
 * @file PropertyDetail.tsx
 * @description Detalhe de imóvel a partir do catálogo canónico (GET /real-estate/catalog/properties/{id}).
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Layout from "../components/Layout";
import { useRequireAuth } from "../hooks/useRequireAuth";
import { useWorkspace } from "../contexts/WorkspaceContext";
import { formatListingPrice } from "../components/properties/mockListings";
import {
  fetchCatalogPropertyDetail,
  mapCatalogItemToCardListing,
  resolveCatalogQueryContext,
  submitCatalogLeadIntention,
  type CatalogPropertyDetail,
} from "../services/realEstateCatalog";
import type { PropertyCardListing } from "../types/propertyListing";
import {
  LISTING_MAP_COORDINATES_FALLBACK,
  useListingWithMapCoordinates,
} from "../hooks/useListingWithMapCoordinates";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Heart, Share2, Star, MapPin, Loader2 } from "lucide-react";

const PropertiesSearchMap = lazy(() => import("../components/properties/PropertiesSearchMap"));

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function PropertyDetail() {
  useRequireAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { currentWorkspace } = useWorkspace();
  const { listingId } = useParams<{ listingId: string }>();

  const [detail, setDetail] = useState<CatalogPropertyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!listingId || !UUID_RE.test(listingId)) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setNotFound(false);
    try {
      const ctx = await resolveCatalogQueryContext(currentWorkspace);
      if (!ctx) {
        setNotFound(true);
        return;
      }
      const d = await fetchCatalogPropertyDetail({
        propertyId: listingId,
        workspaceId: ctx.workspaceId,
        companyId: ctx.companyId,
      });
      setDetail(d);
    } catch {
      setDetail(null);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [listingId, currentWorkspace]);

  useEffect(() => {
    void load();
  }, [load]);

  const listing: PropertyCardListing | null = useMemo(() => {
    if (!detail) return null;
    const { media: _m, ...rest } = detail;
    return mapCatalogItemToCardListing(rest);
  }, [detail]);

  const listingForMap = useListingWithMapCoordinates(listing ?? LISTING_MAP_COORDINATES_FALLBACK);

  const images = useMemo(() => {
    if (!detail || !listing) return [] as string[];
    if (detail.media?.length) {
      return detail.media.map((m) => m.url).filter(Boolean).slice(0, 5);
    }
    return [1, 2, 3, 4, 5].map(
      (i) => `https://picsum.photos/seed/${listing.imageSeed}-${i}/800/600`,
    );
  }, [detail, listing]);

  if (!listingId) {
    return <Navigate to="/properties" replace />;
  }

  if (!loading && notFound) {
    return <Navigate to="/properties" replace />;
  }

  if (loading || !listing || !detail) {
    return (
      <Layout>
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 py-24 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>{t("properties.catalog.loading")}</span>
        </div>
      </Layout>
    );
  }

  const featureList = listing.features.length ? listing.features : [t("properties.detail.noFeatures")];

  return (
    <Layout>
      <div className="mx-auto w-full max-w-7xl space-y-8 pb-16">
        <header className="rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-6 shadow-[0_24px_60px_-55px_rgba(0,0,0,0.55)] backdrop-blur sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">
            {t("properties.detail.breadcrumb")}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="ghost"
              asChild
              className="gap-2 text-gray-400 hover:bg-white/5 hover:text-white"
            >
              <Link to="/properties">
                <ArrowLeft className="h-4 w-4" />
                {t("properties.detail.back")}
              </Link>
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-2xl border-white/10 bg-white/5 text-white hover:border-[#EC4899]/40 hover:bg-[#EC4899]/10"
              >
                <Share2 className="mr-1.5 h-3.5 w-3.5" />
                {t("properties.detail.share")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-2xl border-white/10 bg-white/5 text-white hover:border-[#EC4899]/40 hover:bg-[#EC4899]/10"
              >
                <Heart className="mr-1.5 h-3.5 w-3.5" />
                {t("properties.detail.save")}
              </Button>
            </div>
          </div>
          <h1 className="mt-4 text-3xl font-semibold leading-snug text-white sm:text-4xl">{listing.title}</h1>
          {listing.businessType ? (
            <p className="mt-2 text-sm font-medium text-[#EC4899]/90">
              {t(`properties.intent.${listing.businessType}`)}
            </p>
          ) : null}
        </header>

        {images.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] sm:grid-cols-4 sm:grid-rows-2 sm:gap-2">
            <div className="relative col-span-2 aspect-[4/3] sm:col-span-2 sm:row-span-2 sm:aspect-auto sm:min-h-[320px]">
              <img src={images[0]} alt="" className="h-full w-full object-cover" />
            </div>
            {images.slice(1, 5).map((src, idx) => (
              <div key={src} className="relative hidden aspect-square overflow-hidden sm:block">
                <img src={src} alt="" className="h-full w-full object-cover" />
                {idx === 3 ? (
                  <button
                    type="button"
                    className="absolute inset-0 flex items-end justify-end bg-black/35 p-3 text-sm font-medium text-white transition hover:bg-black/45"
                  >
                    {t("properties.detail.showAllPhotos")}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        <nav className="flex flex-wrap gap-6 border-b border-white/10 pb-3 text-sm text-gray-500">
          <span className="cursor-default border-b-2 border-[#EC4899] pb-3 font-medium text-white">
            {t("properties.detail.tabPhotos")}
          </span>
          <span className="cursor-default pb-3">{t("properties.detail.tabAmenities")}</span>
          <span className="cursor-default pb-3">{t("properties.detail.tabLocation")}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
          <div className="space-y-8">
            <section>
              <p className="text-sm text-gray-400">
                {listing.subtitle} · {listing.city || "—"}, {listing.state || "—"}
              </p>
              <p className="mt-2 text-sm text-gray-500">
                {listing.bedrooms != null ? `${listing.bedrooms} ${t("properties.detail.bedrooms")}` : "—"} ·{" "}
                {listing.bathrooms != null ? `${listing.bathrooms} ${t("properties.detail.bathrooms")}` : "—"} ·{" "}
                {listing.parking != null ? `${listing.parking} ${t("properties.detail.parking")}` : "—"}
              </p>
              {listing.rating != null ? (
                <div className="mt-4 flex items-center gap-2 rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                  <span className="font-semibold text-white">{listing.rating.toFixed(2)}</span>
                  <span className="text-sm text-gray-500">
                    · {listing.reviewCount ?? 0} {t("properties.detail.reviews")}
                  </span>
                </div>
              ) : null}
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">{t("properties.detail.descriptionTitle")}</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-gray-400">
                {listing.description?.trim() ? listing.description : t("properties.detail.noDescription")}
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">{t("properties.detail.amenitiesTitle")}</h2>
              <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {featureList.map((f, idx) => (
                  <li key={`${idx}-${f}`} className="flex items-center gap-2 text-sm text-gray-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#EC4899]/80" />
                    {f}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">{t("properties.detail.locationTitle")}</h2>
              <p className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                <MapPin className="h-4 w-4 text-[#EC4899]" />
                {listing.neighborhood || "—"}, {listing.city || "—"} — {listing.state || "—"}
              </p>
              <div className="mt-4 h-[min(22rem,42vh)] min-h-[220px] w-full overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02]">
                <Suspense
                  fallback={
                    <div className="flex h-full min-h-[220px] items-center justify-center bg-neutral-900/60 text-sm text-gray-500">
                      {t("properties.search.mapLoading")}
                    </div>
                  }
                >
                  <div className="relative h-full min-h-[220px] w-full">
                    <PropertiesSearchMap listings={[listingForMap]} />
                  </div>
                </Suspense>
              </div>
            </section>
          </div>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="glass-card rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_24px_60px_-40px_rgba(0,0,0,0.5)]">
              {detail.offers_sale !== false || Boolean(detail.offers_rent) ? (
                <div className="space-y-4">
                  {detail.offers_sale !== false ? (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">{t("properties.detail.salePriceTitle")}</p>
                      <p className="mt-1 text-xl font-semibold text-white">
                        {formatListingPrice(
                          detail.price_amount,
                          detail.price_currency || listing.currency,
                          t("properties.priceOnRequest"),
                        )}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">{t("properties.detail.installmentHint")}</p>
                    </div>
                  ) : null}
                  {Boolean(detail.offers_rent) ? (
                    <div className={detail.offers_sale !== false ? "border-t border-white/10 pt-4" : ""}>
                      <p className="text-xs uppercase tracking-wide text-gray-500">{t("properties.detail.rentPriceTitle")}</p>
                      <p className="mt-1 text-xl font-semibold text-white">
                        {formatListingPrice(
                          detail.price_rent_amount ?? null,
                          detail.price_currency || listing.currency,
                          t("properties.priceOnRequest"),
                        )}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">{t("properties.detail.rentPriceHint")}</p>
                      {detail.price_condo_amount != null && detail.price_condo_amount > 0 ? (
                        <div className="mt-3 border-t border-white/10 pt-3">
                          <p className="text-xs uppercase tracking-wide text-gray-500">
                            {t("properties.detail.condoFeeTitle")}
                          </p>
                          <p className="mt-1 text-lg font-semibold text-white">
                            {formatListingPrice(
                              detail.price_condo_amount,
                              detail.price_currency || listing.currency,
                              t("properties.priceOnRequest"),
                            )}
                            <span className="ml-1 text-xs font-normal text-gray-500">
                              {t("properties.detail.condoFeePeriod")}
                            </span>
                          </p>
                          <p className="mt-1 text-xs text-gray-500">{t("properties.detail.condoFeeHint")}</p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : (
                <>
                  <p className="text-xs uppercase tracking-wide text-gray-500">{t("properties.detail.total")}</p>
                  <p className="mt-1 text-2xl font-semibold text-white">
                    {formatListingPrice(listing.price, listing.currency, t("properties.priceOnRequest"))}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">{t("properties.detail.installmentHint")}</p>
                </>
              )}
              <div className="mt-4 space-y-2 rounded-2xl border border-white/10 bg-black/30 p-3 text-xs text-gray-500">
                <div className="flex justify-between">
                  <span>{t("properties.detail.checkin")}</span>
                  <span className="text-gray-400">—</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("properties.detail.checkout")}</span>
                  <span className="text-gray-400">—</span>
                </div>
              </div>
              <Button
                type="button"
                className="mt-5 w-full rounded-2xl bg-[#EC4899] py-6 text-base font-semibold text-white hover:bg-[#EC4899]/90"
                onClick={() => {
                  void (async () => {
                    const ctx = await resolveCatalogQueryContext(currentWorkspace);
                    if (!ctx || !listingId) return;
                    const r = await submitCatalogLeadIntention({
                      workspaceId: ctx.workspaceId,
                      companyId: ctx.companyId,
                      intentionKind: "visit_request",
                      propertyId: listingId,
                      sourceContext: { source: "property_detail_cta" },
                    });
                    if (r) {
                      toast({
                        title: t("properties.detail.cta"),
                        description: t("properties.detail.intentionRecorded"),
                      });
                    } else {
                      toast({
                        variant: "destructive",
                        title: t("properties.detail.cta"),
                        description: t("properties.detail.intentionFailed"),
                      });
                    }
                  })();
                }}
              >
                {t("properties.detail.cta")}
              </Button>
              <p className="mt-3 text-center text-[11px] text-gray-600">{t("properties.detail.ctaDisclaimer")}</p>
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
