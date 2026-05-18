/** Helpers de formatação para a UI Imóveis (valores monetários) — locale conforme idioma Arisara (th/en). */
import i18n from "../../i18n/config";

function numberLocale(): string {
  const lng = (i18n.language || "th").slice(0, 2).toLowerCase();
  if (lng === "th") return "th-TH";
  return "en-US";
}

export function formatListingPrice(value: number | null, currency: string, onRequest: string): string {
  if (value == null || Number.isNaN(value)) return onRequest;
  const cur = (currency || "BRL").toUpperCase();
  try {
    return new Intl.NumberFormat(numberLocale(), {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${value} ${cur}`;
  }
}
