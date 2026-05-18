/**
 * Cliente HTTP do catálogo canónico (real_estate) — listagem e detalhe.
 */
import {
  API_BASE_URL,
  API_ENDPOINTS,
  getAuthHeaders,
  resolveCompanyIdForApi,
  resolveWorkspaceIdForApi,
  type AuthMeTenantPayload,
  type WorkspacePickerRow,
} from "../config/api";
import type { PropertyBusinessType, PropertyCardListing } from "../types/propertyListing";

export type CatalogListPurpose = "sale" | "rent";

export type MapCatalogItemToCardListingOptions = {
  listPurpose?: CatalogListPurpose;
};

export type CatalogListItem = {
  id: string;
  external_code: string;
  title: string;
  listing_summary: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  price_amount: number | null;
  price_rent_amount?: number | null;
  price_condo_amount?: number | null;
  price_currency: string | null;
  business_type: string | null;
  offers_sale?: boolean | null;
  offers_rent?: boolean | null;
  property_type: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parking_spaces: number | null;
  area_private_sqm: number | null;
  area_total_sqm: number | null;
  listing_url: string | null;
  attributes_normalized: Record<string, unknown>;
  primary_media_url: string | null;
  updated_at: string | null;
  created_at: string | null;
  latitude: number | null;
  longitude: number | null;
  features: string[];
};

export type CatalogListResponse = {
  items: CatalogListItem[];
  total: number;
  limit: number;
  offset: number;
};

export type CatalogMediaItem = {
  url: string;
  sort_order: number;
  is_primary: boolean;
};

export type CatalogPropertyDetail = CatalogListItem & {
  media: CatalogMediaItem[];
};

export async function fetchAuthMeTenant(): Promise<AuthMeTenantPayload | null> {
  const res = await fetch(API_ENDPOINTS.auth.me, { headers: getAuthHeaders() });
  if (!res.ok) return null;
  return (await res.json()) as AuthMeTenantPayload;
}

function normalizeBusinessType(raw: string | null | undefined): PropertyBusinessType | null {
  const v = (raw || "").trim().toLowerCase();
  if (v === "sale" || v === "rent" || v === "both") return v;
  return null;
}

function resolveListPurpose(row: CatalogListItem, opts?: MapCatalogItemToCardListingOptions): CatalogListPurpose {
  if (opts?.listPurpose === "sale" || opts?.listPurpose === "rent") return opts.listPurpose;
  const offersSale = row.offers_sale !== false;
  const offersRent = Boolean(row.offers_rent);
  if (offersSale && !offersRent) return "sale";
  if (offersRent && !offersSale) return "rent";
  if (offersSale) return "sale";
  return "rent";
}

export function mapCatalogItemToCardListing(
  row: CatalogListItem,
  opts?: MapCatalogItemToCardListingOptions,
): PropertyCardListing {
  const area = row.area_private_sqm ?? row.area_total_sqm ?? null;
  const subtitleParts = [row.property_type?.trim() || null, row.city?.trim() || null].filter(Boolean);
  const offersSale = row.offers_sale !== false;
  const offersRent = Boolean(row.offers_rent);
  const purpose = resolveListPurpose(row, opts);
  const priceSaleAmount = row.price_amount ?? null;
  const priceRentAmount = row.price_rent_amount ?? null;
  const price =
    purpose === "rent"
      ? (priceRentAmount ?? priceSaleAmount ?? null)
      : (priceSaleAmount ?? null);
  const transaction: "sale" | "rent" = purpose;
  const businessType = normalizeBusinessType(row.business_type);

  return {
    id: row.id,
    externalCode: row.external_code,
    title: row.title,
    subtitle: subtitleParts.length ? subtitleParts.join(" · ") : row.title,
    city: row.city,
    neighborhood: row.neighborhood,
    state: row.state,
    price,
    priceSaleAmount,
    priceRentAmount,
    priceCondoAmount: row.price_condo_amount ?? null,
    offersSale,
    offersRent,
    businessType,
    currency: row.price_currency || "BRL",
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    parking: row.parking_spaces,
    areaSqm: area,
    transaction,
    rating: null,
    reviewCount: null,
    badge: row.external_code?.trim() || null,
    imageSeed: `re-${row.external_code || row.id}`,
    description: (row.listing_summary || "").trim(),
    features: Array.isArray(row.features) ? row.features : [],
    lat: row.latitude,
    lng: row.longitude,
    primaryImageUrl: row.primary_media_url?.trim() || null,
  };
}

export async function fetchCatalogProperties(params: {
  workspaceId: string;
  companyId?: string | null;
  q?: string;
  purpose?: "sale" | "rent" | null;
  limit?: number;
  offset?: number;
  signal?: AbortSignal;
}): Promise<CatalogListResponse> {
  const sp = new URLSearchParams();
  sp.set("workspace_id", params.workspaceId);
  if (params.companyId) sp.set("company_id", params.companyId);
  if (params.q?.trim()) sp.set("q", params.q.trim());
  if (params.purpose === "sale" || params.purpose === "rent") sp.set("purpose", params.purpose);
  if (params.limit != null) sp.set("limit", String(params.limit));
  if (params.offset != null) sp.set("offset", String(params.offset));

  const res = await fetch(`${API_BASE_URL}/real-estate/catalog/properties?${sp.toString()}`, {
    headers: getAuthHeaders(),
    signal: params.signal,
  });
  const body = (await res.json().catch(() => ({}))) as CatalogListResponse & { detail?: string };
  if (!res.ok) {
    const msg = typeof body.detail === "string" ? body.detail : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return {
    items: Array.isArray(body.items) ? body.items : [],
    total: typeof body.total === "number" ? body.total : 0,
    limit: typeof body.limit === "number" ? body.limit : params.limit ?? 48,
    offset: typeof body.offset === "number" ? body.offset : params.offset ?? 0,
  };
}

export async function fetchCatalogPropertyDetail(params: {
  propertyId: string;
  workspaceId: string;
  companyId?: string | null;
}): Promise<CatalogPropertyDetail> {
  const sp = new URLSearchParams();
  sp.set("workspace_id", params.workspaceId);
  if (params.companyId) sp.set("company_id", params.companyId);

  const res = await fetch(
    `${API_BASE_URL}/real-estate/catalog/properties/${encodeURIComponent(params.propertyId)}?${sp.toString()}`,
    { headers: getAuthHeaders() },
  );
  const body = (await res.json().catch(() => ({}))) as CatalogPropertyDetail & { detail?: string };
  if (!res.ok) {
    const msg = typeof body.detail === "string" ? body.detail : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return body as CatalogPropertyDetail;
}

export type LeadIntentionKind = "visit_request" | "catalog_search" | "property_view";

/** Regista intenção de lead (tabela real_estate.lead_intentions). Falhas silenciosas para não bloquear UI. */
export async function submitCatalogLeadIntention(params: {
  workspaceId: string;
  companyId?: string | null;
  intentionKind: LeadIntentionKind;
  propertyId?: string | null;
  sourceContext?: Record<string, unknown>;
}): Promise<{ id: string; status: string } | null> {
  const body: Record<string, unknown> = {
    workspace_id: params.workspaceId,
    intention_kind: params.intentionKind,
    source_context: params.sourceContext ?? {},
  };
  if (params.companyId) body.company_id = params.companyId;
  if (params.propertyId) body.property_id = params.propertyId;

  try {
    const res = await fetch(`${API_BASE_URL}/real-estate/catalog/intentions`, {
      method: "POST",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return (await res.json()) as { id: string; status: string };
  } catch {
    return null;
  }
}

/** Resolve workspace + empresa a partir do contexto atual (igual ao fluxo de ingestão). */
export async function resolveCatalogQueryContext(
  currentWorkspace: WorkspacePickerRow,
): Promise<{ workspaceId: string; companyId: string | null } | null> {
  const me = await fetchAuthMeTenant();
  if (!me) return null;
  const workspaceId = resolveWorkspaceIdForApi(currentWorkspace, me);
  if (!workspaceId) return null;
  const companyId = resolveCompanyIdForApi(currentWorkspace, me);
  return { workspaceId, companyId };
}
