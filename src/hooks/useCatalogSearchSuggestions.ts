import { useEffect, useState } from "react";
import type { WorkspaceSummary } from "../contexts/WorkspaceContext";
import {
  fetchCatalogProperties,
  resolveCatalogQueryContext,
} from "../services/realEstateCatalog";
import {
  buildCatalogSearchFacetBuckets,
  looksLikePropertyCodeQuery,
  rankCatalogItemsBySearchRelevance,
  type CatalogSearchFacetBuckets,
} from "../utils/catalogSearchSuggest";

const MIN_CHARS = 3;
const FETCH_LIMIT = 96;

const emptyBuckets = (): CatalogSearchFacetBuckets => ({
  cities: [],
  neighborhoods: [],
  codes: [],
});

export function useCatalogSearchSuggestions(
  query: string,
  purpose: "sale" | "rent",
  currentWorkspace: WorkspaceSummary | null,
  debounceMs = 320,
): { buckets: CatalogSearchFacetBuckets; loading: boolean } {
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), debounceMs);
    return () => window.clearTimeout(t);
  }, [query, debounceMs]);

  const [buckets, setBuckets] = useState<CatalogSearchFacetBuckets>(emptyBuckets);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (debounced.length < MIN_CHARS || !currentWorkspace) {
      setBuckets(emptyBuckets());
      setLoading(false);
      return;
    }

    const ac = new AbortController();
    let cancelled = false;

    void (async () => {
      setLoading(true);
      try {
        const ctx = await resolveCatalogQueryContext(currentWorkspace);
        if (!ctx || ac.signal.aborted || cancelled) return;
        const codeQuery = looksLikePropertyCodeQuery(debounced);
        const res = await fetchCatalogProperties({
          workspaceId: ctx.workspaceId,
          companyId: ctx.companyId,
          q: debounced,
          purpose: codeQuery ? null : purpose,
          limit: FETCH_LIMIT,
          offset: 0,
          signal: ac.signal,
        });
        if (ac.signal.aborted || cancelled) return;
        const ranked = rankCatalogItemsBySearchRelevance(res.items, debounced, res.items.length);
        setBuckets(buildCatalogSearchFacetBuckets(debounced, ranked));
      } catch {
        if (!ac.signal.aborted && !cancelled) setBuckets(emptyBuckets());
      } finally {
        if (!ac.signal.aborted && !cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [debounced, purpose, currentWorkspace]);

  return { buckets, loading };
}
