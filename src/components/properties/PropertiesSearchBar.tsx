/**
 * @file PropertiesSearchBar.tsx
 * @path arisara-frontend/src/components/properties
 * @description Search bar for Properties hub — suggestions in sections (cities / neighborhoods / codes), deduplicated.
 */
import { Loader2, Search } from "lucide-react";
import {
  FormEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import { useCatalogSearchSuggestions } from "../../hooks/useCatalogSearchSuggestions";
import type { CatalogFacetRow } from "../../utils/catalogSearchSuggest";

const SUGGEST_MIN_CHARS = 3;

export default function PropertiesSearchBar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const inputId = useId();
  const listboxId = `${inputId}-suggestions`;
  const containerRef = useRef<HTMLDivElement>(null);

  const [where, setWhere] = useState("");
  const [purpose, setPurpose] = useState<"sale" | "rent">("sale");
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const { buckets, loading } = useCatalogSearchSuggestions(where, purpose, currentWorkspace);

  const flatRows = useMemo(
    () => [...buckets.cities, ...buckets.neighborhoods, ...buckets.codes],
    [buckets],
  );
  const cityCount = buckets.cities.length;
  const hoodCount = buckets.neighborhoods.length;
  const totalOptions = flatRows.length;

  const showPanel =
    panelOpen &&
    where.trim().length >= SUGGEST_MIN_CHARS &&
    (loading || totalOptions > 0 || Boolean(currentWorkspace));

  useEffect(() => {
    if (!panelOpen) return;
    const onDocDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setPanelOpen(false);
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [panelOpen]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setPanelOpen(false);
    const q = new URLSearchParams();
    if (where.trim()) q.set("q", where.trim());
    q.set("purpose", purpose);
    navigate(`/properties/search?${q.toString()}`);
  };

  const applySuggestion = useCallback((row: CatalogFacetRow) => {
    setWhere(row.fillQuery);
    setPanelOpen(false);
    setActiveIndex(-1);
  }, []);

  const onInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showPanel || (!totalOptions && !loading)) {
      return;
    }
    if (e.key === "Escape") {
      setPanelOpen(false);
      setActiveIndex(-1);
      e.preventDefault();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (totalOptions ? (i + 1) % totalOptions : -1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (totalOptions ? (i <= 0 ? totalOptions - 1 : i - 1) : -1));
    }
    if (e.key === "Enter" && activeIndex >= 0 && flatRows[activeIndex]) {
      e.preventDefault();
      applySuggestion(flatRows[activeIndex]);
    }
  };

  const renderSection = (title: string, rows: CatalogFacetRow[], indexOffset: number) => {
    if (!rows.length) return null;
    return (
      <div key={title} className="pb-1">
        <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
          {title}
        </div>
        {rows.map((row, j) => {
          const idx = indexOffset + j;
          return (
            <button
              key={row.id}
              type="button"
              role="option"
              aria-selected={idx === activeIndex}
              className={`flex w-full px-3 py-2 text-left text-sm font-medium text-white transition hover:bg-white/10 ${
                idx === activeIndex ? "bg-white/10" : ""
              }`}
              onMouseEnter={() => setActiveIndex(idx)}
              onMouseDown={(ev) => ev.preventDefault()}
              onClick={() => applySuggestion(row)}
            >
              {row.label}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <form
      onSubmit={onSubmit}
      className={`flex w-full flex-col gap-3 rounded-full border border-white/10 bg-white/[0.04] p-1.5 shadow-lg shadow-black/40 backdrop-blur-md sm:flex-row sm:items-center ${
        showPanel && where.trim().length >= SUGGEST_MIN_CHARS ? "relative z-[150]" : ""
      }`}
    >
      <div
        ref={containerRef}
        className="relative flex min-h-0 flex-1 flex-col rounded-full px-4 py-2 sm:border-r sm:border-white/10"
      >
        <label htmlFor={inputId} className="text-[10px] font-semibold uppercase tracking-wide text-white/45">
          {t("properties.search.where")}
        </label>
        <input
          id={inputId}
          value={where}
          onChange={(e) => {
            setWhere(e.target.value);
            setActiveIndex(-1);
            setPanelOpen(true);
          }}
          onFocus={() => setPanelOpen(true)}
          onKeyDown={onInputKeyDown}
          autoComplete="off"
          placeholder={t("properties.search.wherePlaceholder")}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showPanel}
          aria-controls={showPanel ? listboxId : undefined}
          className="bg-transparent text-sm text-white placeholder:text-white/35 focus:outline-none"
        />
        {showPanel && where.trim().length >= SUGGEST_MIN_CHARS ? (
          <div
            id={listboxId}
            role="listbox"
            className="absolute left-0 right-0 top-full z-20 mt-2 max-h-[min(16rem,45vh)] overflow-y-auto overscroll-y-contain rounded-2xl border border-white/20 bg-neutral-950 py-1 shadow-2xl shadow-black/60 ring-1 ring-black/40 sm:rounded-3xl"
          >
            {loading ? (
              <div className="flex items-center gap-2 px-3 py-2.5 text-xs text-gray-400">
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                {t("properties.search.suggestLoading")}
              </div>
            ) : totalOptions === 0 ? (
              <p className="px-3 py-2.5 text-xs text-gray-500">{t("properties.search.suggestEmpty")}</p>
            ) : (
              <>
                {renderSection(t("properties.search.suggestSectionCities"), buckets.cities, 0)}
                {renderSection(
                  t("properties.search.suggestSectionNeighborhoods"),
                  buckets.neighborhoods,
                  cityCount,
                )}
                {renderSection(
                  t("properties.search.suggestSectionCodes"),
                  buckets.codes,
                  cityCount + hoodCount,
                )}
              </>
            )}
          </div>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col rounded-full px-4 py-2 sm:border-r sm:border-white/10">
        <label className="text-[10px] font-semibold uppercase tracking-wide text-white/45">
          {t("properties.search.purpose")}
        </label>
        <select
          value={purpose}
          onChange={(e) => setPurpose(e.target.value as "sale" | "rent")}
          className="cursor-pointer bg-transparent text-sm text-white focus:outline-none"
        >
          <option value="sale" className="bg-neutral-900">
            {t("properties.search.sale")}
          </option>
          <option value="rent" className="bg-neutral-900">
            {t("properties.search.rent")}
          </option>
        </select>
      </div>
      <div className="flex flex-1 flex-col rounded-full px-4 py-2">
        <label className="text-[10px] font-semibold uppercase tracking-wide text-white/45">
          {t("properties.search.filters")}
        </label>
        <span className="text-sm text-white/40">{t("properties.search.filtersHint")}</span>
      </div>
      <button
        type="submit"
        className="flex h-12 w-12 shrink-0 items-center justify-center self-end rounded-full bg-rose-500 text-white transition hover:bg-rose-400 sm:self-center"
        aria-label={t("properties.search.submit")}
      >
        <Search className="h-5 w-5" />
      </button>
    </form>
  );
}
