/**
 * @file PropertiesSearchMap.tsx
 * @description Mapa Leaflet (OSM) com marcadores a partir de lat/lng; opcional bounds separado dos pins e relatório de viewport.
 * Centro padrão: Banguecoque (contexto Arisara / Tailândia).
 * @version 1.1.0
 * @date 2026-05-14
 */
import { useCallback, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { PropertyCardListing } from "../../types/propertyListing";
import { formatListingPrice } from "./mockListings";
import type { MapViewportBBox } from "../../utils/mapViewport";
import { listingHasGeoCoords } from "../../utils/mapViewport";

/** Banguecoque — vista inicial quando não há coordenadas no catálogo. */
const DEFAULT_MAP_CENTER: [number, number] = [13.7563, 100.5018];
const DEFAULT_ZOOM = 11;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- API legada do Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

type Props = {
  listings: PropertyCardListing[];
  fitBoundsListings?: PropertyCardListing[];
  /** Só refaz fitBounds quando mudar (ex.: novo lote da API), não a cada geocode em lote. */
  fitBoundsTriggerKey?: string | number;
  /** Quando não há pins, centra aqui em vez do padrão regional (ex.: geocode do texto de busca). */
  emptyMapCenter?: [number, number] | null;
  onViewportChange?: (bounds: MapViewportBBox) => void;
  className?: string;
};

function geoPointsFromListings(src: PropertyCardListing[]): [number, number][] {
  return src
    .filter((l) => listingHasGeoCoords(l))
    .map((l) => [l.lat as number, l.lng as number] as [number, number]);
}

function MapFitBounds({
  points,
  fitTriggerKey,
  defaultCenter,
}: {
  points: [number, number][];
  fitTriggerKey?: string | number;
  defaultCenter: [number, number];
}) {
  const map = useMap();
  const pointsRef = useRef(points);
  pointsRef.current = points;

  const pointsKey = useMemo(
    () =>
      [...points]
        .map((p) => `${p[0].toFixed(5)},${p[1].toFixed(5)}`)
        .sort()
        .join("|"),
    [points],
  );

  const usesTrigger = fitTriggerKey !== undefined && fitTriggerKey !== null;
  const triggerStr = usesTrigger ? String(fitTriggerKey) : "";

  const runFit = useCallback(() => {
    const pts = pointsRef.current;
    map.invalidateSize();
    if (pts.length === 0) {
      map.setView(defaultCenter, DEFAULT_ZOOM);
      return;
    }
    if (pts.length === 1) {
      map.setView(pts[0], 14);
      return;
    }
    map.fitBounds(L.latLngBounds(pts.map((p) => L.latLng(p[0], p[1]))), {
      padding: [48, 48],
      maxZoom: 15,
    });
  }, [map, defaultCenter]);

  const primaryDep = usesTrigger ? triggerStr : pointsKey;

  useEffect(() => {
    runFit();
    const t = window.setTimeout(runFit, 50);
    return () => window.clearTimeout(t);
  }, [map, primaryDep, runFit]);

  const lastTriggerForGeoRef = useRef<string | null>(null);
  const geoPrimedRef = useRef(false);

  useEffect(() => {
    if (!usesTrigger) return;
    if (lastTriggerForGeoRef.current !== triggerStr) {
      lastTriggerForGeoRef.current = triggerStr;
      geoPrimedRef.current = false;
    }
    const pts = pointsRef.current;
    if (pts.length === 0 || geoPrimedRef.current) return;
    geoPrimedRef.current = true;
    runFit();
    const t = window.setTimeout(runFit, 50);
    return () => window.clearTimeout(t);
  }, [map, usesTrigger, triggerStr, pointsKey, runFit]);

  return null;
}

function MapViewportReporter({ onViewportChange }: { onViewportChange: (bounds: MapViewportBBox) => void }) {
  const map = useMap();
  const emit = useCallback(() => {
    const b = map.getBounds();
    onViewportChange({
      south: b.getSouth(),
      west: b.getWest(),
      north: b.getNorth(),
      east: b.getEast(),
    });
  }, [map, onViewportChange]);

  useMapEvents({
    moveend: emit,
    zoomend: emit,
  });

  useEffect(() => {
    emit();
    const t = window.setTimeout(emit, 120);
    const t2 = window.setTimeout(emit, 700);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(t2);
    };
  }, [emit]);

  return null;
}

function MapInvalidateOnResize() {
  const map = useMap();
  useEffect(() => {
    const fix = () => map.invalidateSize();
    fix();
    window.addEventListener("resize", fix);
    const el = map.getContainer()?.parentElement;
    const ro = el ? new ResizeObserver(fix) : null;
    if (el && ro) ro.observe(el);
    return () => {
      window.removeEventListener("resize", fix);
      ro?.disconnect();
    };
  }, [map]);
  return null;
}

export default function PropertiesSearchMap({
  listings,
  fitBoundsListings,
  fitBoundsTriggerKey,
  onViewportChange,
  emptyMapCenter = null,
  className = "",
}: Props) {
  const { t } = useTranslation();

  const mapDefaultCenter = useMemo(
    () => (emptyMapCenter && emptyMapCenter.length === 2 ? emptyMapCenter : DEFAULT_MAP_CENTER),
    [emptyMapCenter],
  );

  const markerGeoList = useMemo(
    () => listings.filter((l) => listingHasGeoCoords(l)),
    [listings],
  );

  const fitPoints = useMemo(() => {
    const src = fitBoundsListings ?? listings;
    return geoPointsFromListings(src);
  }, [fitBoundsListings, listings]);

  return (
    <div className={`relative z-0 h-full min-h-0 w-full min-w-0 ${className}`.trim()}>
      <div className="absolute inset-0 min-h-0">
        <MapContainer
          center={mapDefaultCenter}
          zoom={DEFAULT_ZOOM}
          className="h-full w-full rounded-2xl sm:rounded-3xl"
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom
          zoomControl
          attributionControl
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapInvalidateOnResize />
          <MapFitBounds points={fitPoints} fitTriggerKey={fitBoundsTriggerKey} defaultCenter={mapDefaultCenter} />
          {onViewportChange ? <MapViewportReporter onViewportChange={onViewportChange} /> : null}
          {markerGeoList.map((listing) => (
            <Marker key={listing.id} position={[listing.lat!, listing.lng!]}>
              <Popup>
                <div className="min-w-[10rem] text-neutral-900">
                  <p className="text-xs font-semibold">{listing.subtitle}</p>
                  <p className="mt-1 line-clamp-2 text-xs">{listing.title}</p>
                  <p className="mt-1 text-xs font-medium">
                    {formatListingPrice(listing.price, listing.currency, t("properties.priceOnRequest"))}
                  </p>
                  <Link
                    to={`/properties/${listing.id}`}
                    className="mt-2 inline-block text-xs font-semibold text-[#db2777] underline"
                  >
                    {t("properties.search.mapOpenListing")}
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
