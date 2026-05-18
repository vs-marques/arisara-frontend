/**
 * @file PropertiesHub.tsx
 * @description Hub do catálogo Imóveis — busca, carrosséis, preview de feed e ingestão no catálogo canónico.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Layout from "../components/Layout";
import { useRequireAuth } from "../hooks/useRequireAuth";
import { useWorkspace } from "../contexts/WorkspaceContext";
import PropertiesSearchBar from "../components/properties/PropertiesSearchBar";
import PropertyListingCard from "../components/properties/PropertyListingCard";
import {
  fetchCatalogProperties,
  mapCatalogItemToCardListing,
  resolveCatalogQueryContext,
} from "../services/realEstateCatalog";
import type { PropertyCardListing } from "../types/propertyListing";
import { ChevronLeft, ChevronRight, Eye, Loader2, Sparkles, Upload, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API_BASE_URL, API_ENDPOINTS, getAuthHeaders, resolveCompanyIdForApi, resolveWorkspaceIdForApi } from "../config/api";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PREVIEW_EXTENSIONS = ["xml", "pdf", "txt", "md", "html", "htm"] as const;

const HUB_CATALOG_FETCH_LIMIT = 80;
const HUB_FEATURED_CAROUSEL_COUNT = 10;
const HUB_NEW_CAROUSEL_COUNT = 10;

function formatCanonicalPreviewCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

export default function PropertiesHub() {
  useRequireAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { currentWorkspace } = useWorkspace();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, unknown> | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [ingestSubmitting, setIngestSubmitting] = useState(false);
  const [auditSubmitting, setAuditSubmitting] = useState(false);
  const [ingestError, setIngestError] = useState<string | null>(null);
  const [ingestSuccess, setIngestSuccess] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [catalogRows, setCatalogRows] = useState<PropertyCardListing[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const loadCatalogListings = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const ctx = await resolveCatalogQueryContext(currentWorkspace);
      if (!ctx) {
        setCatalogError(t("properties.catalog.loadContextError"));
        setCatalogRows([]);
        return;
      }
      const { items } = await fetchCatalogProperties({
        workspaceId: ctx.workspaceId,
        companyId: ctx.companyId,
        limit: HUB_CATALOG_FETCH_LIMIT,
        offset: 0,
      });
      setCatalogRows(items.map((row) => mapCatalogItemToCardListing(row, { listPurpose: "sale" })));
    } catch (e) {
      setCatalogError(e instanceof Error ? e.message : t("properties.catalog.loadFailed"));
      setCatalogRows([]);
    } finally {
      setCatalogLoading(false);
    }
  }, [currentWorkspace, t]);

  useEffect(() => {
    void loadCatalogListings();
  }, [loadCatalogListings]);

  const row1 = catalogRows.slice(0, HUB_FEATURED_CAROUSEL_COUNT);
  const row2 = catalogRows.slice(
    HUB_FEATURED_CAROUSEL_COUNT,
    HUB_FEATURED_CAROUSEL_COUNT + HUB_NEW_CAROUSEL_COUNT,
  );

  const runPreview = useCallback(
    async (file: File) => {
      const ext = file.name.toLowerCase().split(".").pop() || "";
      if (!PREVIEW_EXTENSIONS.includes(ext as (typeof PREVIEW_EXTENSIONS)[number])) {
        setIngestError(t("documents.errors.previewAvailable", { formats: PREVIEW_EXTENSIONS.join(", ") }));
        return;
      }
      setPreviewLoading(true);
      setIngestError(null);
      setIngestSuccess(null);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const token = localStorage.getItem("access_token");
        const res = await fetch(`${API_BASE_URL}/documents/preview`, {
          method: "POST",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: formData,
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          const detail = (errBody as { detail?: string }).detail;
          throw new Error(detail || t("documents.errors.previewError"));
        }
        const data = await res.json();
        setPreviewData(data);
        setPreviewOpen(true);
      } catch (e) {
        setIngestError(e instanceof Error ? e.message : t("documents.errors.previewError"));
      } finally {
        setPreviewLoading(false);
      }
    },
    [t],
  );

  const confirmIngest = useCallback(async () => {
    setIngestError(null);
    setIngestSuccess(null);
    const structured = previewData?.structured_data as { properties?: unknown[] } | undefined;
    const props = structured?.properties;
    if (!Array.isArray(props) || props.length === 0) {
      const msg = t("properties.ingest.noStructuredProperties");
      setIngestError(msg);
      toast({ variant: "destructive", title: t("properties.ingest.toastErrorTitle"), description: msg });
      return;
    }
    setIngestSubmitting(true);
    try {
      const meHeaders = getAuthHeaders();
      const meRes = await fetch(API_ENDPOINTS.auth.me, { headers: meHeaders });
      if (!meRes.ok) {
        throw new Error(t("documents.errors.sessionExpired"));
      }
      const userData = (await meRes.json()) as {
        user_id?: string;
        company_id?: string | null;
        workspace_id?: string | null;
        tenant_id?: string | null;
      };
      const companyId = resolveCompanyIdForApi(currentWorkspace, userData);
      const workspaceId = resolveWorkspaceIdForApi(currentWorkspace, userData);
      if (!workspaceId) {
        const msg = t("properties.ingest.noWorkspace");
        setIngestError(msg);
        toast({ variant: "destructive", title: t("properties.ingest.toastErrorTitle"), description: msg });
        return;
      }

      const payload: Record<string, unknown> = {
        workspace_id: workspaceId,
        properties: props,
        source_system: "properties_hub",
      };
      if (companyId) {
        payload.company_id = companyId;
      }

      const res = await fetch(`${API_BASE_URL}/real-estate/catalog/ingest`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        detail?: string | unknown;
        succeeded?: unknown[];
        failed?: unknown[];
        failed_count?: number;
        processed?: number;
      };
      if (!res.ok) {
        const detail = data.detail;
        let msg: string;
        if (typeof detail === "string" && detail.trim()) {
          msg = detail;
        } else if (Array.isArray(detail) && detail.length > 0) {
          const first = detail[0] as { msg?: string; message?: string };
          msg = (first?.msg || first?.message || JSON.stringify(detail)).trim() || t("properties.ingest.ingestFailed");
        } else {
          msg = t("properties.ingest.ingestFailed");
        }
        if (res.status) {
          msg = `${msg} (HTTP ${res.status})`;
        }
        setIngestError(msg);
        toast({
          variant: "destructive",
          title: t("properties.ingest.toastErrorTitle"),
          description: msg,
        });
        return;
      }
      const failedN = typeof data.failed_count === "number" ? data.failed_count : 0;
      const okN = typeof data.processed === "number" ? data.processed : 0;
      if (failedN > 0) {
        setIngestSuccess(t("properties.ingest.ingestPartial", { ok: okN, failed: failedN }));
      } else {
        setIngestSuccess(t("properties.ingest.ingestOk", { count: okN }));
      }
      setPreviewOpen(false);
      setPreviewData(null);
      void loadCatalogListings();
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("properties.ingest.ingestFailed");
      setIngestError(msg);
      toast({
        variant: "destructive",
        title: t("properties.ingest.toastErrorTitle"),
        description: msg,
      });
    } finally {
      setIngestSubmitting(false);
    }
  }, [previewData, currentWorkspace, t, toast, loadCatalogListings]);

  const runLlmAudit = useCallback(async () => {
    setIngestError(null);
    setIngestSuccess(null);
    const structured = previewData?.structured_data as { properties?: unknown[]; total_count?: number } | undefined;
    const props = structured?.properties;
    if (!Array.isArray(props) || props.length === 0) {
      const msg = t("properties.ingest.noStructuredProperties");
      setIngestError(msg);
      toast({ variant: "destructive", title: t("properties.ingest.toastErrorTitle"), description: msg });
      return;
    }
    setAuditSubmitting(true);
    try {
      const meHeaders = getAuthHeaders();
      const meRes = await fetch(API_ENDPOINTS.auth.me, { headers: meHeaders });
      if (!meRes.ok) {
        throw new Error(t("documents.errors.sessionExpired"));
      }
      const userData = (await meRes.json()) as {
        company_id?: string | null;
        workspace_id?: string | null;
      };
      const companyId = resolveCompanyIdForApi(currentWorkspace, userData);
      const workspaceId = resolveWorkspaceIdForApi(currentWorkspace, userData);
      if (!workspaceId) {
        const msg = t("properties.ingest.noWorkspace");
        setIngestError(msg);
        toast({ variant: "destructive", title: t("properties.ingest.toastErrorTitle"), description: msg });
        return;
      }
      const payload: Record<string, unknown> = {
        workspace_id: workspaceId,
        properties: props,
      };
      if (companyId) {
        payload.company_id = companyId;
      }
      const res = await fetch(`${API_BASE_URL}/real-estate/catalog/audit-properties`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        detail?: string | unknown;
        properties?: unknown[];
        patches_applied?: number;
        warning?: string | null;
        canonical_table_preview?: { columns?: string[]; rows?: Record<string, unknown>[] };
      };
      if (!res.ok) {
        const detail = data.detail;
        const msg =
          typeof detail === "string" && detail.trim()
            ? detail
            : t("properties.ingest.auditFailed");
        setIngestError(msg);
        toast({ variant: "destructive", title: t("properties.ingest.toastErrorTitle"), description: msg });
        return;
      }
      const audited = Array.isArray(data.properties) ? data.properties : props;
      const patches = typeof data.patches_applied === "number" ? data.patches_applied : 0;
      setPreviewData((prev) => {
        if (!prev) return prev;
        const sd = (prev.structured_data as Record<string, unknown>) || {};
        return {
          ...prev,
          structured_data: {
            ...sd,
            properties: audited,
            total_count: audited.length,
          },
          ...(data.canonical_table_preview ? { canonical_table_preview: data.canonical_table_preview } : {}),
        };
      });
      toast({
        title: t("properties.ingest.previewModalTitle"),
        description: t("properties.ingest.auditOk", { patches }),
      });
      if (data.warning) {
        toast({
          description: t("properties.ingest.auditNote", { message: data.warning }),
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("properties.ingest.auditFailed");
      setIngestError(msg);
      toast({
        variant: "destructive",
        title: t("properties.ingest.toastErrorTitle"),
        description: msg,
      });
    } finally {
      setAuditSubmitting(false);
    }
  }, [previewData, currentWorkspace, t, toast]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void runPreview(f);
    e.target.value = "";
  };

  const canonical = previewData?.canonical_table_preview as
    | { columns?: string[]; rows?: Record<string, unknown>[] }
    | undefined;

  return (
    <Layout>
      <div className="mx-auto w-full max-w-7xl space-y-8">
        <header className="rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-6 shadow-[0_24px_60px_-55px_rgba(0,0,0,0.55)] backdrop-blur sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">
            {t("properties.breadcrumb")}
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">{t("properties.hubTitle")}</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-400">{t("properties.hubSubtitle")}</p>
        </header>

        <PropertiesSearchBar />

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".xml,.pdf,.txt,.md,.html,.htm"
          onChange={onFileChange}
        />

        <section
          className={`rounded-2xl border border-dashed p-5 transition-colors sm:p-6 ${
            dragActive ? "border-[#EC4899]/50 bg-[#EC4899]/5" : "border-white/15 bg-white/[0.02]"
          }`}
          onDragEnter={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            if (e.currentTarget === e.target) setDragActive(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            const f = e.dataTransfer.files?.[0];
            if (f) void runPreview(f);
          }}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">{t("properties.ingest.title")}</h2>
              <p className="mt-1 max-w-xl text-sm text-gray-400">{t("properties.ingest.subtitle")}</p>
              <p className="mt-2 text-xs text-gray-500">{t("properties.ingest.dropHint")}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={previewLoading}
              className="shrink-0 rounded-full border-white/20 bg-white/5 text-white hover:bg-white/10"
              onClick={() => fileInputRef.current?.click()}
            >
              {previewLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {t("properties.ingest.ctaPreview")}
            </Button>
          </div>
          {ingestSuccess ? <p className="mt-3 text-sm text-emerald-400">{ingestSuccess}</p> : null}
          {ingestError ? <p className="mt-3 text-sm text-red-400">{ingestError}</p> : null}
        </section>

        {catalogError ? (
          <p className="text-sm text-red-400" role="alert">
            {catalogError}
          </p>
        ) : null}
        {catalogLoading ? (
          <p className="text-sm text-gray-500">{t("properties.catalog.loading")}</p>
        ) : !catalogError && catalogRows.length === 0 ? (
          <p className="text-sm text-gray-500">{t("properties.catalog.empty")}</p>
        ) : null}

        {!catalogLoading && catalogRows.length > 0 && row1.length > 0 ? (
          <PropertyRow title={t("properties.rows.featured")} listings={row1} />
        ) : null}
        {!catalogLoading && catalogRows.length > 0 && row2.length > 0 ? (
          <PropertyRow title={t("properties.rows.new")} listings={row2} />
        ) : null}
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="flex max-h-[90vh] max-w-[min(96vw,80rem)] flex-col overflow-hidden border-white/10 bg-[#0a0a0a]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-semibold text-white">
              <Eye className="h-5 w-5 text-[#EC4899]" />
              {t("properties.ingest.previewModalTitle")}
              {previewData?.filename ? (
                <span className="ml-2 text-sm font-normal text-gray-400">({String(previewData.filename)})</span>
              ) : null}
            </DialogTitle>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {previewData ? (
              <div className="mt-2 space-y-4">
                {previewData.message ? (
                  <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-gray-300">
                    {String(previewData.message)}
                  </p>
                ) : null}

                {canonical?.columns?.length ? (
                  <div className="space-y-2">
                    <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/30">
                      <table className="w-full min-w-max border-collapse text-left text-[11px]">
                        <thead>
                          <tr className="border-b border-white/10 bg-neutral-950/90">
                            {canonical.columns!.map((col) => (
                              <th key={col} className="whitespace-nowrap px-2 py-2 font-semibold text-gray-400">
                                {t(`properties.catalogPreview.columns.${col}`, { defaultValue: col })}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(canonical.rows || []).map((row, ri) => (
                            <tr
                              key={ri}
                              className="border-b border-white/[0.06] odd:bg-white/[0.02] hover:bg-white/[0.04]"
                            >
                              {canonical.columns!.map((col) => {
                                const text = formatCanonicalPreviewCell(row[col]);
                                return (
                                  <td
                                    key={col}
                                    className="max-w-[min(18rem,28vw)] truncate px-2 py-1.5 font-mono text-gray-200"
                                    title={text.length > 80 ? text : undefined}
                                  >
                                    {text}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">{t("properties.ingest.previewNoCanonical")}</p>
                )}
              </div>
            ) : null}
          </div>

          <DialogFooter className="mt-4 flex flex-col gap-3 border-t border-white/5 pt-4 sm:flex-row sm:flex-wrap sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-white/10 bg-white/[0.05] text-gray-200 hover:bg-white/[0.12]"
              onClick={() => setPreviewOpen(false)}
            >
              {t("properties.ingest.closePreview")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={ingestSubmitting || auditSubmitting || !canonical?.columns?.length}
              className="rounded-xl border-violet-500/30 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20"
              onClick={() => void runLlmAudit()}
            >
              {auditSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              {t("properties.ingest.ctaLlmAudit")}
            </Button>
            <Button
              type="button"
              disabled={ingestSubmitting || auditSubmitting || !canonical?.columns?.length}
              className="rounded-xl bg-[#EC4899] text-white hover:bg-[#db2777]"
              onClick={() => void confirmIngest()}
            >
              {ingestSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Database className="mr-2 h-4 w-4" />
              )}
              {t("properties.ingest.confirmIngest")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

function PropertyRow({ title, listings }: { title: string; listings: PropertyCardListing[] }) {
  const { t } = useTranslation();
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollByOne = useCallback((direction: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const first = el.firstElementChild as HTMLElement | null;
    const gap = 16;
    const step = first ? first.getBoundingClientRect().width + gap : 316;
    el.scrollBy({ left: direction * step, behavior: "smooth" });
  }, []);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => scrollByOne(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition hover:bg-white/10"
            aria-label={t("properties.rows.scrollPrev")}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollByOne(1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition hover:bg-white/10"
            aria-label={t("properties.rows.scrollNext")}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div
        ref={scrollerRef}
        className="flex gap-4 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {listings.map((l) => (
          <div key={l.id} className="w-[min(100%,280px)] shrink-0 sm:w-[300px]">
            <PropertyListingCard listing={l} />
          </div>
        ))}
      </div>
    </section>
  );
}
