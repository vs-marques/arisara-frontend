/**
 * Modelo de cartão de listagem Imóveis — alinhado ao payload de GET /real-estate/catalog/properties
 * após mapeamento leve no cliente.
 */
export type PropertyBusinessType = "sale" | "rent" | "both";

export type PropertyCardListing = {
  id: string;
  externalCode: string;
  title: string;
  subtitle: string;
  city: string | null;
  neighborhood: string | null;
  state: string | null;
  /** Preço mostrado na lista conforme o contexto (compra vs aluguel). */
  price: number | null;
  priceSaleAmount: number | null;
  priceRentAmount: number | null;
  priceCondoAmount?: number | null;
  offersSale: boolean;
  offersRent: boolean;
  businessType: PropertyBusinessType | null;
  currency: string;
  bedrooms: number | null;
  bathrooms: number | null;
  parking: number | null;
  areaSqm: number | null;
  /** Contexto da listagem (filtro compra/aluguel). */
  transaction: "sale" | "rent";
  /** Ausente quando o catálogo não tem avaliações (dados reais). */
  rating?: number | null;
  reviewCount?: number | null;
  badge?: string | null;
  imageSeed: string;
  description: string;
  features: string[];
  lat: number | null;
  lng: number | null;
  primaryImageUrl?: string | null;
};
