/**
 * @file PropertyListingCard.tsx
 * @description Cartão de listagem (catálogo real_estate + fallback de imagem).
 */
import { Link } from "react-router-dom";
import { Heart, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { PropertyCardListing } from "../../types/propertyListing";
import { formatListingPrice } from "./mockListings";

type Props = {
  listing: PropertyCardListing;
};

export default function PropertyListingCard({ listing }: Props) {
  const { t } = useTranslation();
  const primary = listing.primaryImageUrl?.trim();
  const img =
    primary && /^https?:\/\//i.test(primary)
      ? primary
      : `https://picsum.photos/seed/${listing.imageSeed}/640/427`;

  return (
    <Link
      to={`/properties/${listing.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] transition hover:-translate-y-0.5 hover:border-[#EC4899]/40 hover:bg-[#EC4899]/5"
    >
      <div className="relative aspect-[3/2] w-full shrink-0 overflow-hidden rounded-t-3xl bg-neutral-900">
        <img
          src={img}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          loading="lazy"
          decoding="async"
        />
        {listing.badge ? (
          <span className="absolute left-3 top-3 rounded-full border border-white/20 bg-black/55 px-2.5 py-0.5 text-[11px] font-medium text-white/95 backdrop-blur-sm">
            {listing.badge}
          </span>
        ) : null}
        <button
          type="button"
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white/90 backdrop-blur-sm transition hover:bg-black/60"
          aria-label={t("properties.detail.save")}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <Heart className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-1 px-4 pb-4 pt-3">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-1 text-sm font-semibold text-white/95">{listing.subtitle}</p>
          {listing.rating != null ? (
            <span className="flex shrink-0 items-center gap-0.5 text-xs text-white/80">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {listing.rating.toFixed(2)}
            </span>
          ) : null}
        </div>
        {listing.businessType ? (
          <p className="text-[11px] font-medium uppercase tracking-wide text-[#EC4899]/85">
            {t(`properties.intent.${listing.businessType}`)}
          </p>
        ) : null}
        <p className="line-clamp-2 text-xs text-gray-400">{listing.title}</p>
        <p className="text-xs text-gray-500">
          {listing.bedrooms != null ? `${listing.bedrooms} ${t("properties.search.dormsAbbr")}` : "—"} ·{" "}
          {listing.bathrooms != null ? `${listing.bathrooms} ${t("properties.search.bathAbbr")}` : "—"} ·{" "}
          {listing.areaSqm != null ? `${listing.areaSqm} m²` : "—"}
        </p>
        <p className="pt-1 text-sm font-semibold text-white">
          {formatListingPrice(listing.price, listing.currency, t("properties.priceOnRequest"))}{" "}
          <span className="text-xs font-normal text-gray-500">
            {listing.transaction === "rent" ? t("properties.priceRentPeriod") : t("properties.priceTotalLabel")}
          </span>
        </p>
        {listing.offersSale && listing.offersRent ? (
          <p className="text-[11px] leading-snug text-gray-500">
            {listing.transaction === "rent"
              ? t("properties.cardAlsoForSale", {
                  price: formatListingPrice(
                    listing.priceSaleAmount,
                    listing.currency,
                    t("properties.priceOnRequest"),
                  ),
                })
              : t("properties.cardAlsoForRent", {
                  price: formatListingPrice(
                    listing.priceRentAmount,
                    listing.currency,
                    t("properties.priceOnRequest"),
                  ),
                })}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
